#!/usr/bin/env tsx
/**
 * Probe — manual smoke test for the Discovery worker (Task 3.1).
 *
 * Enqueues a discovery job with a query, runs the worker once, and prints
 * a summary of leads inserted into a temp DB.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/probe/discovery.ts
 *   pnpm tsx --env-file=.env scripts/probe/discovery.ts "kapper Gent"
 *   pnpm tsx --env-file=.env scripts/probe/discovery.ts --url "https://maps.google.com/?place_id=ChIJXXX"
 */

import { createDb, createSchema, leads } from "@atelier/db";
import { enqueue } from "../../apps/admin/lib/queue.js";
import { runDiscoveryWorker } from "../../apps/admin/workers/discovery.js";

const args = process.argv.slice(2);

// Determine payload
let payload: { query: string } | { googleMapsUrl: string };

const urlFlagIdx = args.indexOf("--url");
if (urlFlagIdx !== -1 && args[urlFlagIdx + 1]) {
  payload = { googleMapsUrl: args[urlFlagIdx + 1] };
} else {
  const query = args.find((a) => !a.startsWith("--")) ?? "bakkerij Antwerpen";
  payload = { query };
}

// Use a temp DB so we don't pollute the real database during probing
const db = createDb(":memory:");
createSchema(db);

console.log("[probe/discovery] payload:", payload);
console.log("[probe/discovery] enqueueing job…");
enqueue(db, { step: "discovery", payload });

console.log("[probe/discovery] running worker…");
const inserted = await runDiscoveryWorker(db);
console.log(`[probe/discovery] inserted ${inserted} lead(s)\n`);

const rows = db.select().from(leads).all();
for (const [i, lead] of rows.entries()) {
  console.log(`${i + 1}. ${lead.businessName} (${lead.city})`);
  console.log(`   slug:     ${lead.slug}`);
  console.log(`   industry: ${lead.industryKey} (conf: ${lead.industryClassificationConfidence})`);
  if (lead.existingWebsiteUrl) {
    console.log(`   website:  ${lead.existingWebsiteUrl}`);
    console.log(`   staleness: ${lead.websiteStalnessScore ?? "n/a"}/100`);
  }
  console.log("");
}

console.log(`[probe/discovery] ✅ done — ${rows.length} total lead(s) in temp DB`);
