/**
 * Run Drizzle migrations against the configured DATABASE_URL.
 *
 * CLI: pnpm --filter @atelier/db migrate
 */
import { getProdDb, closeProdDb, runMigrations } from "./client.js";

// Prefer DIRECT_URL for DDL: Supabase's transaction pooler (port 6543) and
// other PgBouncer transaction-mode pools don't reliably handle the
// session-scoped advisory locks Drizzle uses for migration safety, nor all
// DDL operations. DIRECT_URL talks to Postgres directly. Local-dev / CI runs
// without DIRECT_URL fall back to DATABASE_URL.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] Neither DIRECT_URL nor DATABASE_URL is set");
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
