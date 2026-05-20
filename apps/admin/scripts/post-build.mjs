#!/usr/bin/env node
/**
 * Post-build workaround for Firebase App Hosting's @apphosting/adapter-nextjs:
 * the adapter reads `.next/standalone/.next/routes-manifest.json` (and other
 * build-output files) at deploy-time, but in pnpm monorepos Next.js's
 * standalone mode may nest the output as `.next/standalone/apps/admin/.next/...`
 * (preserving the workspace path) or skip copying some files.
 *
 * This script mirrors `.next/*` (except `standalone/` itself) into
 * `.next/standalone/.next/` so the adapter's flat-path expectation holds.
 *
 * Run after `next build` from apps/admin/. Idempotent.
 */
import { existsSync, mkdirSync, readdirSync, statSync, cpSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const adminRoot = join(__dirname, "..");
const nextDir = join(adminRoot, ".next");
const standaloneDir = join(nextDir, "standalone");
const standaloneNextDir = join(standaloneDir, ".next");

if (!existsSync(nextDir)) {
  console.error("[post-build] No .next/ dir — did `next build` run?");
  process.exit(1);
}

if (!existsSync(standaloneDir)) {
  console.error("[post-build] No .next/standalone/ dir — is output:standalone set?");
  process.exit(1);
}

// Ensure standaloneNextDir exists, then mirror everything from .next/ except
// the standalone/ subdir (no recursion) and cache/ (build cache, not needed).
mkdirSync(standaloneNextDir, { recursive: true });

const skip = new Set(["standalone", "cache"]);
let copied = 0;
for (const entry of readdirSync(nextDir)) {
  if (skip.has(entry)) continue;
  const src = join(nextDir, entry);
  const dest = join(standaloneNextDir, entry);
  cpSync(src, dest, { recursive: true, force: true });
  copied++;
}

console.log(`[post-build] Mirrored ${copied} entries from .next/ → .next/standalone/.next/`);

// Also check for the workspace-nested case: if Next.js nested standalone at
// .next/standalone/apps/admin/, lift its .next/ contents into the flat path.
const nestedNext = join(standaloneDir, "apps", "admin", ".next");
if (existsSync(nestedNext) && statSync(nestedNext).isDirectory()) {
  console.log("[post-build] Detected nested standalone at .next/standalone/apps/admin/ — lifting");
  for (const entry of readdirSync(nestedNext)) {
    const src = join(nestedNext, entry);
    const dest = join(standaloneNextDir, entry);
    cpSync(src, dest, { recursive: true, force: true });
  }
}

// Final sanity check
const manifest = join(standaloneNextDir, "routes-manifest.json");
if (!existsSync(manifest)) {
  console.error(`[post-build] FAIL: ${manifest} still missing after mirror.`);
  process.exit(1);
}
console.log(`[post-build] OK: ${manifest} exists.`);
