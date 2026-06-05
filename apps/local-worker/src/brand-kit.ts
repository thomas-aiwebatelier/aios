/**
 * brand-kit.ts — processor for the `brand-kit` pipeline step (self-serve AI
 * Marketing brand identification).
 *
 * Renders the brand's source URL, extracts brand signals (palette via
 * node-vibrant, fonts/social via DOM, tone/positioning/audience/products via
 * the Claude CLI — same primitives as the lead-gen `research` job), renders the
 * three brand-kit markdown files via @atelier/db's pure `renderBrandKit`, and
 * writes them to `brand_kit_files`, flipping `brands.status` queued → scraping
 * → generating → ready (or failed).
 *
 * The Claude call goes through `runClaudeCode` (the `claude` CLI). Locally that
 * uses the operator's Max-plan auth — no API key. For a deployed worker, swap
 * `extractWithClaude` to OpenRouter (OpenAI-compatible, OPENROUTER_API_KEY)
 * behind the same interface — the processor logic stays identical.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  brands,
  brandKitFiles,
  brandKitAssets,
  renderBrandKit,
  type Db,
  type BrandSignals,
} from "@atelier/db";

type BrandKitAssetRole = "logo" | "product" | "hero" | "other";
import { logger } from "./logger.js";
import { getBrowser } from "./lib/playwright-pool.js";
import { generateText } from "./lib/llm.js";
import { assertPublicUrl } from "./lib/url-guard.js";

type BrandKitPayload = { brandId?: string; url?: string; product?: string };

export async function processBrandKitJob(
  db: Db,
  job: { id: string; payload: unknown; leadId: string | null },
): Promise<void> {
  const payload = (job.payload ?? {}) as BrandKitPayload;
  const brandId = payload.brandId;
  if (!brandId) throw new Error("brand-kit job is missing payload.brandId");

  const row = (await db.select().from(brands).where(eq(brands.id, brandId)))[0];
  if (!row) throw new Error(`brand not found: ${brandId}`);
  const url = row.sourceUrl;

  try {
    await db.update(brands).set({ status: "scraping" }).where(eq(brands.id, brandId));
    logger.info("brandkit_scrape_start", { brandId, url });

    const { signals, assets } = await extractBrandSignals(url);

    await db
      .update(brands)
      .set({ status: "generating", extractedSignals: signals })
      .where(eq(brands.id, brandId));

    const files = renderBrandKit(signals, {
      brandName: hostnameToName(url),
      sourceUrl: url,
    });

    // Regenerate cleanly: replace any existing files for this brand.
    await db.delete(brandKitFiles).where(eq(brandKitFiles.brandId, brandId));
    if (files.length > 0) {
      await db.insert(brandKitFiles).values(
        files.map((f) => ({ id: nanoid(), brandId, type: f.type, content: f.content })),
      );
    }

    // Replace scraped assets (logo / hero / visuals lifted from the site).
    // Uploaded assets (source = 'uploaded') are kept — only re-scrape the rest.
    await db
      .delete(brandKitAssets)
      .where(
        and(eq(brandKitAssets.brandId, brandId), eq(brandKitAssets.source, "scraped")),
      );
    // We reference each asset at its source URL (no Storage upload yet);
    // storage_path is NOT NULL, so it holds the resolvable URL too.
    if (assets.length > 0) {
      await db.insert(brandKitAssets).values(
        assets.map((a) => ({
          id: nanoid(),
          brandId,
          role: a.role,
          source: "scraped" as const,
          storagePath: a.url,
          originalUrl: a.url,
        })),
      );
    }
    logger.info("brandkit_assets_saved", { brandId, count: assets.length });

    await db
      .update(brands)
      .set({ status: "ready", errorMessage: null })
      .where(eq(brands.id, brandId));
    logger.info("brandkit_ready", { brandId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(brands)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(brands.id, brandId));
    throw err; // let the poll loop mark the job failed
  }
}

// ── extraction ────────────────────────────────────────────────────────────────

type ScrapedAsset = { role: BrandKitAssetRole; url: string };

async function extractBrandSignals(
  url: string,
): Promise<{ signals: BrandSignals; assets: ScrapedAsset[] }> {
  // SSRF guard: resolve DNS and reject private/internal targets before we fetch.
  await assertPublicUrl(url);

  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    // Give client-rendered (SPA) sites a moment to hydrate.
    await page.waitForTimeout(1_500);

    // NOTE: no named inner functions inside page.evaluate — esbuild (via tsx)
    // name-wraps them with __name, which is undefined in the browser context.
    const fonts = await page.evaluate(() => {
      const headingEl = document.querySelector("h1, h2") || document.body;
      const rawHeading = getComputedStyle(headingEl).fontFamily || "";
      const rawBody = getComputedStyle(document.body).fontFamily || "";
      return {
        heading: rawHeading.split(",")[0].replace(/["']/g, "").trim(),
        body: rawBody.split(",")[0].replace(/["']/g, "").trim(),
      };
    });

    const socialLinks = await page.evaluate(() => {
      const platforms = [
        "facebook.com",
        "instagram.com",
        "linkedin.com",
        "tiktok.com",
        "youtube.com",
      ];
      const out: Record<string, string> = {};
      for (const a of Array.from(document.querySelectorAll("a[href]"))) {
        const href = (a as HTMLAnchorElement).href;
        for (const p of platforms) {
          const key = p.replace(".com", "");
          if (href.includes(p) && !out[key]) out[key] = href;
        }
      }
      return out;
    });

    // Raw image/logo candidates. NOTE: no named inner functions inside
    // page.evaluate (esbuild's __name wrapper is undefined in the browser) —
    // gather raw strings here, resolve/dedupe/classify in Node below.
    const rawAssets = await page.evaluate(() => {
      const out: { kind: string; src: string; isLogo: boolean; area: number }[] = [];
      for (const img of Array.from(document.querySelectorAll("img"))) {
        const el = img as HTMLImageElement;
        const src = el.currentSrc || el.src || "";
        if (!src) continue;
        const cls = typeof el.className === "string" ? el.className : "";
        const hay = ((el.getAttribute("alt") || "") + " " + cls + " " + src).toLowerCase();
        const w = el.naturalWidth || el.width || 0;
        const h = el.naturalHeight || el.height || 0;
        out.push({ kind: "img", src, isLogo: hay.includes("logo"), area: w * h });
      }
      const og =
        document.querySelector('meta[property="og:image"]') ||
        document.querySelector('meta[name="og:image"]');
      if (og) {
        const c = og.getAttribute("content") || "";
        if (c) out.push({ kind: "og", src: c, isLogo: false, area: 0 });
      }
      const icon =
        document.querySelector('link[rel="apple-touch-icon"]') ||
        document.querySelector('link[rel="icon"]') ||
        document.querySelector('link[rel="shortcut icon"]');
      if (icon) {
        const href = (icon as HTMLLinkElement).href || icon.getAttribute("href") || "";
        if (href) out.push({ kind: "icon", src: href, isLogo: true, area: 0 });
      }
      return out;
    });

    let palette: string[] = [];
    let primaryColor: string | undefined;
    let secondaryColor: string | undefined;
    let accentColor: string | undefined;
    try {
      const shot = await page.screenshot({ type: "png" });
      const { Vibrant } = await import("node-vibrant/node");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pal = (await Vibrant.from(shot).getPalette()) as any;
      const order = [
        "Vibrant",
        "DarkVibrant",
        "LightVibrant",
        "Muted",
        "DarkMuted",
        "LightMuted",
      ];
      palette = order.map((k) => pal[k]?.hex).filter(Boolean);
      primaryColor = pal.Vibrant?.hex ?? undefined;
      secondaryColor = pal.DarkVibrant?.hex ?? undefined;
      accentColor = pal.LightVibrant?.hex ?? undefined;
    } catch (err) {
      logger.warn("brandkit_palette_failed", { error: String(err) });
    }

    const html = await page.content();
    const text = htmlToText(html).slice(0, 6_000);
    const claude = await extractWithClaude(url, text);

    const assets = normalizeAssets(rawAssets, url);

    return {
      signals: {
        palette,
        primaryColor,
        secondaryColor,
        accentColor,
        fonts,
        socialLinks,
        toneOfVoiceSummary: claude.toneOfVoiceSummary,
        positioning: claude.positioning,
        audience: claude.audience,
        products: claude.products,
      },
      assets,
    };
  } finally {
    await ctx.close();
  }
}

/**
 * Resolve raw scraped image candidates to absolute URLs, dedupe, classify into
 * logo / hero / other, and cap the count. Logos first, then the og hero, then
 * the largest in-page visuals (≥200px wide-ish by rendered area).
 */
