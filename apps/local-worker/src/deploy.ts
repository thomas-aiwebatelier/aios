/**
 * deploy.ts — Pipeline Step 4.3: Cloudflare Pages deploy worker.
 *
 * Ported from apps/admin/workers/deployer.ts. Deploy is co-located with
 * generation on the local-worker so the Astro `dist/` files don't need to
 * be shipped over the network to a separate runtime — they're already on
 * disk from the preceding generation job.
 *
 * Flow:
 *   1. Parse payload → { leadId, generatedSiteId }
 *   2. Load generated_sites row; derive dist/ from astroProjectPath
 *   3. Heartbeat every 30s
 *   4. Get-or-create Cloudflare Pages project (25s throttle on create)
 *   5. Deploy via wrangler subprocess → canonicalUrl + deploymentUrl
 *   6. Wait 15s for CDN propagation
 *   7. PageSpeed Insights mobile scoring (non-fatal failure per spec §11.4)
 *   8. UPDATE generated_sites with CF fields + lighthouseScores
 *   9. UPDATE leads.status → 'deployed'
 *  10. completeJob
 *
 * On any throw, the local-worker poll-loop marks the job failed.
 */

import path from "node:path";
import { eq } from "drizzle-orm";
import { generatedSites, leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { heartbeat, completeJob } from "./lib/queue.js";
import { logger } from "./logger.js";
import {
  getPagesProject,
  createPagesProject,
  deployToPages,
} from "./lib/cloudflare.js";
import { runPagespeedInsights } from "./lib/psi.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeployJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

// ── Main processor ─────────────────────────────────────────────────────────────

export async function processDeployJob(db: Db, job: DeployJob): Promise<void> {
  const rawPayload = job.payload as Record<string, unknown>;
  const leadId = rawPayload.leadId as string | undefined;
  const generatedSiteId = rawPayload.generatedSiteId as string | undefined;

  if (!leadId || !generatedSiteId) {
    throw new Error(
      `[deployer] invalid payload: expected { leadId, generatedSiteId }, got ${JSON.stringify(rawPayload)}`,
    );
  }

  logger.info("deploy_start", { jobId: job.id, leadId, generatedSiteId });

  const siteRow = ((await db
    .select()
    .from(generatedSites)
    .where(eq(generatedSites.id, generatedSiteId))
    ))[0];

  if (!siteRow) {
    throw new Error(
      `[deployer] generated_sites row not found: ${generatedSiteId}`,
    );
  }
  if (!siteRow.astroProjectPath) {
    throw new Error(
      `[deployer] generated_sites row ${generatedSiteId} has no astroProjectPath`,
    );
  }

  const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
  if (!lead) {
    throw new Error(`[deployer] lead not found: ${leadId}`);
  }

  const distPath = path.join(siteRow.astroProjectPath, "dist");
  const slug = lead.slug;

  logger.info("deploy_context_loaded", { slug, distPath });

  const hbInterval = setInterval(async () => {
    try {
      await heartbeat(db, job.id);
    } catch (err) {
      logger.warn("deploy_heartbeat_failed", { error: String(err) });
    }
  }, 30_000);

  try {
    const { exists } = await getPagesProject(slug);
    if (!exists) {
      logger.info("deploy_project_missing", { slug });
      await createPagesProject(slug);
    } else {
      logger.info("deploy_project_exists", { slug });
    }

    const { canonicalUrl, deploymentUrl } = await deployToPages(slug, distPath);

    logger.info("deploy_waiting_cdn", { ms: 15_000 });
    await new Promise((r) => setTimeout(r, 15_000));

    // PSI failure non-fatal per spec §11.4
    let psiScores:
      | {
          performance: number;
          accessibility: number;
          seo: number;
          bestPractices: number;
        }
      | null = null;
    try {
      psiScores = await runPagespeedInsights(canonicalUrl);
      logger.info("deploy_psi_ok", psiScores);
    } catch (psiErr) {
      logger.warn("deploy_psi_failed", { error: String(psiErr) });
    }

    const lighthouseScores: Record<string, number> | undefined = psiScores
      ? {
          performance: psiScores.performance,
          accessibility: psiScores.accessibility,
          seo: psiScores.seo,
          bestPractices: psiScores.bestPractices,
        }
      : undefined;

    await db
      .update(generatedSites)
      .set({
        cloudflareProjectName: slug,
        cloudflarePreviewUrl: canonicalUrl,
        cloudflareDeploymentId: deploymentUrl,
        ...(lighthouseScores ? { lighthouseScores } : {}),
      })
      .where(eq(generatedSites.id, generatedSiteId));

    logger.info("deploy_site_updated", {
      generatedSiteId,
      slug,
      canonicalUrl,
      deploymentUrl,
    });

    await db
      .update(leads)
      .set({ status: "deployed" })
      .where(eq(leads.id, leadId));

    logger.info("deploy_lead_updated", { leadId, slug });

    await completeJob(db, job.id);
    logger.info("deploy_done", { jobId: job.id });
  } finally {
    clearInterval(hbInterval);
  }
}
