import { mkdirSync } from "node:fs";
import path from "node:path";
import { createDb } from "@atelier/db";

let _db: ReturnType<typeof createDb> | undefined;

/**
 * Resolve DATABASE_PATH to an absolute path on disk.
 *
 * The admin process runs from `apps/admin/` (Next.js dev/build cwd), but the
 * canonical data location is `data/` at the repo root (spec §5). So when the
 * env var is a relative path, anchor it to the repo root (two levels up from
 * apps/admin), not to process.cwd(). Absolute paths pass through unchanged.
 *
 * Ensures the parent directory exists before returning — better-sqlite3 won't
 * create missing directories on its own and throws "Cannot open database
 * because the directory does not exist" otherwise.
 */
function resolveDatabasePath(): string {
  const raw = process.env.DATABASE_PATH ?? "./data/atelier.db";
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(repoRoot, raw);
  mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

export function getDb() {
  if (!_db) _db = createDb(resolveDatabasePath());
  return _db;
}
