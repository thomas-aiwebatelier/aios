/**
 * worker-endpoint.ts — HTTP wrapper for worker step processors.
 *
 * Replaces the in-process pull-loop (worker-runner.ts) with Cloud Scheduler-
 * driven POST handlers. Each handler:
 *
 *   1. Validates `Authorization: Bearer <WORKER_AUTH_SECRET>`.
 *   2. Claims at most ONE job for its step via claimNext (FOR UPDATE SKIP LOCKED).
 *   3. Runs the existing process<X>Job(db, job) function.
 *   4. Emits a structured `worker_run` log line for Cloud Logging.
 *
 * Response shape:
 *   204 No Content { claimed: 0 }                  — queue empty
 *   200 OK        { claimed: 1, jobId, leadId,
 *                   step, durationMs }             — job processed
 *   401 Unauthorized                              — bad/missing auth
 *   500 Internal  { error, claimed: 1, jobId }    — processor threw
 *
 * Cloud Scheduler hits each endpoint every 30s (or 5 min for reply-poll).
 * If more than one job is queued, the next tick picks up the next one.
 * This keeps each invocation short (well under Cloud Run's 60-min ceiling)
 * and avoids long-running connections that would block autoscale-to-zero.
 *
 * "Scan mode" — for endpoints like reply-poll that don't use the job queue
 * (periodic scans rather than per-job claim), createScanHandler runs the
 * processor directly without calling claimNext. The processor receives the
 * db handle and returns an arbitrary summary, which is forwarded in the
 * response body. We chose two separate factories over a single mode flag
 * because the response semantics differ (no jobId / claimed=0|1 split),
 * and a flag would have made every call site reason about both branches.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Db } from "@atelier/db";
import { getDb } from "./db.js";
import { claimNext, failJob } from "./queue.js";
import { logger } from "./logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkerJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

export type WorkerProcessor = (db: Db, job: WorkerJob) => Promise<unknown>;
export type ScanProcessor = (db: Db) => Promise<Record<string, unknown>>;

// ── Auth ──────────────────────────────────────────────────────────────────────

function checkAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.WORKER_AUTH_SECRET;
  if (!secret) {
    logger.error("worker-endpoint: WORKER_AUTH_SECRET not configured");
    return NextResponse.json(
      { error: "WORKER_AUTH_SECRET not configured" },
      { status: 500 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

// ── Per-job handler factory ───────────────────────────────────────────────────

/**
 * Build a POST handler that claims one job for `step` and runs `processor`.
 *
 * The processor is responsible for calling completeJob() / failJob() on the
 * claimed job (existing process<X>Job functions already do this). The handler
 * acts as a safety net: if the processor throws, the handler calls failJob
 * before returning 500 — but in practice the existing processors catch
 * already via their try/finally heartbeat blocks.
 */
export function createWorkerHandler(step: string, processor: WorkerProcessor) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    const authError = checkAuth(req);
    if (authError) return authError;

    const startedAt = Date.now();
    const workerId = `${step}-http-${process.env.HOSTNAME ?? "local"}`;
    const db = getDb();

    logger.info("worker_request", { event: "worker_request", step, workerId });

    let job: WorkerJob | null = null;
    try {
      job = (await claimNext(db, workerId, step)) as WorkerJob | null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("worker_claim_failed", { event: "worker_claim_failed", step, workerId, err: msg });
      return NextResponse.json(
        { error: `claimNext failed: ${msg}`, claimed: 0 },
        { status: 500 },
      );
    }

    if (!job) {
      const durationMs = Date.now() - startedAt;
      logger.info("worker_run", { event: "worker_run", step, workerId, claimed: 0, durationMs });
      return NextResponse.json({ claimed: 0 }, { status: 204 });
    }

    try {
      await processor(db, job);
      const durationMs = Date.now() - startedAt;
      logger.info("worker_run", {
        event: "worker_run",
        step,
        workerId,
        claimed: 1,
        jobId: job.id,
        leadId: job.leadId,
        durationMs,
      });
      return NextResponse.json(
        {
          claimed: 1,
          jobId: job.id,
          leadId: job.leadId,
          step,
          durationMs,
        },
        { status: 200 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startedAt;
      logger.error("worker_run_failed", {
        event: "worker_run_failed",
        step,
        workerId,
        jobId: job.id,
        durationMs,
        err: msg,
      });
      // Defensive: processors usually mark failed themselves, but in case the
      // throw came from outside their try-block, ensure the row doesn't stay
      // stuck in 'running'.
      try {
        await failJob(db, job.id, msg);
      } catch {
        /* best effort */
      }
      return NextResponse.json(
        { error: msg, claimed: 1, jobId: job.id },
        { status: 500 },
      );
    }
  };
}

// ── Scan-mode handler factory (reply-poll) ────────────────────────────────────

/**
 * Build a POST handler that runs a scan processor with no job claim.
 *
 * Used for periodic scans (e.g. reply-poll iterates outreach_messages
 * directly rather than pulling from pipeline_jobs). The processor's return
 * value is included in the response body as `summary`.
 */
export function createScanHandler(step: string, processor: ScanProcessor) {
  return async function POST(req: NextRequest): Promise<NextResponse> {
    const authError = checkAuth(req);
    if (authError) return authError;

    const startedAt = Date.now();
    const workerId = `${step}-http-${process.env.HOSTNAME ?? "local"}`;
    const db = getDb();

    logger.info("worker_request", { event: "worker_request", step, workerId });

    try {
      const summary = await processor(db);
      const durationMs = Date.now() - startedAt;
      logger.info("worker_run", {
        event: "worker_run",
        step,
        workerId,
        claimed: 0,
        durationMs,
        summary,
      });
      return NextResponse.json({ ok: true, step, durationMs, summary }, { status: 200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startedAt;
      logger.error("worker_run_failed", { event: "worker_run_failed", step, workerId, durationMs, err: msg });
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}
