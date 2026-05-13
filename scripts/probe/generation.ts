#!/usr/bin/env tsx
/**
 * Probe — manual smoke test for the Generation pipeline (Task 4.1).
 *
 * Reads an existing lead from the real DB by ID, enqueues a generation job,
 * runs the generation worker once, then prints the result.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/probe/generation.ts --lead-id <id>
 *
 * Prerequisites:
 *   - Lead must already exist in DB with status 'approved' (run research probe first)
 *   - DATABASE_PATH env var must be set (or defaults to ./data/atelier.db)
 *   - claude CLI must be installed and authenticated
 */

import { createDb, leads, generatedSites } from "@atelier/db";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { processGenerationJob } from "../../apps/admin/workers/generation.js";

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const leadIdIdx = args.indexOf("--lead-id");

if (leadIdIdx === -1 || !args[leadIdIdx + 1]) {
  console.error("Usage: pnpm tsx --env-file=.env scripts/probe/generation.ts --lead-id <id>");
  process.exit(1);
}

const leadId = args[leadIdIdx + 1];

// ── DB ───────────────────────────────────────────────────────────────────────

const dbPath = process.env.DATABASE_PATH ?? "./data/atelier.db";
const db = createDb(dbPath);

// ── Verify lead exists ────────────────────────────────────────────────────────

const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
if (!lead) {
  console.error(`[probe/generation] Lead not found: ${leadId}`);
  process.exit(1);
}

console.log("[probe/generation] found lead:", {
  id: lead.id,
  name: lead.businessName,
  city: lead.city,
  industry: lead.industryKey,
  status: lead.status,
  slug: lead.slug,
});

// ── Run worker directly ───────────────────────────────────────────────────────

const fakeJob = {
  id: `probe-${nanoid(8)}`,
  payload: { leadId },
  leadId,
};

console.log("[probe/generation] running generation worker (this may take 15-30 min)…");
console.log("[probe/generation] job id:", fakeJob.id);

try {
  await processGenerationJob(db, fakeJob);
} catch (err) {
  console.error("[probe/generation] worker threw:", err);
}

// ── Print results ─────────────────────────────────────────────────────────────

const updatedLead = db.select().from(leads).where(eq(leads.id, leadId)).get();
const site = db
  .select()
  .from(generatedSites)
  .where(eq(generatedSites.leadId, leadId))
  .orderBy(desc(generatedSites.version))
  .limit(1)
  .get();

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("GENERATION RESULTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Lead status: ${updatedLead?.status}`);
console.log("\n── Generated Site ──────────────────────────");
if (site) {
  console.log("  Version:     ", site.version);
  console.log("  Path:        ", site.astroProjectPath ?? "(none)");
  console.log("  Created via: ", site.createdVia);
  console.log("  Lighthouse:  ", site.lighthouseScores ? JSON.stringify(site.lighthouseScores) : "(none)");
} else {
  console.log("  (no generated site row found)");
}
console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
