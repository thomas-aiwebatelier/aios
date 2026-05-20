#!/usr/bin/env node
/**
 * Post-build workaround for Firebase App Hosting + pnpm monorepo:
 *
 * Next.js standalone mode in a pnpm workspace nests output like:
 *   .next/standalone/apps/admin/server.js
 *   .next/standalone/apps/admin/.next/routes-manifest.json
 *   .next/standalone/apps/admin/node_modules/...
 *   .next/standalone/node_modules/...           ← workspace-hoisted deps
 *
 * Firebase's adapter-nextjs + Cloud Run expects FLAT paths:
 *   .next/standalone/server.js
 *   .next/standalone/.next/routes-manifest.json
 *   .next/standalone/node_modules/...
 *
 * This script:
 *   1. Lifts everything from .next/standalone/apps/admin/* into .next/standalone/
 *      (merging node_modules, replacing other files)
 *   2. Mirrors .next/* (routes-manifest, static, etc.) into .next/standalone/.next/
 *      as a safety net for cases where Next.js didn't copy them
 *   3. Sanity-checks that both server.js and routes-manifest.json exist at
 *      the expected flat paths.
 *
 * Idempotent. Run after `next build`.
 */
import { existsSync, mkdirSync, readdirSync, statSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const adminRoot = join(__dirname, "..");
const nextDir = join(adminRoot, ".next");
const standaloneDir = join(nextDir, "standalone");
const standaloneNextDir = join(standaloneDir, ".next");
const nestedAppDir = join(standaloneDir, "apps", "admin");

if (!existsSync(nextDir)) {
  console.error("[post-build] No .next/ dir — did `next build` run?");
  process.exit(1);
}
if (!existsSync(standaloneDir)) {
  console.error("[post-build] No .next/standalone/ dir — is output:standalone set?");
  process.exit(1);
}

mkdirSync(standaloneNextDir, { recursive: true });

// ── Step 1: lift nested .next/standalone/apps/admin/* into .next/standalone/ ──
if (existsSync(nestedAppDir) && statSync(nestedAppDir).isDirectory()) {
  console.log("[post-build] Lifting nested .next/standalone/apps/admin/* → .next/standalone/");
  let liftedCount = 0;
  for (const entry of readdirSync(nestedAppDir)) {
    const src = join(nestedAppDir, entry);
    const dest = join(standaloneDir, entry);
    // For node_modules, MERGE (don't replace) so workspace-hoisted deps aren't lost
    cpSync(src, dest, { recursive: true, force: true });
    liftedCount++;
  }
  console.log(`[post-build]   Lifted ${liftedCount} entries from nested apps/admin/`);

  // Clean up the now-redundant nested apps/ dir
  rmSync(join(standaloneDir, "apps"), { recursive: true, force: true });
  console.log("[post-build]   Removed empty .next/standalone/apps/");
}

// ── Step 2: mirror .next/* (except standalone/, cache/) into .next/standalone/.next/ ──
const skip = new Set(["standalone", "cache"]);
let mirroredCount = 0;
for (const entry of readdirSync(nextDir)) {
  if (skip.has(entry)) continue;
  const src = join(nextDir, entry);
  const dest = join(standaloneNextDir, entry);
  cpSync(src, dest, { recursive: true, force: true });
  mirroredCount++;
}
console.log(`[post-build] Mirrored ${mirroredCount} entries from .next/ → .next/standalone/.next/`);

// ── Step 3: sanity checks ──
const serverJs = join(standaloneDir, "server.js");
const manifest = join(standaloneNextDir, "routes-manifest.json");
const missing = [];
if (!existsSync(serverJs)) missing.push(serverJs);
if (!existsSync(manifest)) missing.push(manifest);

if (missing.length > 0) {
  console.error("[post-build] FAIL: missing files after mirror:");
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`[post-build] OK: server.js + routes-manifest.json present at flat paths.`);
