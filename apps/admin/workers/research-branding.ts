/**
 * research-branding.ts — Task 3.2: Brand profile extraction.
 *
 * Extracts logo, color palette, fonts, tone of voice, and social links
 * from a lead's website. Persists a brand_profiles row.
 *
 * Called by research.ts orchestrator.
 */

import path from "node:path";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { brandProfiles } from "@atelier/db";
import type { Db } from "@atelier/db";
import { getBrowser } from "../lib/playwright-pool.js";
import { runClaudeCode } from "../lib/claude-code.js";
import { extractPageText } from "../lib/site-crawler.js";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

// ── Logo selectors in priority order ─────────────────────────────────────────

const LOGO_SELECTORS = [
  // 1. img with "logo" in src
  'img[src*="logo" i]',
  // 2. img with "logo" in alt
  'img[alt*="logo" i]',
  // 3. Apple touch icon / high-res favicon
  'link[rel="apple-touch-icon"]',
  'link[rel="icon"][sizes="192x192"]',
  // 4. Last resort favicon
  'link[rel="icon"]',
];

// ── Palette extraction ────────────────────────────────────────────────────────

/**
 * Use node-vibrant to extract dominant colors from a local image file.
 * Palette mapping:
 *   primary   = Vibrant swatch (most saturated dominant color)
 *   secondary = DarkVibrant (darker variant — good for headings)
 *   accent    = LightVibrant (lighter pop — good for CTAs)
 * Falls back to other swatches if any are null.
 */
async function extractPalette(
  logoPath: string,
): Promise<{ hex: string[] | null; primary: string | null; secondary: string | null; accent: string | null }> {
  try {
    // node-vibrant v4: use named subpath — "node-vibrant" default throws,
    // "node-vibrant/node" exports { Vibrant } for Node.js environments.
    const { Vibrant } = await import("node-vibrant/node");
    const palette = await Vibrant.from(logoPath).getPalette();

    const swatches = [
      palette.Vibrant,
      palette.DarkVibrant,
      palette.LightVibrant,
      palette.Muted,
      palette.DarkMuted,
      palette.LightMuted,
    ].filter(Boolean);

    if (swatches.length === 0) {
      return { hex: null, primary: null, secondary: null, accent: null };
    }

    const hex = swatches.map((s) => s!.hex);

    // Priority mapping: Vibrant → primary, DarkVibrant → secondary, LightVibrant → accent
    const primary = palette.Vibrant?.hex ?? palette.Muted?.hex ?? hex[0];
    const secondary = palette.DarkVibrant?.hex ?? palette.DarkMuted?.hex ?? hex[1] ?? null;
    const accent = palette.LightVibrant?.hex ?? palette.LightMuted?.hex ?? hex[2] ?? null;

    return { hex: hex.slice(0, 5), primary: primary ?? null, secondary, accent };
  } catch (err) {
    logger.warn("[research-branding] palette extraction failed", { logoPath, error: String(err) });
    return { hex: null, primary: null, secondary: null, accent: null };
  }
}

// ── Logo download ─────────────────────────────────────────────────────────────