function normalizeAssets(
  raw: { kind: string; src: string; isLogo: boolean; area: number }[],
  pageUrl: string,
): ScrapedAsset[] {
  const seen = new Set<string>();
  const logos: ScrapedAsset[] = [];
  const heroes: ScrapedAsset[] = [];
  const others: { url: string; area: number }[] = [];

  for (const c of raw) {
    let abs: string;
    try {
      abs = new URL(c.src, pageUrl).href;
    } catch {
      continue;
    }
    if (!/^https?:/i.test(abs)) continue; // skip data: / blob:
    if (seen.has(abs)) continue;
    seen.add(abs);

    if (c.kind === "icon" || c.isLogo) logos.push({ role: "logo", url: abs });
    else if (c.kind === "og") heroes.push({ role: "hero", url: abs });
    else others.push({ url: abs, area: c.area });
  }

  // Drop tiny in-page images (flags, badges, share icons): keep ≥ ~200×200,
  // but keep area=0 (browser couldn't measure it) rather than over-filtering.
  const visuals: ScrapedAsset[] = others
    .filter((o) => o.area === 0 || o.area >= 40_000)
    .sort((a, b) => b.area - a.area)
    .slice(0, 6)
    .map((o) => ({ role: "other", url: o.url }));

  return [...logos.slice(0, 3), ...heroes.slice(0, 1), ...visuals].slice(0, 9);
}

