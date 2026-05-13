/**
 * worker-runner.ts — generic pull-loop helper (Week 3 → Week 4 bridge).
 *
 * Drives one or more worker types against the pipeline_jobs queue.
 * Each worker polls every POLL_INTERVAL_MS, claims the next job for its
 * pipeline_step, delegates to the processor function, and handles
 * completeJob / failJob uniformly.
 *
 * Usage:
 *   startWorker({ step: "discovery", workerName: "discovery-worker", process: processDiscoveryJob });
 *   startWorker({ step: "research",  workerName: "research-worker",  process: processResearchJob  });
 *   // On shutdown:
 *   await stopAllWorkers();
 */

import type { Db } from "@atelier/db";
import { getDb } from "./db.js";
import { claimNext, failJob } from "./queue.js";
import { logger } from "./logger.js";
import { closeBrowserPool } from "./playwright-pool.js";

const POLL_INTERVAL_MS = 3000; // 3 s — responsive to user-triggered jobs

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkerJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

export interface WorkerSpec {
  /** Value of pipeline_jobs.pipeline_step that this worker claims */
  step: string;
  /** Display name for log lines ("discovery-worker") */
  workerName: string;
  /** Per-job processor. Throws on failure; runner converts thrown error to failJob.
   *  Return value is ignored by the runner — processors may return `void` (research)
   *  or any other value (discovery returns insert count) without changing semantics. */
  process: (db: Db, job: WorkerJob) => Promise<unknown>;
}

// ── State ─────────────────────────────────────────────────────────────────────

const _running = new Map<string, boolean>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Start a worker pull-loop for the given spec. Idempotent — calling twice
 * for the same step is a no-op.
 */
export function startWorker(spec: WorkerSpec): void {
  if (_running.get(spec.step)) {
    logger.info(`[worker-runner] ${spec.workerName} already running, skipping`);
    return;
  }
  _running.set(spec.step, true);
  logger.info(
    `[worker-runner] starting ${spec.workerName} (polling every ${POLL_INTERVAL_MS}ms)`,
  );
  void runLoop(spec).catch((err) => {
    logger.error(`[worker-runner] ${spec.workerName} loop crashed`, {
      err: String(err),
    });
    _running.set(spec.step, false);
  });
}

/**
 * Stop the pull-loop for a single step. The in-flight job (if any) finishes
 * before the loop exits.
 */
export function stopWorker(step: string): void {
  _running.set(step, false);
}

/**
 * Stop all running pull-loops, wait a brief grace window for in-flight jobs,
 * then close shared browser resources.
 */
export async function stopAllWorkers(): Promise<void> {
  for (const step of _running.keys()) {
    _running.set(step, false);
  }
  // Give in-flight jobs a brief grace window to finish their current iteration
  await new Promise<void>((r) => setTimeout(r, 100));
  await closeBrowserPool();
}

// ── Pull-loop ─────────────────────────────────────────────────────────────────

async function runLoop(spec: WorkerSpec): Promise<void> {
  const db = getDb();
  logger.info(`[worker-runner] ${spec.workerName} loop started`);

  while (_running.get(spec.step)) {
    let job: WorkerJob | null = null;

    // Claim phase
    try {
      job = await claimNext(db, spec.workerName, spec.step);
    } catch (err) {
      logger.error(`[worker-runner] ${spec.workerName} claimNext failed`, {
        err: String(err),
      });
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    // No work available — back off and poll again
    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    // Process phase — throw → failJob
    try {
      await spec.process(db, job);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(
        `[worker-runner] ${spec.workerName} job ${job.id} failed`,
        { err: msg },
      );
      try {
        await failJob(db, job.id, msg);
      } catch (failErr) {
        logger.error(`[worker-runner] failJob itself failed`, {
          err: String(failErr),
        });
      }
    }
    // No sleep after processing — immediately look for the next job
  }

  logger.info(`[worker-runner] ${spec.workerName} loop stopped`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
