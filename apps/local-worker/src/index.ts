/**
 * index.ts — local-worker entrypoint.
 *
 * Boot sequence:
 *   1. Load `.env` from repo root (walk up from this file).
 *   2. Resolve CLI tool paths (claude, wrangler) for diagnostics.
 *   3. Open the DB pool.
 *   4. Start the heartbeat ticker (first write happens immediately).
 *   5. Start the poll loop (5s claim cycle for generate + deploy).
 *   6. Wait for SIGINT/SIGTERM/SIGHUP, then drain.
 *
 * Drain order:
 *   - stopPollLoop() flips a flag; the in-flight job finishes naturally.
 *   - stopHeartbeat() clears the 30s ticker.
 *   - Final writeHeartbeat() records the shutdown timestamp.
 *   - closeDb() drains the postgres-js pool with a 5s timeout.
 *
 * Run via `pnpm --filter local-worker start` or the Windows Task Scheduler
 * import documented in apps/local-worker/README.md.
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";

import { logger } from "./logger.js";
import { getDb, closeDb } from "./lib/db.js";
import {
  startHeartbeat,
  stopHeartbeat,
  writeHeartbeat,
  getHostInfo,
} from "./heartbeat.js";
import { startPollLoop, stopPollLoop } from "./poll-loop.js";
import { processGenerationJob } from "./generation.js";
import { processDeployJob } from "./deploy.js";
import { processResearchJob } from "./research.js";
import { closeBrowserPool } from "./lib/playwright-pool.js";

// ── Locate repo root + load .env ──────────────────────────────────────────────

function findRepoRoot(): string {
  // From `apps/local-worker/src/index.ts`, walk up until we find pnpm-workspace.yaml.
  const here = path.dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  // Fallback: assume cwd
  return process.cwd();
}

const repoRoot = findRepoRoot();
const envPath = path.join(repoRoot, ".env");

// Set REPO_ROOT so generation.ts/generated-sites-fs.ts can resolve relative paths
// without depending on cwd (the Task Scheduler invocation sets a known cwd, but
// dev invocations from anywhere in the workspace should also work).
process.env.REPO_ROOT = repoRoot;

loadDotenv({ path: envPath, quiet: true });

logger.info("env_loaded", { path: envPath });

// ── Tool path resolution (diagnostic only — non-fatal if missing) ─────────────

function resolveCli(cmd: string): string | undefined {
  try {
    const which = process.platform === "win32" ? "where" : "which";
    const out = execSync(`${which} ${cmd}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.split(/\r?\n/)[0]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

const claudePath = resolveCli("claude");
const wranglerPath = resolveCli("wrangler");

// ── Boot log ──────────────────────────────────────────────────────────────────

const WORKER_NAME = process.env.WORKER_NAME ?? "local-worker";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 5_000);
// Order is priority order for claimNext: research is upstream of generate,
// which is upstream of deploy. claimNext tries each step in turn, first match wins.
const STEPS = ["research", "generate", "deploy"];

logger.info("boot", {
  worker: WORKER_NAME,
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  pid: process.pid,
  repoRoot,
  claude: claudePath ?? "(not on PATH)",
  wrangler: wranglerPath ?? "(not on PATH)",
  generatedSitesDir:
    process.env.GENERATED_SITES_DIR ?? `${repoRoot}\\generated-sites (default)`,
  intervalMs: POLL_INTERVAL_MS,
});

if (!claudePath) {
  logger.warn("claude_cli_missing", {
    hint: "generation jobs will fail until `claude` is on PATH and authenticated",
  });
}
if (!wranglerPath) {
  logger.warn("wrangler_cli_missing", {
    hint: "deploy jobs will fail until `npm i -g wrangler` + `wrangler login`",
  });
}

// ── DB + heartbeat + poll loop ────────────────────────────────────────────────

const db = getDb();
logger.info("db_connected", {});

const hostInfo = getHostInfo({
  appVersion: "0.1.0",
  claudePath,
  wranglerPath,
});

startHeartbeat(db, WORKER_NAME, hostInfo);
logger.info("heartbeat_started", { worker: WORKER_NAME });

// ── Graceful shutdown ─────────────────────────────────────────────────────────

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown_start", { signal });

  // 1. Tell the poll loop to stop after the in-flight job (if any) finishes.
  stopPollLoop();

  // 2. Stop the heartbeat ticker so nothing new fires.
  stopHeartbeat();

  // 3. Write a final heartbeat with the current timestamp — operator UI
  //    distinguishes "actively polling" (<1 min ago) from "stopped" by
  //    last_seen_at age.
  try {
    await writeHeartbeat(db, WORKER_NAME, hostInfo);
  } catch (err) {
    logger.warn("shutdown_final_heartbeat_failed", { error: String(err) });
  }

  // 4. Close the shared Playwright browser (research keeps it open across
  //    jobs). No-op if research never ran / no browser was launched.
  try {
    await closeBrowserPool();
  } catch (err) {
    logger.warn("shutdown_close_browser_failed", { error: String(err) });
  }

  // 5. Drain the pool. 5s timeout matches closeProdDb's default.
  try {
    await closeDb();
  } catch (err) {
    logger.warn("shutdown_close_db_failed", { error: String(err) });
  }

  logger.info("shutdown_done", { signal });
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
// SIGHUP is sent by Task Scheduler when the user logs off — treat it
// like SIGTERM so we drain cleanly.
process.on("SIGHUP", () => void shutdown("SIGHUP"));

// ── Run forever ───────────────────────────────────────────────────────────────

startPollLoop(db, {
  steps: STEPS,
  workerName: WORKER_NAME,
  intervalMs: POLL_INTERVAL_MS,
  processors: {
    research: processResearchJob,
    generate: processGenerationJob,
    deploy: processDeployJob,
  },
}).catch((err) => {
  logger.error("poll_loop_crashed", { error: String(err) });
  void shutdown("crash");
});
