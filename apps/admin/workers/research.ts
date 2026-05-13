/**
 * research.ts — Pipeline 2 orchestrator (Tasks 3.2-3.5).
 *
 * Processes 'research' jobs from pipeline_jobs:
 *   1. extractBranding     (Task 3.2)
 *   2. enrichContact       (Task 3.3)
 *   3. crawlSite           (Task 3.4)
 *   4. researchCompetitor  (Task 3.5)
 *
 * On success: lead.status → 'awaiting_approval'
 * On failure: lead stays at prior status, job marked failed
 *
 * Concurrency: controlled by how many research-worker instances the admin
 * process starts. Spec §11.2 says 2 at most; 1 is fine for spine.
 */

import { eq } from "drizzle-orm";
import { leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { claimNext, heartbeat, completeJob, failJob } from "../lib/queue.js";
import { closeBrowserPool } from "../lib/playwright-pool.js";
import { extractBranding } from "./research-branding.js";
import { enrichContact } from "./research-contact.js";
import { crawlSite } from "./research-crawl.js";
import { researchCompetitor } from "./research-competitor.js";
import { logger } from "../lib/logger.js";

export async function runResearchWorker(db: Db): Promise<boolean> {
  const job = claimNext(db, "research-worker");
  if (!job) {
    logger.debug("[research] no queued research jobs");
    return false;
  }

  const { leadId } = job.payload as { leadId: string };

  // Heartbeat every 30s — research can take 5-15 min total
  const hbInterval = setInterval(() => {
    try {
      heartbeat(db, job.id);
    } catch (err) {
      logger.warn("[research] heartbeat failed", { error: String(err) });
    }
  }, 30_000);

  // Also expose heartbeat as a callback for the crawl sub-step (which runs longest)
  const heartbeatFn = () => heartbeat(db, job.id);

  try {
    logger.info("[research] starting job", { jobId: job.id, leadId });

    // Load lead
    const lead = db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .get();

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const websiteUrl = lead.existingWebsiteUrl ?? null;

    // ── Step 1: Branding (Task 3.2) ──────────────────────────────────────────
    logger.info("[research] step 1/4: branding", { leadId });
    await extractBranding(db, leadId, websiteUrl);

    // ── Step 2: Contact enrichment (Task 3.3) ─────────────────────────────────
    logger.info("[research] step 2/4: contact", { leadId });
    await enrichContact(db, leadId, websiteUrl);

    // ── Step 3: Site inventory crawl (Task 3.4) ────────────────────────────────
    logger.info("[research] step 3/4: crawl", { leadId });
    const siteInventory = await crawlSite(db, leadId, websiteUrl, heartbeatFn);

    // ── Step 4: Competitor research (Task 3.5) ────────────────────────────────
    logger.info("[research] step 4/4: competitor", { leadId });
    await researchCompetitor(
      db,
      leadId,
      lead.businessName,
      lead.city,
      lead.industryKey,
      !!siteInventory,
    );

    // ── Update lead status ─────────────────────────────────────────────────────
    db.update(leads)
      .set({ status: "awaiting_approval" })
      .where(eq(leads.id, leadId))
      .run();

    completeJob(db, job.id);
    logger.info("[research] job complete", { jobId: job.id, leadId });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[research] job failed", { jobId: job.id, leadId, error: message });
    failJob(db, job.id, message);
    // Do NOT rethrow — let the caller decide whether to continue the loop
    return false;
  } finally {
    clearInterval(hbInterval);
    await closeBrowserPool();
  }
}
