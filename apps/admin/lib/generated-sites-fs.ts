/**
 * generated-sites-fs.ts — Filesystem helpers for generated Astro projects.
 *
 * Generated projects live at:
 *   $GENERATED_SITES_ROOT/<slug>/   (env override)
 *   <repo-root>/generated-sites/<slug>/  (default)
 *
 * Used by the generation worker (Task 4.1) and the edit worker (Task 4.5).
 */

import { mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";

/** Absolute path to the repo root. Works when cwd is apps/admin. */
function repoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

/**
 * Returns the absolute path for a generated project directory.
 * Does NOT create the directory.
 */
export function getProjectPath(slug: string): string {
  const root =
    process.env.GENERATED_SITES_ROOT ?? path.join(repoRoot(), "generated-sites");
  return path.join(root, slug);
}

/**
 * Ensures the project directory exists (creates parents as needed).
 * Returns the absolute path.
 */
export function ensureProjectDir(slug: string): string {
  const p = getProjectPath(slug);
  mkdirSync(p, { recursive: true });
  return p;
}

/** Removes the project directory if it exists. No-op if absent. */
export function cleanProjectDir(slug: string): void {
  const p = getProjectPath(slug);
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

/**
 * Wipe-then-create. Used at the start of each generation attempt so every
 * attempt starts from a clean slate.
 * Returns the absolute path.
 */
export function resetProjectDir(slug: string): string {
  cleanProjectDir(slug);
  return ensureProjectDir(slug);
}
