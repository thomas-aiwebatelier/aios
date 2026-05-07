#!/usr/bin/env tsx
/**
 * Run runQualityChecks against a built reference site.
 *
 * Usage (from repo root):
 *   pnpm exec tsx skills/atelier-design-system/scripts/qc.ts <absolute-path-to-site>
 *
 * Examples:
 *   pnpm exec tsx skills/atelier-design-system/scripts/qc.ts \
 *     skills/atelier-design-system/reference-sites/bakery-example
 *
 * The script invokes runQualityChecks with skipLighthouse:true (Lighthouse on
 * Windows requires manual validation per Phase 0 A5 follow-up). Exit code is
 * non-zero on any failure so this can be used in CI / dev loops.
 */
import path from "node:path";
import { runQualityChecks } from "../quality-checks.ts";

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: qc.ts <path-to-built-astro-site>");
  process.exit(2);
}

const sitePath = path.isAbsolute(arg) ? arg : path.resolve(process.cwd(), arg);

const result = await runQualityChecks(sitePath, {
  skipLighthouse: true,
  onProgress: (msg) => console.log(msg),
});

console.log("ok:", result.ok);
console.log("failures:", JSON.stringify(result.failures, null, 2));
console.log("breakpoints:", JSON.stringify(result.details.breakpoints, null, 2));
console.log("altText:", JSON.stringify(result.details.altText, null, 2));
console.log("links:", JSON.stringify(result.details.links, null, 2));
console.log("robotsMeta:", JSON.stringify(result.details.robotsMeta, null, 2));
console.log("buildWarnings:", JSON.stringify(result.details.buildWarnings, null, 2));
console.log("tokenUsage:", JSON.stringify(result.details.tokenUsage, null, 2));

if (!result.ok) process.exit(1);
