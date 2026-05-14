/**
 * poll-loop.ts — 5s claim → process loop for {generate, deploy}.
 *
 * Why poll instead of LISTEN/NOTIFY: keeps the dep surface tiny and works
 * with pglite in tests with zero changes. 5s of latency between enqueue
 * and pickup is invisible compared to a 10-30 min generation job.
 *
 * The processor map is injected so tests can stub it; in production
 * index.ts wires { generate: processGenerationJob, deploy: processDeployJob }.
 *
 * Failure handling:
 * - The processors call completeJob() / failJob() themselves for clean
 *   success paths and final-attempt failures (see generation.ts §6).
 * - If the processor throws OUT (e.g. a final retry threw), the loop calls
 *   failJob() as a safety net so the row doesn't stay stuck in 'running'.
 *
 * Shutdown: stopPollLoop() flips a flag; the next iteration after the
 * in-flight job finishes exits the loop. We don't kill mid-job because
 * generation subprocesses are not idempotent on resume.
 */

import { eq } from "drizzle-orm";
import { pipelineJobs, type Db } from "@atelier/db";
import { claimNext, completeJob, failJob } from "./lib/queue.js";
import { logger } from "./logger.js";
import { recordJobClaimed } from "./heartbeat.js";

export type Processor = (
  db: Db,
  job: { id: string; payload: unknown; leadId: string | null },
) => Promise<void>;

export interface PollLoopOptions {
  steps: string[];
  workerName: string;
  intervalMs?: number;
  processors: Record<string, Processor>;
}

let _stop = false;
let _running = false;
let _idleTimer: NodeJS.Timeout | null = null;

export function stopPollLoop(): void {
  _stop = true;
  if (_idleTimer) {
    clearTimeout(_idleTimer);
    _idleTimer = null;
  }
}

/**
 * Run one claim+process tick. Returns true if a job was processed
 * (and the loop should immediately tick again to drain the queue),
 * false if the queue was empty (the loop sleeps for intervalMs).
 *
 * Exported for unit tests.
 */
export async function pollOnce(
  db: Db,
  opts: PollLoopOptions,
): Promise<boolean> {
  let job: Awaited<ReturnType<typeof claimNext>> = null;
  try {
    job = await claimNext(db, opts.steps, opts.workerName);
  } catch (err) {
    logger.error("poll_claim_failed", { error: String(err) });
    return false;
  }

  if (!job) {
    logger.debug("poll_idle", { steps: opts.steps });
    return false;
  }

  recordJobClaimed();
  logger.info("poll_claimed", {
    jobId: job.id,
    step: job.pipelineStep,
    leadId: job.leadId,
  });

  const processor = opts.processors[job.pipelineStep];
  if (!processor) {
    const msg = `no processor registered for step '${job.pipelineStep}'`;
    logger.error("poll_no_processor", { step: job.pipelineStep, jobId: job.id });
    await failJob(db, job.id, msg).catch(() => {
      /* swallow — failJob errors aren't actionable here */
    });
    return true;
  }

  try {
    await processor(db, {
      id: job.id,
      payload: job.payload,
      leadId: job.leadId,
    });
    // Safety net: ensure the row is marked succeeded. Some processors
    // (e.g. generation.ts) historically returned without calling
    // completeJob themselves; the deploy processor does it. We check the
    // current status to avoid clobbering a 'failed' marker the processor
    // may have already written via a different code path.
    const current = ((await db
      .select({ status: pipelineJobs.status })
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, job.id))
      ))[0];
    if (current?.status === "running") {
      await completeJob(db, job.id);
    }
    logger.info("poll_processed", { jobId: job.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("poll_processor_threw", { jobId: job.id, error: msg });
    // Safety net: processors usually mark failed themselves, but in case
    // the throw escaped their handler.
    await failJob(db, job.id, msg).catch(() => {
      /* swallow */
    });
  }

  return true;
}

/**
 * Long-running poll loop. Resolves only after stopPollLoop() is called
 * AND the in-flight job (if any) finishes. The caller awaits this from
 * index.ts so the process stays alive.
 */
export async function startPollLoop(
  db: Db,
  opts: PollLoopOptions,
): Promise<void> {
  if (_running) {
    throw new Error("startPollLoop already running");
  }
  _running = true;
  _stop = false;

  const intervalMs = opts.intervalMs ?? 5_000;
  logger.info("poll_loop_started", { steps: opts.steps, intervalMs });

  try {
    while (!_stop) {
      const claimed = await pollOnce(db, opts);
      if (_stop) break;
      if (!claimed) {
        // Idle — sleep for intervalMs. Wrap in a promise so stopPollLoop
        // can short-circuit by clearing the timer.
        await new Promise<void>((resolve) => {
          _idleTimer = setTimeout(() => {
            _idleTimer = null;
            resolve();
          }, intervalMs);
        });
      }
      // If we processed a job, loop immediately — there may be more queued.
    }
  } finally {
    _running = false;
    logger.info("poll_loop_exited", {});
  }
}
