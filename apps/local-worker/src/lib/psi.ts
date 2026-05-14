/**
 * psi.ts — PageSpeed Insights API wrapper.
 *
 * Ported from apps/admin/lib/psi.ts. Calls the v5 API with mobile strategy
 * and returns 0-100 rounded scores. Per spec §11.4 PSI failure is
 * non-fatal — the site is already live; scoring is informational.
 */

import { logger } from "../logger.js";

function getPsiKey(): string {
  const v = process.env.PSI_API_KEY;
  if (!v) throw new Error("PSI_API_KEY is not set");
  return v;
}

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

  logger.info("psi_request", { url });

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

  logger.info("psi_scores", scores as unknown as Record<string, unknown>);
  return scores;
}
