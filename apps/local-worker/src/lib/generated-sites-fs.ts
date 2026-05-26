/**
 * generated-sites-fs.ts — Filesystem helpers for generated Astro projects.
 *
 * Local-worker version. Resolution order for the root directory:
 *   1. process.env.GENERATED_SITES_DIR    (operator-provided, absolute path)
 *   2. process.env.GENERATED_SITES_ROOT   (legacy admin var — keep for parity)
 *   3. <repo-root>/generated-sites/       (default, mirrors admin behaviour)
 *
 * `repoRoot()` walks up two levels from cwd if cwd is apps/local-worker, or
 * uses REPO_ROOT env var when present (set by index.ts after dotenv load).
 */

import { mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

function repoRoot(): string {
  if (process.env.REPO_ROOT) return process.env.REPO_ROOT;
  return path.resolve(process.cwd(), "..", "..");
}

export function getProjectPath(slug: string): string {
  const root =
    process.env.GENERATED_SITES_DIR ??
    process.env.GENERATED_SITES_ROOT ??
    path.join(repoRoot(), "generated-sites");
  return path.join(root, slug);
}

export function ensureProjectDir(slug: string): string {
  const p = getProjectPath(slug);
  mkdirSync(p, { recursive: true });
  return p;
}

export function cleanProjectDir(slug: string): void {
  const p = getProjectPath(slug);
  // maxRetries + retryDelay: on Windows, recursive delete of a prior build
  // (node_modules, .astro) frequently hits transient EPERM/EBUSY from
  // antivirus scans, OneDrive sync, or lingering esbuild handles. `force`
  // alone only ignores missing-path errors — these options make Node retry
  // the unlink/rmdir on those specific Windows lock errors.
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
}

/** Wipe-then-create. Used at the start of each generation attempt. */
export function resetProjectDir(slug: string): string {
  cleanProjectDir(slug);
  return ensureProjectDir(slug);
}
