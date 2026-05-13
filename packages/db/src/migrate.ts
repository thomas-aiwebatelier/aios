/**
 * Run Drizzle migrations against the configured DATABASE_URL.
 *
 * CLI: pnpm --filter @atelier/db migrate
 */
import { getProdDb, closeProdDb, runMigrations } from "./client.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL not set");
  process.exit(1);
}

console.log(`[migrate] Opening database at: ${url.replace(/:[^@/]+@/, ":****@")}`);

try {
  const db = getProdDb(url);
  await runMigrations(db);
  console.log("[migrate] Migrations applied successfully.");
} catch (err) {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
} finally {
  await closeProdDb();
}
process.exit(0);
