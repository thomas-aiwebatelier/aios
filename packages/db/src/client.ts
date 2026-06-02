/**
 * Database client — Postgres (postgres-js) + pglite (tests).
 *
 * Two flavours:
 *   getProdDb(connectionString)  — postgres-js against a real Postgres server
 *                                  (local Postgres 16, or Cloud SQL Postgres).
 *   getTestDb()                  — @electric-sql/pglite in-process Postgres,
 *                                  fresh schema each call. No external DB needed.
 *
 * Both return a drizzle() instance with the same schema, exposing the same
 * query surface — call sites are agnostic to the backend.
 */

import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import postgres, { type Sql } from "postgres";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as schema from "./schema.js";

// Lazily resolved so workerd / Cloudflare consumers — which only need the
// schema exports — never evaluate `new URL(..., import.meta.url)` at module
// load time (workerd's import.meta.url is not a valid base for relative URLs
// and throws "Invalid URL string" when this lives at the top level).
function getDrizzleDir(): string {
  return fileURLToPath(new URL("../drizzle", import.meta.url));
}

export type Db = PostgresJsDatabase<typeof schema> | PgliteDatabase<typeof schema>;

// ── Production: postgres-js ─────────────────────────────────────────────────

interface ProdConn {
  client: Sql;
  db: PostgresJsDatabase<typeof schema>;
}

let _prod: ProdConn | undefined;

/**
 * Open (or reuse) a postgres-js-backed Drizzle instance.
 * One pool per process — repeated calls return the same instance.
 */
export function getProdDb(connectionString: string): PostgresJsDatabase<typeof schema> {
  if (!_prod) {
    const client = postgres(connectionString, {
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
      // Required for PgBouncer transaction-mode pooling (Supabase pooler on
      // port 6543, RDS Proxy, etc.). Prepared statements are session-scoped
      // and don't survive the pool's per-transaction reassignment. Setting
      // this to false uses simple/extended-query protocol instead — slightly
      // slower per call but compatible with any pooler tier.
      prepare: false,
    });
    _prod = { client, db: drizzlePg(client, { schema }) };
  }
  return _prod.db;
}

/** Close the prod pool. Idempotent. */
export async function closeProdDb(): Promise<void> {
  if (_prod) {
    await _prod.client.end({ timeout: 5 });
    _prod = undefined;
  }
}

/**
 * Run Drizzle migrations from the given folder (defaults to the bundled
 * drizzle/ folder inside @atelier/db). Idempotent — safe on every boot.
 */
export async function runMigrations(
  db: PostgresJsDatabase<typeof schema>,
  migrationsFolder: string = getDrizzleDir(),
): Promise<void> {
  await migratePg(db, { migrationsFolder });
}

// ── Tests: pglite in-process ────────────────────────────────────────────────

/**
 * Spin up a fresh in-memory Postgres-compatible DB with all tables created
 * from the bundled drizzle/ SQL files. Each call returns a NEW pglite
 * instance — tests own teardown via process exit.
 */
export async function getTestDb(): Promise<PgliteDatabase<typeof schema>> {
  const pg = new PGlite();
  const db = drizzlePglite(pg, { schema });

  // Apply migration SQL directly (pglite supports executing migrator output).
  const drizzleDir = getDrizzleDir();
  const sqlFiles = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of sqlFiles) {
    const sqlContent = readFileSync(path.join(drizzleDir, file), "utf8");
    for (const stmt of sqlContent.split("--> statement-breakpoint")) {
      const s = stmt.trim();
      if (s) await pg.exec(s);
    }
  }
  return db;
}
