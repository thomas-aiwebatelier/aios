/**
 * backup-db.ts — Task 4.10
 *
 * Creates a timestamped SQLite snapshot using better-sqlite3's native
 * backup() API (safe against a live WAL database — no lock contention).
 * Retains the last 14 daily snapshots and prunes older ones.
 *
 * Output: data/backups/atelier-<ISO-stamp>.db
 *
 * CLI: pnpm tsx --env-file=.env scripts/cron/backup-db.ts
 */

import {
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
  statSync,
} from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { logger } from "../../apps/admin/lib/logger.js";

export const RETAIN_COUNT = 14;

export async function backupDatabase(): Promise<{
  backupPath: string;
  retained: number;
}> {
  // Resolve repo root: script lives at scripts/cron/ → two levels up
  const repoRoot = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
    "..",
    "..",
  );

  const dbPath =
    process.env.DATABASE_PATH ?? path.join(repoRoot, "data", "atelier.db");
  const backupsDir = path.join(repoRoot, "data", "backups");

  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const backupPath = path.join(backupsDir, `atelier-${stamp}.db`);

  // better-sqlite3's backup() is safe against a live WAL DB.
  // Open readonly to avoid accidentally modifying source.
  const src = new Database(dbPath, { readonly: true });
  await src.backup(backupPath);
  src.close();

  const stats = statSync(backupPath);
  logger.info(
    `[backup-db] snapshot: ${backupPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
  );

  // Retain last RETAIN_COUNT snapshots; prune older.
  const all = readdirSync(backupsDir)
    .filter((f) => f.startsWith("atelier-") && f.endsWith(".db"))
    .map((f) => ({ name: f, mtime: statSync(path.join(backupsDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const toRemove = all.slice(RETAIN_COUNT);
  for (const old of toRemove) {
    unlinkSync(path.join(backupsDir, old.name));
    logger.info(`[backup-db] pruned old snapshot: ${old.name}`);
  }

  const retained = Math.min(all.length, RETAIN_COUNT);
  logger.info(`[backup-db] complete — ${retained} snapshot(s) retained`);

  return { backupPath, retained };
}

// CLI runner: pnpm tsx --env-file=.env scripts/cron/backup-db.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  backupDatabase().catch((err) => {
    logger.error("[backup-db] crashed", { err });
    process.exit(1);
  });
}
