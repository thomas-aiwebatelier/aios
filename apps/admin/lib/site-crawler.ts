/**
 * site-crawler.ts — shared crawl helpers for research-crawl (Task 3.4)
 * and research-competitor (Task 3.5).
 *
 * Exports:
 *   discoverPages(browser, url, maxPages) — sitemap or link-discovery
 *   crawlPage(browser, pageUrl, leadId, slug) — nav + screenshot + claude parse
 *   extractPageText(html) — strips nav/footer, targets ~800 chars of main copy
 */

import path from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { Browser } from "playwright";
import { logger } from "./logger.js";
import { runClaudeCode } from "./claude-code.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root is 3 levels up from apps/admin/lib/
const REPO_ROOT = path.resolve(__dirname, "../../..");

// ── Structured page shape (matches spec §11.2 crawl prompt) ──────────────────

export interface PageSection {
  heading: string;
  body: string;
}

export interface PageImage {
  src: string;
  alt: string;
}

export interface PageCta {
  text: string;
  intent: string;
}

export interface PageForm {
  fields: string[];
  intent: string;
}

export interface StructuredPage {
  url: string;
  title: string;
  meta_description: string;
  sections: PageSection[];
  images: PageImage[];
  ctas: PageCta[];
  forms: PageForm[];
  language: "nl" | "fr" | "mixed" | "other";
}

// ── Directory helpers ─────────────────────────────────────────────────────────

export function ensureAssetDir(leadId: string, subdir: string): string {
  const dir = path.join(REPO_ROOT, "data", "assets", leadId, subdir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ── URL slug helper ───────────────────────────────────────────────────────────

export function urlToSlug(pageUrl: string): string {
  try {
    const u = new URL(pageUrl);
    const slug = (u.pathname + u.search)
      .replace(/[^a-z0-9]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60);
    return slug || "home";
  } catch {
    return createHash("sha256").update(pageUrl).digest("hex").slice(0, 12);
  }
}

// ── Sitemap discovery ─────────────────────────────────────────────────────────

/**
 * Try fetching <baseUrl>/sitemap.xml. Extract all <loc> URLs via regex.
 * Returns [] if not found or unparseable.
 */
export async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const sitemapUrl = baseUrl.replace(/\/$/, "") + "/sitemap.xml";
  try {
    const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const xml = await res.text();
    // Extract all <loc>...</loc> values — no XML library needed
    const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/gi)];
    return matches.map((m) => m[1].trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// ── Link discovery via Playwright ─────────────────────────────────────────────

/**
 * Navigate to baseUrl with Playwright, collect all same-origin <a> hrefs.
 * Returns deduped absolute URLs.
 */
export async function discoverLinksFromHome(
  browser: Browser,
  baseUrl: string,
): Promise<string[]> {
  let origin: string;
  try {
    origin = new URL(baseUrl).origin;
  } catch {
    return [];
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(baseUrl, { timeout: 20_000, waitUntil: "domcontentloaded" });
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("a[href]")).map(
        (a) => (a as HTMLAnchorElement).href,
      ),
    );
    const same = hrefs.filter((h) => {
      try {
        return new URL(h).origin === origin;
      } catch {
        return false;
      }
    });
    // Dedup
    return [...new Set([baseUrl, ...same])];
  } catch (err) {
    logger.warn("[site-crawler] link discovery failed", { baseUrl, error: String(err) });
    return [baseUrl];
  } finally {
    await ctx.close();
  }
}

/**
 * Combine sitemap + link discovery, cap at maxPages.
 * Sitemap preferred; falls back to link discovery if sitemap < 5 URLs.
 */
export async function discoverPages(
  browser: Browser,
  baseUrl: string,
  maxPages: number,
): Promise<string[]> {
  const sitemapUrls = await fetchSitemapUrls(baseUrl);
  if (sitemapUrls.length >= 5) {
    return sitemapUrls.slice(0, maxPages);
  }
  const discovered = await discoverLinksFromHome(browser, baseUrl);
  return discovered.slice(0, maxPages);
}

// ── Per-page crawl ────────────────────────────────────────────────────────────

