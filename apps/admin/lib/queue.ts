import { eq, and, lt, or, isNull } from "drizzle-orm";
import { pipelineJobs } from "@atelier/db";
import { nanoid } from "nanoid";
import type { Db } from "@atelier/db";

export interface EnqueueArgs {
  leadId?: string | null;
  step: string;
  payload: Record<string, unknown>;
}

export function enqueue(db: Db, args: EnqueueArgs): string {
  const id = nanoid();
  db.insert(pipelineJobs)
    .values({
      id,
      leadId: args.leadId ?? null,
      pipelineStep: args.step,
      status: "queued",
      payload: args.payload,
      attemptCount: 0,
    })
    .run();
  return id;
}

export function claimNext(db: Db, _workerName: string, step?: string) {
  return db.transaction((tx) => {
    const whereClause = step
      ? and(eq(pipelineJobs.status, "queued"), eq(pipelineJobs.pipelineStep, step))
      : eq(pipelineJobs.status, "queued");

    const job = tx
      .select()
      .from(pipelineJobs)
      .where(whereClause)
      .orderBy(pipelineJobs.createdAt)
      .limit(1)
      .get();

    if (!job) return null;

    const now = new Date();
    tx.update(pipelineJobs)
      .set({
        status: "running",
        startedAt: now,
        lastHeartbeatAt: now,
        attemptCount: (job.attemptCount ?? 0) + 1,
      })
      .where(eq(pipelineJobs.id, job.id))
      .run();

    return { ...job, status: "running" as const };
  });
}

export function heartbeat(db: Db, jobId: string) {
  db.update(pipelineJobs)
    .set({ lastHeartbeatAt: new Date() })
    .where(eq(pipelineJobs.id, jobId))
    .run();
}

export function completeJob(db: Db, jobId: string) {
  db.update(pipelineJobs)
    .set({ status: "succeeded", finishedAt: new Date() })
    .where(eq(pipelineJobs.id, jobId))
    .run();
}

export function failJob(db: Db, jobId: string, error: string) {
  db.update(pipelineJobs)
    .set({ status: "failed", finishedAt: new Date(), errorMessage: error })
    .where(eq(pipelineJobs.id, jobId))
    .run();
}

const STALE_HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutes per spec §7

export function reconcileStuckJobs(db: Db): number {
  const staleThreshold = new Date(Date.now() - STALE_HEARTBEAT_MS);

  const result = db
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
          lt(pipelineJobs.lastHeartbeatAt, staleThreshold)
        )
      )
    )
    .run();

  return result.changes;
}
