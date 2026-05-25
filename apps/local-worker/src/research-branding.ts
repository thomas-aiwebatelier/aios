/**
 * research-branding.ts — Task 3.2: Brand profile extraction.
 *
 * Ported from apps/admin/workers/research-branding.ts for the local-worker
 * split. Import path changes vs the admin original:
 *   - lib imports (playwright-pool, claude-code, site-crawler): `../lib/x.js`
 *     → `./lib/x.js`
 *   - logger: `../lib/logger.js` → `./logger.js`
 *   - REPO_ROOT: admin derived it from import.meta.url (`../../..`). Here the
 *     file sits at src/, so we read process.env.REPO_ROOT (set by index.ts),
 *     with a cwd fallback — matching generated-sites-fs.ts's convention.
 *
 * Extracts logo, color palette, fonts, tone of voice, and social links
 * from a lead's website. Persists a brand_profiles row.
 *
 * Called by research.ts orchestrator.
 */

import path from "node:path";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { brandProfiles } from "@atelier/db";
import type { Db, LogoSource } from "@atelier/db";
import { getBrowser } from "./lib/playwright-pool.js";
import { runClaudeCode } from "./lib/claude-code.js";
import { extractPageText } from "./lib/site-crawler.js";
import { logger } from "./logger.js";
import type { BrandPhotosResult } from "./research-photos.js";

// Repo root: prefer the env var index.ts sets, fall back to walking up two
// levels from cwd (cwd is typically apps/local-worker).
function repoRoot(): string {
  if (process.env.REPO_ROOT) return process.env.REPO_ROOT;
  return path.resolve(process.cwd(), "..", "..");
}

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

// ── Social og:image (logo fallback) ─────────────────────────────────────────

/**
 * Best-effort fetch of an Instagram / Facebook profile's og:image meta tag —
 * which is the profile picture, i.e. the brand logo for most small businesses
 * with no website. IG/FB frequently block bots, so this is wrapped in a short
 * timeout + try/catch and degrades silently. We do NOT log in or run a heavy
 * scraper — just one HTML GET with a browser-ish UA, then a regex for og:image.
 */
