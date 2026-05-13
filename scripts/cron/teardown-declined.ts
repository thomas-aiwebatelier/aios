/**
 * teardown-declined.ts — Task 4.10
 *
 * Scans for leads with status='declined' AND updatedAt older than 24h.
 * For each stale lead:
 *   1. Deletes the Cloudflare Pages project (idempotent — 404 handled).
 *   2. rm -rf generated-sites/<slug>/
 *   3. rm -rf data/assets/<lead-id>/  (scraped images)
 *   4. Flips lead status to 'archived' to prevent re-processing.
 *
 * CLI: pnpm tsx --env-file=.env scripts/cron/teardown-declined.ts
 */

import { eq, and, lt } from "drizzle-orm";
import { rmSync, existsSync } from "node:fs";
import path from "node:path";
import { getDb } from "../../apps/admin/lib/db.js";
import { leads } from "@atelier/db";
import { deletePagesProject } from "../../apps/admin/lib/cloudflare.js";
import { getProjectPath } from "../../apps/admin/lib/generated-sites-fs.js";
import { logger } from "../../apps/admin/lib/logger.js";

export async function tearDownDeclinedLeads(): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find all leads with status='declined' AND updated_at < cutoff
  const stale = db
    .select()
    .from(leads)
    .where(and(eq(leads.status, "declined"), lt(leads.updatedAt, cutoff)))
    .all();

  logger.info(`[teardown] ${stale.length} declined lead(s) older than 24h`, {
    cutoff: cutoff.toISOString(),
  });

  for (const lead of stale) {
    // 1. Delete CF Pages project (idempotent — deletePagesProject handles 404)
    try {
      await deletePagesProject(lead.slug);
      logger.info(`[teardown] cf project deleted: ${lead.slug}`);
    } catch (err) {
      logger.warn(`[teardown] cf project delete failed: ${lead.slug}`, { err });
      // Intentionally continue — local cleanup + status flip must still happen
    }

    // 2. rm -rf generated-sites/<slug>/
    const projectPath = getProjectPath(lead.slug);
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
      logger.info(`[teardown] local project dir removed: ${projectPath}`);
    }

    // 3. rm -rf data/assets/<lead-id>/ (scraped images)
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const assetsPath = path.join(repoRoot, "data", "assets", lead.id);
    if (existsSync(assetsPath)) {
      rmSync(assetsPath, { recursive: true, force: true });
      logger.info(`[teardown] lead assets removed: ${assetsPath}`);
    }

    // 4. Flip lead status to 'archived' so we don't re-process
    db.update(leads).set({ status: "archived" }).where(eq(leads.id, lead.id)).run();
    logger.info(`[teardown] lead archived: ${lead.id} (${lead.businessName})`);
  }

  logger.info(`[teardown] complete — ${stale.length} leads torn down`);
  return stale.length;
}

// CLI runner: pnpm tsx --env-file=.env scripts/cron/teardown-declined.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  tearDownDeclinedLeads().catch((err) => {
    logger.error("[teardown] crashed", { err });
    process.exit(1);
  });
}
