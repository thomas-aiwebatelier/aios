/**
 * research.ts — Pipeline 2 orchestrator (Tasks 3.2-3.5).
 *
 * Ported from apps/admin/workers/research.ts for the local-worker split.
 * Research runs locally because its sub-steps shell out to the `claude` CLI
 * (Max-plan file-based auth at %USERPROFILE%\.claude\), which isn't portable
 * to Cloud Run — same reason generation + deploy already moved here.
 *
 * Import path changes vs the admin original:
 *   - queue:  `../lib/queue.js`  → `./lib/queue.js`
 *   - logger: `../lib/logger.js` → `./logger.js` (logger lives at src/logger.ts)
 *   - cross-worker imports (research-branding etc.) stay `./research-*.js`
 *   - `@atelier/db` unchanged
 *
 * Processes 'research' jobs from pipeline_jobs:
 *   1. extractBranding     (Task 3.2)
 *   2. enrichContact       (Task 3.3)
 *   3. crawlSite           (Task 3.4)
 *   4. researchCompetitor  (Task 3.5)
 *
 * On success: lead.status → 'awaiting_approval'
 * On failure: lead stays at prior status, job marked failed
 */

import { eq } from "drizzle-orm";
import { leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { claimNext, heartbeat, completeJob, failJob } from "./lib/queue.js";
import { extractBranding } from "./research-branding.js";
import { fetchBrandPhotos } from "./research-photos.js";
import { enrichContact } from "./research-contact.js";
import { crawlSite } from "./research-crawl.js";
import { researchCompetitor } from "./research-competitor.js";
import { logger } from "./logger.js";

// ── Job type (matches poll-loop Processor contract) ───────────────────────────

export interface ResearchJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

/**
 * processResearchJob — processor invoked by the local-worker poll loop.
 *
 * Takes an already-claimed job, runs all 4 research sub-steps, calls
 * completeJob on success. Throws on failure (poll-loop's catch converts to
 * failJob). The shared Playwright browser pool is left open across jobs and
 * torn down at process shutdown.
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

    // ── Step 0: Brand photos from Google Maps (real imagery + palette) ────────
    // Runs before branding so the branding step can fall back to the Maps-photo
    // palette and use the Maps websiteUri (often an IG/FB URL) as a logo source.
    // Best-effort: fetchBrandPhotos never throws, returning empty arrays on
    // failure. We persist the photo resource names on the lead for traceability.
    logger.info("[research] step 0/4: brand photos (maps)", { leadId });
    const photoResult = await fetchBrandPhotos(db, {
      id: lead.id,
      googleMapsPlaceId: lead.googleMapsPlaceId ?? null,
    });
    if (photoResult.photoRefs.length > 0) {
      await db.update(leads)
        .set({ googlePhotoRefs: photoResult.photoRefs })
        .where(eq(leads.id, leadId));
    }

    // ── Step 1: Branding (Task 3.2) ──────────────────────────────────────────
    logger.info("[research] step 1/4: branding", { leadId });
    await extractBranding(db, leadId, websiteUrl, photoResult);

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
      .where(eq(leads.id, leadId));

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
  const job = await claimNext(db, ["research"], "research-worker");
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
