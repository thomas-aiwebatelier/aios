/**
 * heartbeat.ts — Liveness writer for the worker_heartbeats table.
 *
 * Every HEARTBEAT_INTERVAL_MS the daemon upserts its row with the current
 * timestamp + host metadata + 24h claim count. The admin UI surfaces
 * last_seen_at so the operator knows whether the laptop is currently
 * polling.
 *
 * Implementation note: pglite + postgres-js both support ON CONFLICT via
 * Drizzle's onConflictDoUpdate(). We don't track a row revision — the
 * PK (worker_name) is enough since only one daemon writes its own row.
 */

import os from "node:os";
import { workerHeartbeats, type Db, type WorkerHostInfo } from "@atelier/db";
import { logger } from "./logger.js";

const HEARTBEAT_INTERVAL_MS = 30_000;

let _claimed24hCount = 0;
let _intervalId: NodeJS.Timeout | null = null;

/** Called by poll-loop each time a job is successfully claimed. */
export function recordJobClaimed(): void {
  _claimed24hCount += 1;
  // Naive: never decays. Good enough for a first pass — the admin UI
  // can compute a true 24h window from pipeline_jobs.startedAt later.
}

export function getHostInfo(extra: Partial<WorkerHostInfo> = {}): WorkerHostInfo {
  return {
    nodeVersion: process.version,
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    ...extra,
  };
}

/**
 * Upsert the heartbeat row once. Caller-managed — used both by the
 * interval ticker and by the shutdown path to emit a final marker.
 */
export async function writeHeartbeat(
  db: Db,
  workerName: string,
  hostInfo: WorkerHostInfo,
): Promise<void> {
  try {
    await db
      .insert(workerHeartbeats)
      .values({
        workerName,
        lastSeenAt: new Date(),
        hostInfo,
        claimedJobs24h: _claimed24hCount,
      })
      .onConflictDoUpdate({
        target: workerHeartbeats.workerName,
        set: {
          lastSeenAt: new Date(),
          hostInfo,
          claimedJobs24h: _claimed24hCount,
        },
      });
    logger.debug("heartbeat_written", {
      worker: workerName,
      claimed24h: _claimed24hCount,
    });
  } catch (err) {
    // Heartbeat failures are non-fatal — DB might be in a transient outage.
    logger.warn("heartbeat_failed", { error: String(err) });
  }
}

/** Start the heartbeat ticker. Returns an unref'd timeout so SIGINT works. */
export function startHeartbeat(
  db: Db,
  workerName: string,
  hostInfo: WorkerHostInfo,
): NodeJS.Timeout {
  // Write immediately on start so the operator sees the row without waiting 30s.
  void writeHeartbeat(db, workerName, hostInfo);

  _intervalId = setInterval(
    () => void writeHeartbeat(db, workerName, hostInfo),
    HEARTBEAT_INTERVAL_MS,
  );
  // Don't keep the event loop alive just for heartbeats — the poll-loop's
  // own timer drives liveness. Saves the daemon from hanging on shutdown.
  _intervalId.unref();
  return _intervalId;
}

export function stopHeartbeat(): void {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}