async function fetchSocialOgImage(profileUrl: string): Promise<string | null> {
  try {
    const res = await fetch(profileUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        // A desktop UA improves the odds IG/FB return the public og:image
        // markup rather than an app-install redirect.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "nl,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    // <meta property="og:image" content="https://...">  (attr order varies)
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m?.[1] ?? null;
  } catch (err) {
    logger.warn("[research-branding] social og:image fetch failed", {
      profileUrl,
      error: String(err),
    });
    return null;
  }
}

/** Which social platform a URL belongs to, if any. */
function socialPlatform(url: string): "instagram" | "facebook" | null {
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/facebook\.com|fb\.com/i.test(url)) return "facebook";
  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * extractBranding — website-first brand extraction, now augmented with
 * Google Maps photos + social logo fallback for no-website leads.
 *
 * `photoResult` carries the Maps-photo palette + the Maps websiteUri (which is
 * often an instagram/facebook URL for no-website leads). When the website
 * yields no usable logo/palette, we fall back to these. Passing it is optional
 * so the legacy 3-arg call site keeps compiling.
 *
 * Logo resolution order (spec §4):
 *   1. website logo (scraped img/favicon)            -> logoSource 'website'
 *   2. instagram/facebook profile og:image           -> 'instagram' | 'facebook'
 *   3. none                                           -> 'wordmark' (text logo)
 */
export async function extractBranding(
  db: Db,
  leadId: string,
  websiteUrl: string | null,
  photoResult?: BrandPhotosResult,
): Promise<void> {
  logger.info("[research-branding] starting", { leadId, websiteUrl });

  // Ensure asset directory
  const assetDir = path.join(repoRoot(), "data", "assets", leadId);
  if (!existsSync(assetDir)) mkdirSync(assetDir, { recursive: true });

  const photos = photoResult ?? null;

  // Candidate social URLs for the logo fallback: the Maps websiteUri (if it
  // points at IG/FB) plus any social links scraped below.
  const socialLogoCandidates: { platform: "instagram" | "facebook"; url: string }[] = [];
  if (photos?.mapsWebsiteUri) {
    const plat = socialPlatform(photos.mapsWebsiteUri);
    if (plat) socialLogoCandidates.push({ platform: plat, url: photos.mapsWebsiteUri });
  }

  // ── No website path ──────────────────────────────────────────────────────
  if (!websiteUrl) {
    logger.info("[research-branding] no website — using Maps photos + social fallback", { leadId });

    // Try IG/FB og:image for a logo.
    let logoPath: string | null = null;
    let logoSource: LogoSource = "wordmark";
    for (const cand of socialLogoCandidates) {
      const ogUrl = await fetchSocialOgImage(cand.url);
      if (ogUrl) {
        logoPath = await downloadLogo(ogUrl, assetDir);
        if (logoPath) {
          logoSource = cand.platform;
          break;
        }
      }
    }

    await upsertBrandProfile(db, leadId, {
      logoPath: logoPath
        ? path.relative(repoRoot(), logoPath).replace(/\\/g, "/")
        : null,
      logoSource,
      extractedPalette: photos?.palette?.length ? photos.palette : null,
      primaryColor: photos?.primaryColor ?? null,
      secondaryColor: photos?.secondaryColor ?? null,
      accentColor: photos?.accentColor ?? null,
      fontsDetected: null,
      toneOfVoiceSummary: "no website to analyze",
      socialLinks: photos?.mapsWebsiteUri ? buildSocialLinks(photos.mapsWebsiteUri) : null,
      photoPaths: photos?.photoPaths?.length ? photos.photoPaths : null,
    });

    logger.info("[research-branding] done (no website)", {
      leadId,
      logoSource,
      hasLogo: !!logoPath,
      photos: photos?.photoPaths?.length ?? 0,
      hasPalette: !!photos?.palette?.length,
    });
    return;
  }

  // ── With website ─────────────────────────────────────────────────────────
  const browser = await getBrowser();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  let logoPath: string | null = null;
  let logoSource: LogoSource = "none";
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
        logoSource = "website";
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

  // ── Logo fallback: IG/FB og:image when the website had no usable logo ──────
  if (!logoPath) {
    // Build candidate list: scraped social links + the Maps websiteUri (if IG/FB).
    if (socialLinks) {
      for (const [key, url] of Object.entries(socialLinks)) {
        if ((key === "instagram" || key === "facebook") &&
            !socialLogoCandidates.some((c) => c.url === url)) {
          socialLogoCandidates.push({ platform: key, url });
        }
      }
    }
    for (const cand of socialLogoCandidates) {
      const ogUrl = await fetchSocialOgImage(cand.url);
      if (ogUrl) {
        logoPath = await downloadLogo(ogUrl, assetDir);
        if (logoPath) {
          logoSource = cand.platform;
          break;
        }
      }
    }
  }
  // Final fallback: no image at all → wordmark (generation renders text logo).
  if (!logoPath) logoSource = "wordmark";

  // ── Palette fallback: use the Maps-photo palette when the website logo gave
  //    us nothing (no logo, or a logo with no extractable colors). ───────────
  const websitePaletteWeak = !palette.hex || palette.hex.length === 0;
  const useMapsPalette = websitePaletteWeak && !!photos?.palette?.length;

  await upsertBrandProfile(db, leadId, {
    logoPath: logoPath
      ? path.relative(repoRoot(), logoPath).replace(/\\/g, "/")
      : null,
    logoSource,
    extractedPalette: useMapsPalette ? photos!.palette : palette.hex,
    primaryColor: useMapsPalette ? photos!.primaryColor : palette.primary,
    secondaryColor: useMapsPalette ? photos!.secondaryColor : palette.secondary,
    accentColor: useMapsPalette ? photos!.accentColor : palette.accent,
    fontsDetected: fonts,
    toneOfVoiceSummary: toneOfVoice,
    socialLinks,
    photoPaths: photos?.photoPaths?.length ? photos.photoPaths : null,
  });

  logger.info("[research-branding] done", {
    leadId,
    logoSource,
    hasLogo: !!logoPath,
    hasPalette: useMapsPalette ? true : !!palette.hex,
    paletteSource: useMapsPalette ? "maps-photos" : "website",
    hasFonts: !!fonts,
    hasTone: !!toneOfVoice,
    hasSocial: !!socialLinks,
    photos: photos?.photoPaths?.length ?? 0,
  });
}

/** Map a single social URL to a { platform: url } record for socialLinks. */
function buildSocialLinks(url: string): Record<string, string> | null {
  const plat = socialPlatform(url);
  return plat ? { [plat]: url } : null;
}

// ── Upsert helper ─────────────────────────────────────────────────────────────

interface BrandData {
  logoPath: string | null;
  logoSource: LogoSource;
  extractedPalette: string[] | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  fontsDetected: { heading: string; body: string } | null;
  toneOfVoiceSummary: string | null;
  socialLinks: Record<string, string> | null;
  photoPaths: string[] | null;
}

async function upsertBrandProfile(db: Db, leadId: string, data: BrandData): Promise<void> {
  // Delete existing row first (simple upsert pattern — avoids UNIQUE conflicts)
  await db.delete(brandProfiles).where(eq(brandProfiles.leadId, leadId));

  await db.insert(brandProfiles)
    .values({
      id: nanoid(),
      leadId,
      logoPath: data.logoPath,
      logoSource: data.logoSource,
      extractedPalette: data.extractedPalette,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      fontsDetected: data.fontsDetected,
      toneOfVoiceSummary: data.toneOfVoiceSummary,
      socialLinks: data.socialLinks,
      photoPaths: data.photoPaths,
    });
}
