import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH ?? "./data/atelier.db";
console.log(`[migrate] Opening database at: ${dbPath}`);

const db = createDb(dbPath);

try {
  migrate(db, { migrationsFolder: path.join(__dirname, "../migrations") });
  console.log("[migrate] Migrations applied successfully.");
} catch (err) {
  console.error("[migrate] Migration failed:", err);
  process.exit(1);
} finally {
  db.$client.close();
}
process.exit(0);
