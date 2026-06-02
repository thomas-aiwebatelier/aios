#!/usr/bin/env node
/**
 * Emit Firebase App Hosting bundle.yaml.
 *
 * Firebase's Node.js+pnpm buildpack defaults to launching the container with
 * `pnpm start`, which triggers pnpm 11.x's runDepsStatusCheck + supply-chain
 * policy at every cold start. That fails whenever any transitive dep in our
 * workspace lockfile was published <24h ago (e.g. @cloudflare/workers-types,
 * which local-worker depends on, gets a new build daily).
 *
 * Writing this bundle.yaml tells the firebasebundle buildpack the exact
 * runCommand to use — bypassing pnpm at runtime. The container then runs
 * the Astro standalone Node server directly. No pnpm, no lockfile check,
 * no supply-chain dance.
 *
 * Path matches what the firebasebundle buildpack inspects:
 *   apps/agency-site/.apphosting/bundle.yaml   (relative to rootDir)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const appRoot = join(__dirname, "..");
const outDir = join(appRoot, ".apphosting");

mkdirSync(outDir, { recursive: true });

const bundle = `runCommand: 'node ./dist/server/entry.mjs'
`;

writeFileSync(join(outDir, "bundle.yaml"), bundle, "utf8");
console.log("[write-bundle-yaml] wrote .apphosting/bundle.yaml");
