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
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  brands,
  brandKitFiles,
  renderBrandKit,
  type Db,
  type BrandSignals,
} from "@atelier/db";
import { logger } from "./logger.js";
import { getBrowser } from "./lib/playwright-pool.js";
import { generateText } from "./lib/llm.js";

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

    const signals = await extractBrandSignals(url);

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
    for (const f of files) {
      await db.insert(brandKitFiles).values({
        id: nanoid(),
        brandId,
        type: f.type,
        content: f.content,
      });
    }

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

async function extractBrandSignals(url: string): Promise<BrandSignals> {
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

    return {
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
    };
  } finally {
    await ctx.close();
  }
}

type ClaudeBrand = {
  toneOfVoiceSummary?: string;
  positioning?: string;
  audience?: string;
  products?: { name: string; description?: string; price?: string }[];
};

async function extractWithClaude(url: string, text: string): Promise<ClaudeBrand> {
  const prompt = `Je analyseert de website ${url}. Hieronder de zichtbare tekst van de pagina.

"""
${text}
"""

Geef UITSLUITEND geldige JSON terug (geen uitleg, geen markdown-codeblok) met exact deze velden, in het Nederlands:
{
  "toneOfVoiceSummary": "1-2 zinnen over de tone of voice",
  "positioning": "1 zin: wat doet dit bedrijf en voor wie",
  "audience": "korte beschrijving van de doelgroep",
  "products": [{ "name": "...", "description": "...", "price": "... of leeg laten" }]
}`;

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
