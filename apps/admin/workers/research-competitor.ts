/**
 * research-competitor.ts — Task 3.5: Competitor research.
 *
 * Uses Claude to suggest and pick a competitor, lightly crawls it (up to 10
 * pages, no image downloads), generates learnings in Dutch, and persists a
 * competitors row.
 *
 * Replication vs greenfield interaction (spec §7):
 *   - hasSiteInventory = true  → lead has existing site (replication mode)
 *     learnings are ADVISORY ONLY; the generation pipeline may de-prioritize them
 *   - hasSiteInventory = false → greenfield; learnings directly inform page structure
 * The prompt below works for both cases — the generation pipeline (Task 4.1)
 * interprets the learnings field differently depending on createdVia context.
 *
 * Called by research.ts orchestrator.
 */

import { nanoid } from "nanoid";
import { competitors } from "@atelier/db";
import type { Db } from "@atelier/db";
import { getBrowser } from "../lib/playwright-pool.js";
import { discoverPages, crawlPage, urlToSlug } from "../lib/site-crawler.js";
import { runClaudeCode } from "../lib/claude-code.js";
import { logger } from "../lib/logger.js";

const MAX_COMPETITOR_PAGES = 10;

// ── Claude prompts ─────────────────────────────────────────────────────────────

function buildSuggestPrompt(
  businessName: string,
  industryKey: string,
  city: string,
): string {
  return (
    `You're a Belgian SMB scout. The lead is "${businessName}", ` +
    `a ${industryKey} in ${city}. ` +
    `List 3 direct local competitors with their website URLs. ` +
    `Output JSON only, no markdown, no preamble:\n` +
    `[{ "name": "...", "websiteUrl": "https://...", "reason": "..." }]\n` +
    `Prefer competitors with well-designed websites we can learn from. ` +
    `Real competitors only — no inventing. Belgian businesses preferred.`
  );
}

function buildPickPrompt(
  candidates: Array<{ name: string; websiteUrl: string; reason: string }>,
  businessName: string,
  industryKey: string,
): string {
  return (
    `Given these 3 competitors for "${businessName}" (industry: ${industryKey}), ` +
    `pick the one whose website would teach us the most about good design for this industry.\n` +
    `Candidates:\n${JSON.stringify(candidates, null, 2)}\n\n` +
    `Output JSON only: { "index": 0, "reason": "..." }\n` +
    `index is 0, 1, or 2.`
  );
}

function buildLearningsPrompt(
  competitorName: string,
  leadName: string,
  pages: Array<{ url: string; title: string; sections?: string[] }>,
): string {
  const pagesSummary = pages
    .slice(0, 5)
    .map((p) => `- ${p.title} (${p.url}): ${(p.sections ?? []).join(" ").slice(0, 200)}`)
    .join("\n");

  return (
    `Given this competitor site structure for "${competitorName}", write 3 short Dutch sentences ` +
    `describing what this site does well that "${leadName}" could learn from.\n\n` +
    `Pages found:\n${pagesSummary}\n\n` +
    `Output the sentences plain — no preamble, no numbering, just the 3 sentences separated by newlines.`
  );
}

// ── JSON extraction helper ─────────────────────────────────────────────────────