async function downloadLogo(
  logoUrl: string,
  destDir: string,
): Promise<string | null> {
  try {
    const ext = logoUrl.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "png";
    const safeExt = ["png", "jpg", "jpeg", "webp", "ico", "gif"].includes(ext) ? ext : "png";
    const destPath = path.join(destDir, `logo.${safeExt}`);

    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(destPath, buf);
    logger.debug("[research-branding] logo downloaded", { logoUrl, destPath });
    return destPath;
  } catch (err) {
    logger.warn("[research-branding] logo download failed", { logoUrl, error: String(err) });
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function extractBranding(
  db: Db,
  leadId: string,
  websiteUrl: string | null,
): Promise<void> {
  logger.info("[research-branding] starting", { leadId, websiteUrl });

  // Ensure asset directory
  const assetDir = path.join(REPO_ROOT, "data", "assets", leadId);
  if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true });

  // ── No website path ──────────────────────────────────────────────────────
  if (!websiteUrl) {
    logger.info("[research-branding] no website — inserting minimal brand profile", { leadId });
    await upsertBrandProfile(db, leadId, {
      logoPath: null,
      extractedPalette: null,
      primaryColor: null,
      secondaryColor: null,
      accentColor: null,
      fontsDetected: null,
      toneOfVoiceSummary: "no website to analyze",
      socialLinks: null,
    });
    return;
  }

  // ── With website ─────────────────────────────────────────────────────────
  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  let logoPath: string | null = null;
  let palette: Awaited<ReturnType<typeof extractPalette>> = {
    hex: null, primary: null, secondary: null, accent: null,
  };
  let fonts: { heading: string; body: string } | null = null;
  let toneOfVoice: string | null = null;
  let socialLinks: Record<string, string> | null = null;

  try {
    await page.goto(websiteUrl, { timeout: 20_000, waitUntil: "domcontentloaded" });

    // ── Logo ───────────────────────────────────────────────────────────────
    let logoUrl: string | null = null;
    for (const selector of LOGO_SELECTORS) {
      try {
        const el = await page.$(selector);
        if (!el) continue;

        const isLink = selector.startsWith("link");
        if (isLink) {
          const href = await el.getAttribute("href");
          if (href) {
            logoUrl = new URL(href, websiteUrl).href;
            break;
          }
        } else {
          const src = await el.getAttribute("src");
          if (src) {
            logoUrl = new URL(src, websiteUrl).href;
            break;
          }
        }
      } catch {
        // try next selector
      }
    }

    if (logoUrl) {
      logoPath = await downloadLogo(logoUrl, assetDir);
      if (logoPath) {
        palette = await extractPalette(logoPath);
      }
    }

    // ── Fonts ───────────────────────────────────────────────────────────────
    try {
      const headingFont = await page.evaluate(() => {
        const h1 = document.querySelector("h1");
        return h1 ? getComputedStyle(h1).fontFamily : "";
      });
      const bodyFont = await page.evaluate(() => {
        return getComputedStyle(document.body).fontFamily;
      });
      fonts = { heading: headingFont, body: bodyFont };
    } catch (err) {
      logger.warn("[research-branding] font extraction failed", { error: String(err) });
    }

    // ── Tone of voice ───────────────────────────────────────────────────────
    try {
      const html = await page.content();
      const pageText = extractPageText(html);
      if (pageText.trim().length > 50) {
        const prompt =
          `Lees deze hometekst van een Belgisch bedrijf:\n\n"${pageText}"\n\n` +
          `Samenvatting van de tone of voice in 2 Nederlandse zinnen. ` +
          `Output alleen die 2 zinnen, geen inleiding of uitleg.`;

        toneOfVoice = await runClaudeCode(prompt, {
          args: ["--model", "claude-haiku-4-5"],
          timeoutMs: 3 * 60 * 1000,
        });
        toneOfVoice = toneOfVoice.trim();
      }
    } catch (err) {
      logger.warn("[research-branding] tone-of-voice extraction failed", { error: String(err) });
    }

    // ── Social links ────────────────────────────────────────────────────────
    try {
      const links = await page.evaluate(() => {
        const platforms = ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com"];
        const result: Record<string, string> = {};
        const anchors = Array.from(document.querySelectorAll("a[href]"));
        for (const anchor of anchors) {
          const href = (anchor as HTMLAnchorElement).href;
          for (const platform of platforms) {
            if (href.includes(platform)) {
              const key = platform.replace(".com", "");
              if (!result[key]) result[key] = href;
            }
          }
        }
        return result;
      });
      socialLinks = Object.keys(links).length > 0 ? links : null;
    } catch (err) {
      logger.warn("[research-branding] social links extraction failed", { error: String(err) });
    }
  } catch (err) {
    logger.warn("[research-branding] page navigation failed", {
      leadId,
      websiteUrl,
      error: String(err),
    });
  } finally {
    await ctx.close();
  }

  await upsertBrandProfile(db, leadId, {
    logoPath: logoPath
      ? path.relative(REPO_ROOT, logoPath).replace(/\\/g, "/")
      : null,
    extractedPalette: palette.hex,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    fontsDetected: fonts,
    toneOfVoiceSummary: toneOfVoice,
    socialLinks,
  });

  logger.info("[research-branding] done", {
    leadId,
    hasLogo: !!logoPath,
    hasPalette: !!palette.hex,
    hasFonts: !!fonts,
    hasTone: !!toneOfVoice,
    hasSocial: !!socialLinks,
  });
}

// ── Upsert helper ─────────────────────────────────────────────────────────────

interface BrandData {
  logoPath: string | null;
  extractedPalette: string[] | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontsDetected: { heading: string; body: string } | null;
  toneOfVoiceSummary: string | null;
  socialLinks: Record<string, string> | null;
}

async function upsertBrandProfile(db: Db, leadId: string, data: BrandData): Promise<void> {
  // Delete existing row first (simple upsert pattern — avoids UNIQUE conflicts)
  await db.delete(brandProfiles).where(eq(brandProfiles.leadId, leadId));

  await db.insert(brandProfiles)
    .values({
      id: nanoid(),
      leadId,
      logoPath: data.logoPath,
      extractedPalette: data.extractedPalette,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      fontsDetected: data.fontsDetected,
      toneOfVoiceSummary: data.toneOfVoiceSummary,
      socialLinks: data.socialLinks,
    });
}
