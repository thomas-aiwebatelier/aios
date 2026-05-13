import { eq, and, lt, lte, or, isNull } from "drizzle-orm";
import { pipelineJobs } from "@atelier/db";
import { nanoid } from "nanoid";
import type { Db } from "@atelier/db";

export interface EnqueueArgs {
  leadId?: string | null;
  step: string;
  payload: Record<string, unknown>;
  /** If provided, the job will not be claimed until this time has passed.
   *  Used by the 30s undo window in Task 4.6: insert with createdAt=now+30s,
   *  the worker's claimNext filters WHERE created_at <= now(). */
  notBefore?: Date;
}

export async function enqueue(db: Db, args: EnqueueArgs): Promise<string> {
  const id = nanoid();
  await db.insert(pipelineJobs).values({
    id,
    leadId: args.leadId ?? null,
    pipelineStep: args.step,
    status: "queued",
    payload: args.payload,
    attemptCount: 0,
    // createdAt acts as "not-before" for delayed jobs (Task 4.6 undo window).
    // Normal jobs pass undefined → schema default = now().
    ...(args.notBefore ? { createdAt: args.notBefore } : {}),
  });
  return id;
}

/**
 * Enqueue a job that should not be claimed until `delayMs` milliseconds from now.
 *
 * Used by the 30s undo window in Task 4.6:
 *   enqueueDelayed(db, { step: 'outreach', payload: { outreachMessageId } }, 30_000)
 *
 * claimNext filters `WHERE created_at <= now()`, so the job is invisible
 * to workers until the delay expires. Cancelling within the window is done
 * by flipping the job status to 'cancelled' before claimNext picks it up.
 */
export async function enqueueDelayed(
  db: Db,
  args: Omit<EnqueueArgs, "notBefore">,
  delayMs: number,
): Promise<string> {
  // Computed in JS rather than SQL (`now() + interval '...'`) because the
  // createdAt timestamp value is passed as a parameter via postgres-js — the
  // server sees an absolute timestamptz, equivalent to `now() + interval`.
  return enqueue(db, { ...args, notBefore: new Date(Date.now() + delayMs) });
}

export async function claimNext(db: Db, _workerName: string, step?: string) {
  // Hardened against concurrent multi-worker contention.
  //
  // The SELECT phase issues `FOR UPDATE SKIP LOCKED`, taking a row-level lock
  // on the candidate job and instructing Postgres to skip any rows already
  // locked by another in-flight `claimNext` transaction. This guarantees:
  //   - Two workers polling the same step never claim the same job
  //   - A slow worker doesn't block faster ones (skip rather than wait)
  //   - The flip to status='running' inside the same transaction is atomic
  //     with the lock acquisition.
  //
  // SQLite's previous single-writer model masked this requirement; on
  // Postgres with N>1 workers per step (or any worker + cron tick), an
  // unlocked SELECT could hand the same row to two transactions. SKIP LOCKED
  // is the canonical Postgres queue pattern.
  return db.transaction(async (tx) => {
    const now = new Date();

    const whereClause = step
      ? and(
          eq(pipelineJobs.status, "queued"),
          eq(pipelineJobs.pipelineStep, step),
          lte(pipelineJobs.createdAt, now),
        )
      : and(
          eq(pipelineJobs.status, "queued"),
          lte(pipelineJobs.createdAt, now),
        );

    const candidates = await tx
      .select()
      .from(pipelineJobs)
      .where(whereClause)
      .orderBy(pipelineJobs.createdAt)
      .limit(1)
      .for("update", { skipLocked: true });

    const job = candidates[0];
    if (!job) return null;

    await tx
      .update(pipelineJobs)
      .set({
        status: "running",
        startedAt: now,
        lastHeartbeatAt: now,
        attemptCount: (job.attemptCount ?? 0) + 1,
      })
      .where(eq(pipelineJobs.id, job.id));

    return { ...job, status: "running" as const };
  });
}

export async function heartbeat(db: Db, jobId: string) {
  await db
    .update(pipelineJobs)
    .set({ lastHeartbeatAt: new Date() })
    .where(eq(pipelineJobs.id, jobId));
}

export async function completeJob(db: Db, jobId: string) {
  await db
    .update(pipelineJobs)
    .set({ status: "succeeded", finishedAt: new Date() })
    .where(eq(pipelineJobs.id, jobId));
}

export async function failJob(db: Db, jobId: string, error: string) {
  await db
    .update(pipelineJobs)
    .set({ status: "failed", finishedAt: new Date(), errorMessage: error })
    .where(eq(pipelineJobs.id, jobId));
}

const STALE_HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutes per spec §7

export async function reconcileStuckJobs(db: Db): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_HEARTBEAT_MS);

  // Postgres-js returns rowCount on UPDATE; pglite returns the same shape.
  const result = (await db
    .update(pipelineJobs)
    .set({
      status: "failed",
      finishedAt: new Date(),
      errorMessage: "reconciler: stale heartbeat",
    })
    .where(
      and(
        eq(pipelineJobs.status, "running"),
        or(
          isNull(pipelineJobs.lastHeartbeatAt),
          lt(pipelineJobs.lastHeartbeatAt, staleThreshold),
        ),
      ),
    )
    .returning());

  return result.length;
}
