#!/usr/bin/env node
/**
 * Build workspace dependencies before admin's own build.
 *
 * Firebase App Hosting runs admin's `build` script from rootDir=apps/admin.
 * It doesn't know to build workspace packages first. Without this prebuild,
 * @atelier/db and @atelier/shared resolve to .ts source which Cloud Run's
 * Node can't load (no tsx in standalone bundle).
 *
 * Idempotent. Cross-platform.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const packagesToBuild = ["packages/db", "packages/shared", "packages/auth"];

for (const pkg of packagesToBuild) {
  console.log(`[build-deps] Building ${pkg}...`);
  const result = spawnSync("pnpm", ["run", "build"], {
    cwd: join(repoRoot, pkg),
    stdio: "inherit",
    shell: true, // PowerShell on Windows, bash on Cloud Build
  });
  if (result.status !== 0) {
    console.error(`[build-deps] FAIL building ${pkg}`);
    process.exit(result.status || 1);
  }
}
console.log("[build-deps] All workspace packages built.");
