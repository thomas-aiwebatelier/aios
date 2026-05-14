/**
 * deployer.ts — Deploy worker for Task 4.3.
 *
 * Claims jobs with step="deploy" (enqueued by generation.ts after a
 * successful Astro build). For each job:
 *
 *   1. Parse payload → { leadId, generatedSiteId }
 *   2. Load generated_sites row; derive dist/ path from astroProjectPath
 *   3. Heartbeat every 30s throughout
 *   4. Get-or-create Cloudflare Pages project (25s throttle on create)
 *   5. Deploy via wrangler subprocess → capture canonicalUrl + deploymentUrl
 *   6. Wait 15s for CDN propagation
 *   7. Run PageSpeed Insights (mobile) → capture scores
 *   8. UPDATE generated_sites: cloudflare fields + lighthouseScores
 *   9. UPDATE leads: status → 'deployed'
 *  10. completeJob
 *
 * On any throw: runner catches and calls failJob; lead stays at 'generated'.
 */

import path from "node:path";
import { eq } from "drizzle-orm";
import { generatedSites, leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { heartbeat, completeJob } from "../lib/queue.js";
import { logger } from "../lib/logger.js";
import { getPagesProject, createPagesProject, deployToPages } from "../lib/cloudflare.js";
import { runPagespeedInsights } from "../lib/psi.js";
import type { WorkerJob } from "../lib/worker-endpoint.js";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeployPayload {
  leadId: string;
  generatedSiteId: string;
}

// ── Main processor ─────────────────────────────────────────────────────────────

export async function processDeployJob(db: Db, job: WorkerJob): Promise<void> {
  // 1. Parse payload
  const rawPayload = job.payload as Record<string, unknown>;
  const leadId = rawPayload.leadId as string | undefined;
  const generatedSiteId = rawPayload.generatedSiteId as string | undefined;

  if (!leadId || !generatedSiteId) {
    throw new Error(
      `[deployer] invalid payload: expected { leadId, generatedSiteId }, got ${JSON.stringify(rawPayload)}`,
    );
  }

  logger.info("[deployer] starting job", { jobId: job.id, leadId, generatedSiteId });

  // 2. Load generated_sites row
  const siteRow = ((await db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.id, generatedSiteId))
    ))[0];

  if (!siteRow) {
    throw new Error(`[deployer] generated_sites row not found: ${generatedSiteId}`);
  }
  if (!siteRow.astroProjectPath) {
    throw new Error(
      `[deployer] generated_sites row ${generatedSiteId} has no astroProjectPath`,
    );
  }

  // Load lead for slug
  const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
  if (!lead) {
    throw new Error(`[deployer] lead not found: ${leadId}`);
  }

  const distPath = path.join(siteRow.astroProjectPath, "dist");
  const slug = lead.slug;

  logger.info("[deployer] context loaded", { slug, distPath });

  // 3. Heartbeat every 30s
  const hbInterval = setInterval(async () => {
    try {
      await heartbeat(db, job.id);
    } catch (err) {
      logger.warn("[deployer] heartbeat failed", { error: String(err) });
    }
  }, 30_000);

  try {
    // 4. Get-or-create Cloudflare Pages project
    const { exists } = await getPagesProject(slug);
    if (!exists) {
      logger.info("[deployer] project not found — creating", { slug });
      await createPagesProject(slug);
    } else {
      logger.info("[deployer] project already exists — skipping create", { slug });
    }

    // 5. Deploy via wrangler
    const { canonicalUrl, deploymentUrl } = await deployToPages(slug, distPath);

    // 6. Wait 15s for CDN propagation
    logger.info("[deployer] waiting 15s for CDN propagation…");
    await new Promise((r) => setTimeout(r, 15_000));

    // 7. PageSpeed Insights (failure is non-fatal — site is live; scoring is informational)
    let psiScores: { performance: number; accessibility: number; seo: number; bestPractices: number } | null = null;
    try {
      psiScores = await runPagespeedInsights(canonicalUrl);
      logger.info("[deployer] PSI scores captured", psiScores);
    } catch (psiErr) {
      // Per spec §11.4: local Lighthouse was the build gate; PSI scoring is informational.
      // Site is live — don't fail the job just because PSI errored.
      logger.warn("[deployer] PSI scoring failed — continuing with null scores", {
        error: String(psiErr),
      });
    }

    // 8. UPDATE generated_sites
    const lighthouseScores: Record<string, number> | undefined = psiScores
      ? {
          performance: psiScores.performance,
          accessibility: psiScores.accessibility,
          seo: psiScores.seo,
          bestPractices: psiScores.bestPractices,
        }
      : undefined;

    await db.update(generatedSites)
      .set({
        cloudflareProjectName: slug,
        cloudflarePreviewUrl: canonicalUrl,
        cloudflareDeploymentId: deploymentUrl,
        ...(lighthouseScores ? { lighthouseScores } : {}),
      })
      .where(eq(generatedSites.id, generatedSiteId));

    logger.info("[deployer] updated generated_sites row", {
      generatedSiteId,
      cloudflareProjectName: slug,
      cloudflarePreviewUrl: canonicalUrl,
      cloudflareDeploymentId: deploymentUrl,
    });

    // 9. UPDATE lead status → deployed
    await db.update(leads)
      .set({ status: "deployed" })
      .where(eq(leads.id, leadId));

    logger.info("[deployer] lead status → deployed", { leadId, slug });

    // 10. Complete job
    await completeJob(db, job.id);
    logger.info("[deployer] job complete", { jobId: job.id });
  } finally {
    clearInterval(hbInterval);
  }
}
