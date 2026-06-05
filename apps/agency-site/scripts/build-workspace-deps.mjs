#!/usr/bin/env node
/**
 * Build workspace dependencies before agency-site's own build.
 *
 * Firebase App Hosting runs the build from rootDir=apps/agency-site and won't
 * build workspace packages first. Without this, @atelier/auth resolves to .ts
 * source which Cloud Run's Node can't load (no tsx in the standalone bundle).
 *
 * Idempotent. Cross-platform.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const packagesToBuild = ["packages/auth"];

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