function extractJson<T>(raw: string): T | null {
  const match = raw.match(/[\[{][\s\S]*[\]}]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function researchCompetitor(
  db: Db,
  leadId: string,
  businessName: string,
  city: string,
  industryKey: string,
  hasSiteInventory: boolean,
): Promise<void> {
  logger.info("[research-competitor] starting", {
    leadId,
    businessName,
    city,
    industryKey,
    hasSiteInventory,
  });

  // ── Step 1: Suggest 3 candidates ──────────────────────────────────────────
  let candidates: Array<{ name: string; websiteUrl: string; reason: string }> = [];

  try {
    const suggestRaw = await runClaudeCode(
      buildSuggestPrompt(businessName, industryKey, city),
      { args: ["--model", "claude-haiku-4-5"], timeoutMs: 5 * 60 * 1000 },
    );
    const parsed = extractJson<typeof candidates>(suggestRaw);
    if (parsed && Array.isArray(parsed)) {
      candidates = parsed.filter(
        (c) => c.name && c.websiteUrl && c.websiteUrl.startsWith("http"),
      );
    }
  } catch (err) {
    logger.warn("[research-competitor] suggest step failed", { error: String(err) });
  }

  if (candidates.length === 0) {
    logger.warn("[research-competitor] no valid candidates — inserting fallback row", { leadId });
    await db.insert(competitors)
      .values({
        id: nanoid(),
        leadId,
        competitorUrl: "none",
        competitorName: null,
        selectionReason: "no competitor identified",
        structureSummary: null,
        learnings: "no competitor identified",
      });
    return;
  }

  // ── Step 2: Pick the top 1 ─────────────────────────────────────────────────
  let pickedIndex = 0;
  let selectionReason = candidates[0].reason ?? "top suggestion";

  if (candidates.length > 1) {
    try {
      const pickRaw = await runClaudeCode(
        buildPickPrompt(candidates, businessName, industryKey),
        { args: ["--model", "claude-haiku-4-5"], timeoutMs: 3 * 60 * 1000 },
      );
      const picked = extractJson<{ index: number; reason: string }>(pickRaw);
      if (picked && typeof picked.index === "number") {
        pickedIndex = Math.min(Math.max(0, picked.index), candidates.length - 1);
        selectionReason = picked.reason ?? selectionReason;
      }
    } catch (err) {
      logger.warn("[research-competitor] pick step failed — using first candidate", {
        error: String(err),
      });
    }
  }

  const picked = candidates[pickedIndex];
  logger.info("[research-competitor] picked competitor", {
    leadId,
    name: picked.name,
    url: picked.websiteUrl,
    reason: selectionReason,
  });

  // ── Step 3: Light crawl (up to 10 pages, no image downloads) ──────────────
  const browser = await getBrowser();
  const crawledPages: Array<{ url: string; title: string; sections?: string[] }> = [];

  try {
    const pageUrls = await discoverPages(browser, picked.websiteUrl, MAX_COMPETITOR_PAGES);

    for (const pageUrl of pageUrls) {
      try {
        const slug = urlToSlug(pageUrl);
        // Pass null for screenshotDir — competitor crawl skips screenshots
        const structured = await crawlPage(browser, pageUrl, null, slug);
        if (!structured) continue;
        crawledPages.push({
          url: structured.url,
          title: structured.title,
          sections: structured.sections?.map((s) => `${s.heading}\n${s.body}`),
        });
      } catch (err) {
        logger.warn("[research-competitor] competitor page failed", {
          pageUrl,
          error: String(err),
        });
      }
    }
  } catch (err) {
    logger.warn("[research-competitor] competitor crawl failed", {
      url: picked.websiteUrl,
      error: String(err),
    });
  }

  // ── Step 4: Generate learnings ─────────────────────────────────────────────
  let learnings = "no learnings extracted";

  try {
    const learningsRaw = await runClaudeCode(
      buildLearningsPrompt(picked.name, businessName, crawledPages),
      { args: ["--model", "claude-haiku-4-5"], timeoutMs: 5 * 60 * 1000 },
    );
    learnings = learningsRaw.trim();
  } catch (err) {
    logger.warn("[research-competitor] learnings step failed", { error: String(err) });
  }

  // ── Persist competitors row ────────────────────────────────────────────────
  const structureSummary: Record<string, unknown> = {
    pageCount: crawledPages.length,
    pages: crawledPages.map((p) => ({ url: p.url, title: p.title })),
  };

  await db.insert(competitors)
    .values({
      id: nanoid(),
      leadId,
      competitorUrl: picked.websiteUrl,
      competitorName: picked.name,
      selectionReason,
      structureSummary,
      learnings,
    });

  logger.info("[research-competitor] done", {
    leadId,
    competitorName: picked.name,
    pageCount: crawledPages.length,
    learnings: learnings.slice(0, 100),
  });
}
