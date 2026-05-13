#!/usr/bin/env tsx
/**
 * Probe — manual smoke test for the Research pipeline (Tasks 3.2-3.5).
 *
 * Reads an existing lead from the real DB by ID, enqueues a research job,
 * runs the research worker once, then prints all artifacts.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/probe/research.ts --lead-id <id>
 *
 * Prerequisites:
 *   - Lead must already exist in DB (run probe/discovery.ts first)
 *   - DATABASE_PATH env var must be set (or defaults to ./data/atelier.db)
 */

import { createDb, leads, brandProfiles, siteInventories, competitors } from "@atelier/db";
import { eq } from "drizzle-orm";
import { enqueue } from "../../apps/admin/lib/queue.js";
import { runResearchWorker } from "../../apps/admin/workers/research.js";

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const leadIdIdx = args.indexOf("--lead-id");

if (leadIdIdx === -1 || !args[leadIdIdx + 1]) {
  console.error("Usage: pnpm tsx --env-file=.env scripts/probe/research.ts --lead-id <id>");
  process.exit(1);
}

const leadId = args[leadIdIdx + 1];

// ── DB ───────────────────────────────────────────────────────────────────────

const dbPath = process.env.DATABASE_PATH ?? "./data/atelier.db";
const db = createDb(dbPath);

// ── Verify lead exists ────────────────────────────────────────────────────────

const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
if (!lead) {
  console.error(`[probe/research] Lead not found: ${leadId}`);
  process.exit(1);
}

console.log("[probe/research] found lead:", {
  id: lead.id,
  name: lead.businessName,
  city: lead.city,
  industry: lead.industryKey,
  website: lead.existingWebsiteUrl,
  status: lead.status,
});

// ── Enqueue research job ──────────────────────────────────────────────────────

console.log("[probe/research] enqueueing research job…");
enqueue(db, { step: "research", leadId, payload: { leadId } });

// ── Run worker ────────────────────────────────────────────────────────────────

console.log("[probe/research] running research worker (this may take 5-15 min)…");
const success = await runResearchWorker(db);

// ── Print results ─────────────────────────────────────────────────────────────

const updatedLead = db.select().from(leads).where(eq(leads.id, leadId)).get();
const profile = db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId)).get();
const inventory = db.select().from(siteInventories).where(eq(siteInventories.leadId, leadId)).get();
const competitor = db.select().from(competitors).where(eq(competitors.leadId, leadId)).get();

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("RESEARCH RESULTS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Worker returned: ${success}`);
console.log(`Lead status: ${updatedLead?.status}`);
console.log("\n── Brand Profile ──────────────────────────");
if (profile) {
  console.log("  Logo path:   ", profile.logoPath ?? "(none)");
  console.log("  Primary:     ", profile.primaryColor ?? "(none)");
  console.log("  Secondary:   ", profile.secondaryColor ?? "(none)");
  console.log("  Accent:      ", profile.accentColor ?? "(none)");
  console.log("  Palette:     ", profile.extractedPalette ? JSON.stringify(profile.extractedPalette) : "(none)");
  console.log("  Fonts:       ", profile.fontsDetected ? JSON.stringify(profile.fontsDetected) : "(none)");
  console.log("  Tone:        ", profile.toneOfVoiceSummary ?? "(none)");
  console.log("  Social:      ", profile.socialLinks ? JSON.stringify(profile.socialLinks) : "(none)");
} else {
  console.log("  (no brand profile)");
}

console.log("\n── Site Inventory ─────────────────────────");
if (inventory) {
  console.log(`  Pages crawled:  ${inventory.pages?.length ?? 0}`);
  console.log(`  Assets tracked: ${inventory.assets?.length ?? 0}`);
  console.log(`  Crawled at:     ${inventory.crawledAt}`);
  if (inventory.pages?.length) {
    console.log("  Pages preview:");
    inventory.pages.slice(0, 3).forEach((p) => {
      console.log(`    - [${p.language ?? "?"}] ${p.title} (${p.url})`);
    });
  }
} else {
  console.log("  (no site inventory — lead has no website)");
}

console.log("\n── Competitor ──────────────────────────────");
if (competitor) {
  console.log("  Name:     ", competitor.competitorName ?? "(none)");
  console.log("  URL:      ", competitor.competitorUrl);
  console.log("  Reason:   ", competitor.selectionReason ?? "(none)");
  console.log("  Learnings:", competitor.learnings ?? "(none)");
} else {
  console.log("  (no competitor)");
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
