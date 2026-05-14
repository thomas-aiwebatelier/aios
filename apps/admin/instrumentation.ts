/**
 * instrumentation.ts — Next.js boot hook.
 *
 * Runs once per process at startup, after the runtime is up but before the
 * first request is served.
 *
 * Migration Plan B (commit "refactor(admin): remove in-process worker pull-loops"):
 *   The four cloud-side workers (discovery, research, outreach, reply-poll) no
 *   longer run as in-process pull-loops. They are HTTP endpoints under
 *   /api/workers/<step> driven by Cloud Scheduler — see apps/admin/CLOUD-SCHEDULER.md
 *   for the schedule + provisioning commands.
 *
 *   The generation and deploy workers are NOT started here either. They run in
 *   apps/local-worker (Plan C) on the operator's machine because they need
 *   Playwright (Chrome) and the Claude SDK shell, which are too heavy / too
 *   stateful for Cloud Run.
 *
 *   What remains in this file:
 *     - runMigrations() at boot (Drizzle, idempotent)
 *     - reconcileStuckJobs() at boot + hourly safety net
 *     - registerCronJobs() for the few schedules that still live in-process
 *     - Graceful shutdown (SIGINT/SIGTERM → closeDb + closeBrowserPool)
 */

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
  const { closeBrowserPool } = await import("./lib/playwright-pool");

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

  // Register cron schedules (most cloud schedules moved to Cloud Scheduler;
  // see lib/cron.ts for what remains and why)
  registerCronJobs();

  // Hourly reconcile safety net
  setInterval(() => {
    void reconcileStuckJobs(db).then((n) => {
      if (n > 0) logger.warn(`hourly reconciler: ${n} stuck jobs`);
    });
  }, 60 * 60 * 1000);

  logger.info("admin instrumentation: ready (workers run via /api/workers/* + local-worker)");

  // Graceful shutdown — Next.js dev calls SIGINT on Ctrl+C
  const shutdown = async (signal: string) => {
    logger.info(`instrumentation: ${signal} — shutting down`);
    try {
      await closeBrowserPool();
    } catch (err) {
      logger.error("instrumentation: closeBrowserPool failed", { err: String(err) });
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