const PAGE_STRUCT_PROMPT = `You're parsing a webpage from a Belgian SMB. Output a strict JSON object with this shape (no markdown, no preamble):
{ "url": "", "title": "", "meta_description": "", "sections": [{ "heading": "", "body": "" }], "images": [{ "src": "", "alt": "" }], "ctas": [{ "text": "", "intent": "" }], "forms": [{ "fields": [], "intent": "" }], "language": "nl" }

Language must be one of: "nl", "fr", "mixed", "other".

PRESERVE body copy verbatim in sections[].body — do not summarize, paraphrase, translate, or rewrite. This text feeds into website replication. Keep original Dutch/French/dialect/typos as-is.

Identify CTAs by their action verb (boek/koop/contact/bel/email/etc). Forms by <form> tags.

Here is the page HTML (truncated to 12000 chars):
`;

/**
 * Navigate a single page with Playwright, optionally take a screenshot,
 * then parse its structure with Claude.
 *
 * @param browser     Shared browser instance
 * @param pageUrl     URL to navigate to
 * @param screenshotDir Directory to save screenshot (null = skip screenshot)
 * @param slug        Filename slug for screenshot
 * @returns StructuredPage or null if nav/parse failed
 */
export async function crawlPage(
  browser: Browser,
  pageUrl: string,
  screenshotDir: string | null,
  slug: string,
): Promise<StructuredPage | null> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(pageUrl, { timeout: 20_000, waitUntil: "domcontentloaded" });

    // Get HTML for claude
    const html = await page.content();
    const truncated = html.slice(0, 12_000);

    // Screenshot (optional — skip for competitor crawl)
    if (screenshotDir) {
      const screenshotPath = path.join(screenshotDir, `${slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
    }

    // Parse with claude
    const prompt = PAGE_STRUCT_PROMPT + truncated;
    const raw = await runClaudeCode(prompt, {
      args: ["--model", "claude-haiku-4-5"],
      timeoutMs: 5 * 60 * 1000,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("[site-crawler] claude returned no JSON", {
        url: pageUrl,
        raw: raw.slice(0, 200),
      });
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as StructuredPage;
    // Ensure url is set
    if (!parsed.url) parsed.url = pageUrl;
    return parsed;
  } catch (err) {
    logger.warn("[site-crawler] page crawl failed", {
      url: pageUrl,
      error: String(err),
    });
    return null;
  } finally {
    await ctx.close();
  }
}

// ── Visible text extraction (for tone-of-voice) ───────────────────────────────

/**
 * Extract ~800 chars of visible homepage copy: h1-h6 + main + first 2 paragraphs.
 * Strips nav/footer. Returns plain text.
 */
export function extractPageText(html: string): string {
  // Strip nav, footer, header, script, style blocks
  const stripped = html
    .replace(/<(nav|footer|header|script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return stripped.slice(0, 800);
}

// ── Image extraction ──────────────────────────────────────────────────────────

/**
 * Extract all img src + CSS background-image URLs from a page's HTML.
 * Skips data: URLs and SVGs. Returns absolute URLs relative to baseUrl.
 */
export function extractImageUrls(
  html: string,
  baseUrl: string,
  type: "img" | "background",
): Array<{ src: string; alt: string; type: "img" | "background" }> {
  const results: Array<{ src: string; alt: string; type: "img" | "background" }> = [];

  if (type === "img") {
    const imgMatches = [...html.matchAll(/<img([^>]*)>/gi)];
    for (const m of imgMatches) {
      const attrs = m[1];
      const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      if (!srcMatch) continue;
      const src = srcMatch[1];
      if (src.startsWith("data:") || src.endsWith(".svg")) continue;
      try {
        const absUrl = new URL(src, baseUrl).href;
        results.push({ src: absUrl, alt: altMatch?.[1] ?? "", type: "img" });
      } catch {
        // skip invalid URLs
      }
    }
  } else {
    const bgMatches = [...html.matchAll(/background-image:\s*url\(["']?([^"')]+)["']?\)/gi)];
    for (const m of bgMatches) {
      const src = m[1].trim();
      if (src.startsWith("data:") || src.endsWith(".svg")) continue;
      try {
        const absUrl = new URL(src, baseUrl).href;
        results.push({ src: absUrl, alt: "", type: "background" });
      } catch {
        // skip invalid URLs
      }
    }
  }
  return results;
}