type ClaudeBrand = {
  toneOfVoiceSummary?: string;
  positioning?: string;
  audience?: string;
  products?: { name: string; description?: string; price?: string }[];
};

// Canonical prompt lives in skills/brand-kit/analysis-prompt.md (one source of
// truth, editable without touching code — same pattern as the Build pipeline's
// skills/atelier-design-system/generation-prompt.md). This inline copy is only
// a fallback so generation still works if the skill file is missing at runtime.
const FALLBACK_BRANDKIT_PROMPT = `Je analyseert de website {{URL}}. Hieronder de zichtbare tekst van de pagina.

"""
{{PAGE_TEXT}}
"""

Geef UITSLUITEND geldige JSON terug (geen uitleg, geen markdown-codeblok) met exact deze velden, in het Nederlands:
{
  "toneOfVoiceSummary": "1-2 zinnen over de tone of voice",
  "positioning": "1 zin: wat doet dit bedrijf en voor wie",
  "audience": "korte beschrijving van de doelgroep",
  "products": [{ "name": "...", "description": "...", "price": "... of leeg laten" }]
}`;

function loadBrandKitPrompt(url: string, pageText: string): string {
  const root = process.env.REPO_ROOT ?? process.cwd();
  const file = path.join(root, "skills", "brand-kit", "analysis-prompt.md");
  let template: string;
  try {
    // Strip the leading HTML comment (authoring note) before sending to the LLM.
    template = readFileSync(file, "utf8").replace(/^<!--[\s\S]*?-->\s*/, "");
  } catch {
    logger.warn("brandkit_skill_prompt_missing", { file });
    template = FALLBACK_BRANDKIT_PROMPT;
  }
  return template.replace(/\{\{URL\}\}/g, url).replace(/\{\{PAGE_TEXT\}\}/g, pageText);
}

async function extractWithClaude(url: string, text: string): Promise<ClaudeBrand> {
  const prompt = loadBrandKitPrompt(url, text);

  let raw = "";
  try {
    raw = await generateText(prompt, { timeoutMs: 3 * 60 * 1000 });
  } catch (err) {
    logger.warn("brandkit_claude_failed", { error: String(err) });
    return {};
  }
  return parseJsonObject(raw);
}

function parseJsonObject(raw: string): ClaudeBrand {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as ClaudeBrand;
  } catch {
    return {};
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostnameToName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "";
  }
}
