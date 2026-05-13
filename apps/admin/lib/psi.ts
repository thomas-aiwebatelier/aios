/**
 * psi.ts — PageSpeed Insights API wrapper.
 *
 * Calls the PSI v5 API with mobile strategy and returns rounded 0-100 scores
 * for performance, accessibility, SEO, and best-practices.
 *
 * Same fetch pattern as scripts/smoke-test.ts.
 */

import { logger } from "./logger.js";

// ── Env accessor (lazy — checked at call time, not import time) ────────────────

function getPsiKey(): string {
  const v = process.env.PSI_API_KEY;
  if (!v) throw new Error("PSI_API_KEY is not set");
  return v;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PsiScores {
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
}

interface PsiResponse {
  lighthouseResult?: {
    categories?: {
      performance?: { score?: number | null };
      accessibility?: { score?: number | null };
      seo?: { score?: number | null };
      "best-practices"?: { score?: number | null };
    };
  };
  error?: { message?: string };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run PageSpeed Insights (mobile) against `url` and return rounded scores.
 *
 * Throws if:
 *  - PSI_API_KEY is missing
 *  - The API returns a non-2xx status
 *  - The response shape is unrecognisable
 *
 * Returns null scores (0) for individual categories if PSI omits them.
 */
export async function runPagespeedInsights(url: string): Promise<PsiScores> {
  const encoded = encodeURIComponent(url);
  const categories = [
    "category=performance",
    "category=accessibility",
    "category=seo",
    "category=best-practices",
  ].join("&");

  const apiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encoded}&key=${getPsiKey()}&strategy=mobile&${categories}`;

  logger.info(`[psi] running PageSpeed Insights for ${url}`);

  const res = await fetch(apiUrl);

  if (!res.ok) {
    const text = await res.text().catch(() => "(unreadable body)");
    throw new Error(`[psi] PSI API returned ${res.status}: ${text}`);
  }

  const data = (await res.json()) as PsiResponse;

  if (data.error) {
    throw new Error(`[psi] PSI API error: ${data.error.message ?? "unknown"}`);
  }

  const cats = data.lighthouseResult?.categories;
  if (!cats) {
    throw new Error("[psi] PSI response missing lighthouseResult.categories");
  }

  const round = (v: number | null | undefined) =>
    v != null ? Math.round(v * 100) : 0;

  const scores: PsiScores = {
    performance: round(cats.performance?.score),
    accessibility: round(cats.accessibility?.score),
    seo: round(cats.seo?.score),
    bestPractices: round(cats["best-practices"]?.score),
  };

  logger.info("[psi] scores", scores);
  return scores;
}
