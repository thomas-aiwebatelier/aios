export async function register() {
  // Only run in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

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
}
