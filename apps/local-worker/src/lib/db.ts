/**
 * db.ts — Drizzle handle singleton for local-worker.
 *
 * Mirrors apps/admin/lib/db.ts but standalone — local-worker is a separate
 * Node process and cannot import from the Next.js admin app. Both use the
 * same getProdDb factory from @atelier/db, so the underlying postgres-js
 * pool semantics (prepare:false for PgBouncer, max:10, etc.) are identical.
 */

import { getProdDb, closeProdDb, type Db } from "@atelier/db";

let _db: Db | undefined;

export function getDb(): Db {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Populate the repo-root .env before booting local-worker.",
      );
    }
    _db = getProdDb(url);
  }
  return _db;
}

/** Graceful-shutdown hook — called by index.ts on SIGINT/SIGTERM. */
export async function closeDb(): Promise<void> {
  await closeProdDb();
  _db = undefined;
}
