#!/usr/bin/env tsx
/**
 * Probe — manual smoke test for the Deploy pipeline (Task 4.3).
 *
 * Reads an existing generated_sites row (and its lead) from the real DB,
 * runs the deploy worker once, then prints the result.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/probe/deploy.ts --lead-id <id>
 *   pnpm tsx --env-file=.env scripts/probe/deploy.ts --lead-id <id> --generated-site-id <id>
 *
 * Prerequisites:
 *   - Lead must already exist with status 'generated'
 *   - generated_sites row must exist with astroProjectPath and a built dist/
 *   - DATABASE_PATH env var must be set (or defaults to ./data/atelier.db)
 *   - CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set
 *   - PSI_API_KEY must be set
 *   - npx wrangler must be available (wrangler login done)
 */

import { createDb, leads, generatedSites } from "@atelier/db";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { processDeployJob } from "../../apps/admin/workers/deployer.js";

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const leadIdIdx = args.indexOf("--lead-id");
const siteIdIdx = args.indexOf("--generated-site-id");

if (leadIdIdx === -1 || !args[leadIdIdx + 1]) {
  console.error(
    "Usage: pnpm tsx --env-file=.env scripts/probe/deploy.ts --lead-id <id> [--generated-site-id <id>]",
  );
  process.exit(1);
}

const leadId = args[leadIdIdx + 1];
const explicitSiteId = siteIdIdx !== -1 ? args[siteIdIdx + 1] : undefined;

// ── DB ────────────────────────────────────────────────────────────────────────

const dbPath = process.env.DATABASE_PATH ?? "./data/atelier.db";
const db = createDb(dbPath);

// ── Verify lead exists ────────────────────────────────────────────────────────

const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
if (!lead) {
  console.error(`[probe/deploy] Lead not found: ${leadId}`);
  process.exit(1);
}

console.log("[probe/deploy] found lead:", {
  id: lead.id,
  name: lead.businessName,
  city: lead.city,
  industry: lead.industryKey,
  status: lead.status,
  slug: lead.slug,
});

// ── Resolve generated_sites row ───────────────────────────────────────────────

let generatedSiteId = explicitSiteId;

if (!generatedSiteId) {
  const site = db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.leadId, leadId))
    .orderBy(desc(generatedSites.version))
    .limit(1)
    .get();

  if (!site) {
    console.error(`[probe/deploy] No generated_sites row found for lead ${leadId}`);
    process.exit(1);
  }

  generatedSiteId = site.id;
  console.log("[probe/deploy] using latest generated_sites row:", {
    id: site.id,
    version: site.version,
    astroProjectPath: site.astroProjectPath,
  });
}

// ── Run worker directly ───────────────────────────────────────────────────────

const fakeJob = {
  id: `probe-${nanoid(8)}`,
  leadId,
  payload: { leadId, generatedSiteId },
};

console.log("[probe/deploy] starting deploy job…");

try {
  await processDeployJob(db, fakeJob as any);

  // Print result
  const updatedSite = db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.id, generatedSiteId))
    .get();

  const updatedLead = db.select().from(leads).where(eq(leads.id, leadId)).get();

  console.log("\n[probe/deploy] DONE ✓");
  console.log("  Lead status:", updatedLead?.status);
  console.log("  Preview URL:", updatedSite?.cloudflarePreviewUrl);
  console.log("  Deployment URL:", updatedSite?.cloudflareDeploymentId);
  console.log("  Lighthouse scores:", updatedSite?.lighthouseScores);
} catch (err) {
  console.error("[probe/deploy] FAILED:", err);
  process.exit(1);
}
