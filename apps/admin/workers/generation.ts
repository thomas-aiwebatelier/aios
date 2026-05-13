/**
 * generation.ts — Pipeline Step 4.1: AI site generation worker.
 *
 * Processes 'generation' jobs from pipeline_jobs.
 *
 * Flow per job:
 *   1. loadContext  — query lead, brand_profile, site_inventory, competitor
 *   2. buildPromptBundle — compose big prompt from context + skill files
 *   3. resetProjectDir — clean slate for each attempt
 *   4. runClaudeCode — spawn claude CLI with cwd = project dir
 *   5. runBuildAndChecks — pnpm install → astro check → astro build → quality-checks
 *   6. Two-strikes retry (spec §6.1.5)
 *   7. Insert generated_sites row, flip lead status, enqueue deploy job
 *
 * On success: lead.status → 'generated'
 * On final failure: lead.status → 'generation_failed'
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { eq, desc, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  leads,
  brandProfiles,
  siteInventories,
  competitors,
  generatedSites,
} from "@atelier/db";
import type { Db } from "@atelier/db";
import { heartbeat, enqueue } from "../lib/queue.js";
import { runClaudeCode } from "../lib/claude-code.js";
import { logger } from "../lib/logger.js";
import { resetProjectDir } from "../lib/generated-sites-fs.js";
import { runQualityChecks } from "../../../skills/atelier-design-system/quality-checks.js";

// ── Job type (matches runner contract) ───────────────────────────────────────

export interface GenerationJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

// ── Context ──────────────────────────────────────────────────────────────────

interface GenerationContext {
  lead: {
    id: string;
    slug: string;
    businessName: string;
    city: string;
    industryKey: string;
    language: string | null;
    existingWebsiteUrl: string | null;
    [key: string]: unknown;
  };
  brandProfile: Record<string, unknown> | null;
  siteInventory: Record<string, unknown> | null;
  competitor: Record<string, unknown> | null;
}

async function loadContext(db: Db, leadId: string): Promise<GenerationContext> {
  const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
  if (!lead) throw new Error(`[generation] lead not found: ${leadId}`);

  const brandProfile =
    ((await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.leadId, leadId))
      .limit(1)
      ))[0] ?? null;

  const siteInventory =
    ((await db
      .select()
      .from(siteInventories)
      .where(eq(siteInventories.leadId, leadId))
      .orderBy(desc(siteInventories.crawledAt))
      .limit(1)
      ))[0] ?? null;

  const competitor =
    ((await db
      .select()
      .from(competitors)
      .where(eq(competitors.leadId, leadId))
      .limit(1)
      ))[0] ?? null;

  return { lead, brandProfile, siteInventory, competitor };
}

// ── Repo-root helper (mirrors generated-sites-fs.ts) ─────────────────────────

function repoRoot(): string {
  return path.resolve(process.cwd(), "..", "..");
}

// ── Prompt builder ───────────────────────────────────────────────────────────

function readSkillFile(relPath: string): string {
  try {
    return readFileSync(path.join(repoRoot(), relPath), "utf8");
  } catch {
    logger.warn(`[generation] skill file not found: ${relPath}`);
    return `<!-- file not found: ${relPath} -->`;
  }
}

function industryReadable(key: string): string {
  return key.replace(/-/g, " ");
}

function buildPromptBundle(
  ctx: GenerationContext,
  industryGuideContent: string,
  failureFeedback?: string,
): string {
  const { lead, brandProfile, siteInventory, competitor } = ctx;

  const generationPrompt = readSkillFile(
    "skills/atelier-design-system/generation-prompt.md",
  );

  const lines: string[] = [
    `# Site Generation — ${lead.businessName}`,
    "",
    `You are generating an Astro 5+ site for **${lead.businessName}**, a ${industryReadable(lead.industryKey)} in ${lead.city}, Belgium.`,
    "",
    "---",
    "",
    "## Design System Instructions",
    "",
    generationPrompt,
    "",
    "---",
    "",
    "## Industry Style Guide",
    "",
    industryGuideContent,
    "",
    "---",
    "",
    "## Lead Data",
    "",
    "```json",
    JSON.stringify(lead, null, 2),
    "```",
    "",
    "## Brand Profile",
    "",
    "```json",
    JSON.stringify(brandProfile, null, 2),
    "```",
    "",
    "## Site Inventory (existing site crawl)",
    "",
    "```json",
    JSON.stringify(siteInventory, null, 2),
    "```",
    "",
    "## Top Competitor",
    "",
    "```json",
    JSON.stringify(competitor, null, 2),
    "```",
    "",
    "---",
    "",
    "## Reference Files",
    "",
    "Also read these files from disk as exemplars:",
    "- skills/atelier-design-system/SYSTEM.md",
    "- skills/atelier-design-system/tokens.css",
    "- skills/atelier-design-system/reference-sites/bakery-example/",
    "",
  ];

  if (failureFeedback) {
    lines.push("---", "", "## Previous Attempt Failure", "");
    lines.push(
      `Previous attempt failed:\n\n${failureFeedback}\n\nFix only the cause of this failure. Do not refactor unrelated code.`,
    );
    lines.push("");
  }

  lines.push(
    "---",
    "",
    "## Output Instruction",
    "",
    "Write a complete Astro 5+ project to the current working directory. After you finish, exit.",
    "",
  );

  return lines.join("\n");
}

// ── Build + quality checks ───────────────────────────────────────────────────

class BuildStepError extends Error {
  step: string;
  output: string;

  constructor(step: string, output: string, cause?: unknown) {
    const causeMsg = cause instanceof Error ? cause.message : String(cause);
    super(`Build step '${step}' failed: ${causeMsg}`);
    this.step = step;
    this.output = output;
  }
}

async function runBuildAndChecks(projectPath: string): Promise<void> {
  const execOpts = { cwd: projectPath, stdio: "pipe" as const };

  // 1. pnpm install
  let installOutput = "";
  try {
    installOutput = execSync(
      "pnpm install --ignore-workspace --frozen-lockfile=false",
      { ...execOpts, timeout: 300_000 },
    ).toString();
  } catch (err) {
    const out = err instanceof Error && "stdout" in err
      ? String((err as NodeJS.ErrnoException & { stdout?: Buffer }).stdout ?? "")
      : installOutput;
    throw new BuildStepError("pnpm install", out, err);
  }

  // 2. astro check
  let checkOutput = "";
  try {
    checkOutput = execSync("pnpm exec astro check", {
      ...execOpts,
      timeout: 120_000,
    }).toString();
  } catch (err) {
    const out = err instanceof Error && "stdout" in err
      ? String((err as NodeJS.ErrnoException & { stdout?: Buffer }).stdout ?? "")
      : checkOutput;
    throw new BuildStepError("astro check", out, err);
  }

  // 3. astro build
  let buildOutput = "";
  try {
    buildOutput = execSync("pnpm exec astro build", {
      ...execOpts,
      timeout: 180_000,
    }).toString();
  } catch (err) {
    const out = err instanceof Error && "stdout" in err
      ? String((err as NodeJS.ErrnoException & { stdout?: Buffer }).stdout ?? "")
      : buildOutput;
    throw new BuildStepError("astro build", out, err);
  }

  // 4. quality checks
  const qcResult = await runQualityChecks(projectPath, {
    skipLighthouse: true,
    onProgress: (msg) => logger.info(`[generation] quality-checks: ${msg}`),
  });
  if (!qcResult.ok) {
    throw new BuildStepError(
      "quality-checks",
      qcResult.failures.join("\n"),
      new Error(qcResult.failures.join("; ")),
    );
  }
}

// ── Row helpers ──────────────────────────────────────────────────────────────

async function getNextVersion(db: Db, leadId: string): Promise<number> {
  const result = ((await db
    .select({ maxVersion: max(generatedSites.version) })
    .from(generatedSites)
    .where(eq(generatedSites.leadId, leadId))
    ))[0];
  return (result?.maxVersion ?? 0) + 1;
}

async function insertGeneratedSiteRow(
  db: Db,
  ctx: GenerationContext,
  projectPath: string,
  version: number,
  lighthouseScores: Record<string, number> | null,
): Promise<string> {
  const id = nanoid();
  await db.insert(generatedSites)
    .values({
      id,
      leadId: ctx.lead.id,
      version,
      astroProjectPath: projectPath,
      lighthouseScores: lighthouseScores ?? undefined,
      createdVia: "initial_generation",
    });
  return id;
}

// ── Main processor ───────────────────────────────────────────────────────────

export async function processGenerationJob(db: Db, job: GenerationJob): Promise<void> {
  const { leadId } = job.payload as { leadId: string };

  // Heartbeat every 30s — generation can take 10-30 min
  const hbInterval = setInterval(async () => {
    try {
      await heartbeat(db, job.id);
    } catch (err) {
      logger.warn("[generation] heartbeat failed", { error: String(err) });
    }
  }, 30_000);

  try {
    logger.info("[generation] starting job", { jobId: job.id, leadId });

    // 1. Load context
    const ctx = await loadContext(db, leadId);
    logger.info("[generation] context loaded", {
      lead: ctx.lead.slug,
      hasBrand: !!ctx.brandProfile,
      hasInventory: !!ctx.siteInventory,
      hasCompetitor: !!ctx.competitor,
    });

    // 2. Load industry guide
    const industryGuideContent = readSkillFile(
      `skills/industry-style-guides/${ctx.lead.industryKey}.md`,
    );

    // 3. Flip lead to 'generating'
    await db.update(leads)
      .set({ status: "generating" })
      .where(eq(leads.id, ctx.lead.id));

    // 4. Two-strikes retry
    const version = await getNextVersion(db, leadId);
    let attempt = 1;
    let lastFailure: string | null = null;

    for (; attempt <= 2; attempt++) {
      logger.info(`[generation] attempt ${attempt}/2`, { slug: ctx.lead.slug });

      const projectPath = resetProjectDir(ctx.lead.slug);
      const bundle = buildPromptBundle(
        ctx,
        industryGuideContent,
        lastFailure ?? undefined,
      );

      logger.info("[generation] prompt bundle ready", {
        sizeBytes: bundle.length,
        preview: bundle.slice(0, 300),
      });

      await runClaudeCode(bundle, {
        args: ["--dangerously-skip-permissions", "--cwd", projectPath],
        timeoutMs: 30 * 60 * 1000,
      });

      try {
        await runBuildAndChecks(projectPath);
        // Success on this attempt
        logger.info(`[generation] attempt ${attempt} succeeded`, {
          slug: ctx.lead.slug,
        });

        // Insert generated_sites row
        const siteId = await insertGeneratedSiteRow(db, ctx, projectPath, version, null);

        // Flip lead status
        await db.update(leads)
          .set({ status: "generated" })
          .where(eq(leads.id, ctx.lead.id));

        // Enqueue deploy job
        await enqueue(db, {
          leadId: ctx.lead.id,
          step: "deploy",
          payload: { leadId: ctx.lead.id, generatedSiteId: siteId },
        });

        logger.info("[generation] job complete — deploy job enqueued", {
          slug: ctx.lead.slug,
          siteId,
          version,
        });
        return;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errOutput = err instanceof BuildStepError ? err.output : "";
        lastFailure = `(attempt ${attempt}) ${errMsg}\n${errOutput}`.slice(0, 4000);
        logger.warn(`[generation] attempt ${attempt} failed`, {
          slug: ctx.lead.slug,
          error: errMsg,
          step: err instanceof BuildStepError ? err.step : "unknown",
        });

        if (attempt === 2) {
          // Both attempts failed — record the failure
          await db.update(leads)
            .set({ status: "generation_failed" })
            .where(eq(leads.id, ctx.lead.id));

          await insertGeneratedSiteRow(db, ctx, projectPath, version, null);

          logger.error("[generation] both attempts failed — lead marked generation_failed", {
            slug: ctx.lead.slug,
            leadId: ctx.lead.id,
          });

          throw err; // runner converts to failJob
        }
        // else: loop continues with attempt 2
      }
    }
  } finally {
    clearInterval(hbInterval);
  }
}
