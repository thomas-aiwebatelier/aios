let _registered = false;

export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (_registered) return;
  _registered = true;

  const { createDb, runMigrations } = await import("@atelier/db");
  const { reconcileStuckJobs } = await import("./lib/queue");
  const { registerCronJobs } = await import("./lib/cron");
  const { logger } = await import("./lib/logger");

  const dbPath = process.env.DATABASE_PATH ?? "./data/atelier.db";
  const db = createDb(dbPath);

  // Migrations folder: relative to cwd (apps/admin at Next.js runtime)
  // DATABASE_MIGRATIONS_PATH can override for non-standard setups
  const migrationsFolder =
    process.env.DATABASE_MIGRATIONS_PATH ?? "../../packages/db/migrations";

  // Run migrations on boot (idempotent)
  try {
    runMigrations(db, migrationsFolder);
    logger.info("admin instrumentation: migrations applied");
  } catch (err) {
    logger.error("admin instrumentation: migration failed", { err });
    throw err;
  }

  // Reconcile stuck jobs on boot
  const reconciled = reconcileStuckJobs(db);
  if (reconciled > 0) {
    logger.warn(`admin instrumentation: reconciled ${reconciled} stuck jobs on boot`);
  }

  // Register cron schedules
  registerCronJobs();

  // Hourly reconcile safety net
  setInterval(() => {
    const n = reconcileStuckJobs(db);
    if (n > 0) logger.warn(`hourly reconciler: ${n} stuck jobs`);
  }, 60 * 60 * 1000);

  logger.info("admin instrumentation: queue + cron + reconciler ready");

  // ── Worker pull-loops ──────────────────────────────────────────────────────
  // The /* webpackIgnore: true */ magic comments tell Next.js's webpack NOT to
  // analyze or bundle these imports. The worker files transitively import
  // playwright / node-vibrant / google-auth-library / Node `node:*` builtins
  // which webpack can't bundle. At runtime the Node ESM loader (with tsx)
  // resolves them normally. Without these comments, `next build` fails on
  // `Cannot find module 'node:url'` from research-branding.
  const { startWorker, stopAllWorkers } = await import(
    /* webpackIgnore: true */ "./lib/worker-runner.js"
  );
  const { processDiscoveryJob } = await import(
    /* webpackIgnore: true */ "./workers/discovery.js"
  );
  const { processResearchJob } = await import(
    /* webpackIgnore: true */ "./workers/research.js"
  );

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

  // Graceful shutdown — Next.js dev calls SIGINT on Ctrl+C
  process.once("SIGINT", () => {
    logger.info("instrumentation: SIGINT — stopping workers");
    void stopAllWorkers().then(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    logger.info("instrumentation: SIGTERM — stopping workers");
    void stopAllWorkers().then(() => process.exit(0));
  });
}
