import { getProdDb, closeProdDb, type Db } from "@atelier/db";

let _db: Db | undefined;

/**
 * Resolve a Drizzle handle backed by the configured Postgres instance.
 *
 * Connection string lives in DATABASE_URL — postgres-js handles pooling.
 * One handle per process, singleton shared between server components, API
 * routes, workers, and cron jobs (same pattern as the prior SQLite handle).
 */
export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Local dev: " +
          "postgresql://postgres:postgres@localhost:5432/atelier_dev",
      );
    }
    _db = getProdDb(url);
  }
  return _db;
}

/**
 * Graceful-shutdown hook. Drains the postgres-js pool with a short timeout.
 * Called from instrumentation.ts alongside stopAllWorkers + closeBrowserPool.
 */
export async function closeDb(): Promise<void> {
  await closeProdDb();
  _db = undefined;
}
