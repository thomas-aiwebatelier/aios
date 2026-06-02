#!/usr/bin/env node
/**
 * Build workspace dependencies before agency-site's own build.
 *
 * Cloudflare Pages runs `cd apps/agency-site && pnpm install && pnpm build`.
 * It doesn't know to build workspace packages first. Without this prebuild,
 * @atelier/db resolves to its package.json `main: ./dist/index.js`, which
 * doesn't exist yet (dist/ is gitignored) — Vite fails with
 * "Failed to resolve entry for package @atelier/db".
 *
 * Mirror of apps/admin/scripts/build-workspace-deps.mjs.
 *
 * Idempotent. Cross-platform.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const packagesToBuild = ["packages/db"];

for (const pkg of packagesToBuild) {
  console.log(`[build-deps] Building ${pkg}...`);
  const result = spawnSync("pnpm", ["run", "build"], {
    cwd: join(repoRoot, pkg),
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`[build-deps] FAIL building ${pkg}`);
    process.exit(result.status || 1);
  }
}
console.log("[build-deps] All workspace packages built.");
