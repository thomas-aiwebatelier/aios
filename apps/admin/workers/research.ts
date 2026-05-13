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
import { extractBranding } from "./research-branding.js";
import { enrichContact } from "./research-contact.js";
import { crawlSite } from "./research-crawl.js";
import { researchCompetitor } from "./research-competitor.js";
import { logger } from "../lib/logger.js";

// ── Job type (matches runner contract) ───────────────────────────────────────

export interface ResearchJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

/**
 * processResearchJob — runner-shaped processor for the worker-runner pull-loop.
 *
 * Takes an already-claimed job, runs all 4 research sub-steps, calls
 * completeJob on success. Throws on failure (runner converts to failJob).
 * closeBrowserPool is NOT called here — the runner calls it at shutdown
 * via stopAllWorkers so the pool stays warm across multiple jobs.
 */
export async function processResearchJob(db: Db, job: ResearchJob): Promise<void> {
  const { leadId } = job.payload as { leadId: string };

  // Heartbeat every 30s — research can take 5-15 min total
  const hbInterval = setInterval(async () => {
    try {
      await heartbeat(db, job.id);
    } catch (err) {
      logger.warn("[research] heartbeat failed", { error: String(err) });
    }
  }, 30_000);

  // Also expose heartbeat as a callback for the crawl sub-step (which runs longest)
  const heartbeatFn = () => heartbeat(db, job.id);

  try {
    logger.info("[research] starting job", { jobId: job.id, leadId });

    // Load lead
    const lead = ((await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      ))[0];

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
    await db.update(leads)
      .set({ status: "awaiting_approval" })
      .where(eq(leads.id, leadId));

    await completeJob(db, job.id);
    logger.info("[research] job complete", { jobId: job.id, leadId });
  } finally {
    clearInterval(hbInterval);
  }
}

/**
 * runResearchWorker — legacy one-shot helper (kept for backwards compat /
 * manual CLI invocations). Wraps processResearchJob with its own claim/fail.
 *
 * Returns true if a job was processed, false if queue was empty.
 */
export async function runResearchWorker(db: Db): Promise<boolean> {
  const job = await claimNext(db, "research-worker", "research");
  if (!job) {
    logger.debug("[research] no queued research jobs");
    return false;
  }

  try {
    await processResearchJob(db, job);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[research] job failed", { jobId: job.id, error: message });
    await failJob(db, job.id, message);
    // Do NOT rethrow — let the caller decide whether to continue the loop
    return false;
  }
}
