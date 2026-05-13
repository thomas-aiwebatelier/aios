let _registered = false;

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (_registered) return;
  _registered = true;

  const { runMigrations } = await import("@atelier/db");
  const { reconcileStuckJobs } = await import("./lib/queue");
  const { registerCronJobs } = await import("./lib/cron");
  const { logger } = await import("./lib/logger");
  const { getDb, closeDb } = await import("./lib/db");

  // Singleton handle, same one API routes/workers use.
  const db = getDb();

  // Run migrations on boot (idempotent). Drizzle picks the bundled
  // packages/db/drizzle/ folder by default; override only for non-standard layouts.
  try {
    if (process.env.DATABASE_MIGRATIONS_PATH) {
      // @ts-expect-error db typed as union; postgres-js migrator handles it
      await runMigrations(db, process.env.DATABASE_MIGRATIONS_PATH);
    } else {
      // @ts-expect-error db typed as union; postgres-js migrator handles it
      await runMigrations(db);
    }
    logger.info("admin instrumentation: migrations applied");
  } catch (err) {
    logger.error("admin instrumentation: migration failed", { err });
    throw err;
  }

  // Reconcile stuck jobs on boot
  const reconciled = await reconcileStuckJobs(db);
  if (reconciled > 0) {
    logger.warn(`admin instrumentation: reconciled ${reconciled} stuck jobs on boot`);
  }

  // Register cron schedules
  registerCronJobs();

  // Hourly reconcile safety net
  setInterval(() => {
    void reconcileStuckJobs(db).then((n) => {
      if (n > 0) logger.warn(`hourly reconciler: ${n} stuck jobs`);
    });
  }, 60 * 60 * 1000);

  logger.info("admin instrumentation: queue + cron + reconciler ready");

  // ── Worker pull-loops ──────────────────────────────────────────────────────
  const { startWorker, stopAllWorkers } = await import("./lib/worker-runner.js");
  const { processDiscoveryJob } = await import("./workers/discovery.js");
  const { processResearchJob } = await import("./workers/research.js");
  const { processGenerationJob } = await import("./workers/generation.js");
  const { processDeployJob } = await import("./workers/deployer.js");
  const { processOutreachJob } = await import("./workers/outreach.js");

  startWorker({
    step: "discovery",
    workerName: "discovery-worker",
    process: processDiscoveryJob,
  });

  startWorker({
    step: "research",
    workerName: "research-worker",
    process: processResearchJob,
  });

  startWorker({
    step: "generation",
    workerName: "generation-worker",
    process: processGenerationJob,
  });

  startWorker({
    step: "deploy",
    workerName: "deploy-worker",
    process: processDeployJob,
  });

  startWorker({
    step: "outreach",
    workerName: "outreach-worker",
    process: processOutreachJob,
  });

  // Graceful shutdown — Next.js dev calls SIGINT on Ctrl+C
  const shutdown = async (signal: string) => {
    logger.info(`instrumentation: ${signal} — stopping workers`);
    try {
      await stopAllWorkers();
    } catch (err) {
      logger.error("instrumentation: stopAllWorkers failed", { err: String(err) });
    }
    try {
      await closeDb();
    } catch (err) {
      logger.error("instrumentation: closeDb failed", { err: String(err) });
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}
