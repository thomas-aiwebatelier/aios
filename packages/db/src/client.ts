import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as schema from "./schema.js";

const migrationsDir = fileURLToPath(new URL("../migrations", import.meta.url));

export function createDb(path: string) {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

/**
 * Run Drizzle migrations from the given folder path.
 * Idempotent — safe to call on every boot.
 */
export function runMigrations(db: Db, migrationsFolder: string) {
  migrate(db, { migrationsFolder });
}

/**
 * Create all tables in the given database instance by executing migration SQL files.
 * Used for in-memory test databases. Always reflects real migration state.
 */
export function createSchema(db: Db) {
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of sqlFiles) {
    const sqlContent = readFileSync(path.join(migrationsDir, file), "utf8");
    for (const stmt of sqlContent.split("--> statement-breakpoint")) {
      const s = stmt.trim();
      if (s) db.$client.exec(s);
    }
  }
}
