/**
 * research-photos.ts — Real brand-photo capture for the research pipeline.
 *
 * The original branding step only extracts logo/colors from a website. Leads
 * with NO website (e.g. a bakery that only has a Google Maps listing + an
 * Instagram) therefore got a generic site with no real imagery and a stock
 * palette. This module fixes the gap by pulling the actual storefront/product
 * photos a business already has on its Google Maps profile and deriving brand
 * colors from them.
 *
 * Primary, reliable source: Google Places API v1 Place Photos.
 *   1. GET /v1/places/{placeId}  with FieldMask `photos,websiteUri,businessStatus`
 *      → response.photos[] each carry a `.name` (e.g. "places/XXX/photos/YYY").
 *   2. For up to MAX_PHOTOS photos: GET /v1/{photo.name}/media?maxWidthPx=1600&key=...
 *      which 302-redirects to the image bytes. Saved under
 *      data/assets/<leadId>/photos/maps-<n>.jpg.
 *   3. node-vibrant runs across every downloaded photo; swatches are combined
 *      and the most saturated becomes the primary brand color.
 *
 * The `websiteUri` Maps returns is also surfaced: for no-website leads the
 * "website" on the Maps card is frequently an instagram.com / facebook.com URL,
 * which the branding step uses as a logo source.
 *
 * Design notes / defaults:
 *   - Assets live under data/assets/<leadId>/ to match research-branding.ts's
 *     existing convention (rather than a separate brand-assets/ tree).
 *   - Everything is best-effort: network errors, a closed business, or a place
 *     with zero photos all degrade to empty arrays + a warning. We never throw
 *     out of fetchBrandPhotos so research keeps running for the other steps.
 *   - Idempotent: the photos/ dir is wiped per run so re-running research does
 *     not accumulate stale maps-N.jpg files.
 */

import path from "node:path";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import type { Db } from "@atelier/db";
import { logger } from "./logger.js";

// Max Place Photos to download + analyse. Places returns up to 10; 8 is plenty
// of hero/section imagery without hammering the photo-media quota.
const MAX_PHOTOS = 8;
const PLACES_BASE = "https://places.googleapis.com/v1";

// Minimal structural view of a lead — avoids coupling to the full drizzle row.
export interface PhotoLead {
  id: string;
  googleMapsPlaceId: string | null;
}

export interface BrandPhotosResult {
  /** Repo-relative, forward-slash paths of downloaded photos. */
  photoPaths: string[];
  /** Places photo resource names (the `.name` field) for persistence. */
  photoRefs: string[];
  /** node-vibrant palette across all photos (hex), most saturated first. */
  palette: string[];
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  /** websiteUri Maps reports — may be an instagram/facebook URL for no-website leads. */
  mapsWebsiteUri: string | null;
}

function emptyResult(): BrandPhotosResult {
  return {
    photoPaths: [],
    photoRefs: [],
    palette: [],
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    mapsWebsiteUri: null,
  };
}

function repoRoot(): string {
  if (process.env.REPO_ROOT) return process.env.REPO_ROOT;
  return path.resolve(process.cwd(), "..", "..");
}

function apiKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY ?? null;
}

// ── Place Details (photos + websiteUri + status) ───────────────────────────────

interface PlacePhoto {
  name: string; // "places/XXX/photos/YYY"
}

interface PlaceDetails {
  photos?: PlacePhoto[];
  websiteUri?: string;
  businessStatus?: string;
}

async function fetchPlaceDetails(placeId: string, key: string): Promise<PlaceDetails | null> {
  try {
    const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "photos,websiteUri,businessStatus",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn("[research-photos] place details HTTP error", {
        placeId,
        status: res.status,
        body: body.slice(0, 200),
      });
      return null;
    }
    return (await res.json()) as PlaceDetails;
  } catch (err) {
    logger.warn("[research-photos] place details fetch failed", {
      placeId,
      error: String(err),
    });
    return null;
  }
}

// ── Photo media download ────────────────────────────────────────────────────────

async function downloadPhoto(
  photoName: string,
  destPath: string,
  key: string,
): Promise<boolean> {
  try {
    // maxWidthPx=1600 → good hero resolution. fetch follows the 302 to the
    // googleusercontent.com image bytes automatically.
    const url = `${PLACES_BASE}/${photoName}/media?maxWidthPx=1600&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      logger.warn("[research-photos] photo media HTTP error", {
        photoName,
        status: res.status,
      });
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return false;
    writeFileSync(destPath, buf);
    return true;
  } catch (err) {
    logger.warn("[research-photos] photo download failed", {
      photoName,
      error: String(err),
    });
    return false;
  }
}

// ── Palette extraction across multiple photos ──────────────────────────────────

interface CombinedPalette {
  hex: string[];
  primary: string | null;
  secondary: string | null;
  accent: string | null;
}

/**
 * Run node-vibrant over each downloaded photo, collect all swatches, and pick
 * the brand palette. Primary = most saturated swatch across all photos;
 * secondary = darkest; accent = lightest. HSL is derived from the swatch RGB so
 * we can rank by saturation / lightness consistently across images.
 */
async function extractPaletteAcross(photoPaths: string[]): Promise<CombinedPalette> {
  const empty: CombinedPalette = { hex: [], primary: null, secondary: null, accent: null };
  if (photoPaths.length === 0) return empty;

  try {
    // node-vibrant v4: the "/node" subpath exports { Vibrant } for Node.
    const { Vibrant } = await import("node-vibrant/node");

    type Cand = { hex: string; sat: number; light: number };
    const candidates: Cand[] = [];

    for (const p of photoPaths) {
      try {
        const palette = await Vibrant.from(p).getPalette();
        for (const sw of Object.values(palette)) {
          if (!sw) continue;
          // Swatch.hsl is [hue, saturation, lightness], all 0..1.
          const [, sat, light] = sw.hsl;
          candidates.push({ hex: sw.hex, sat, light });
        }
      } catch (err) {
        logger.warn("[research-photos] vibrant failed for photo", { photo: p, error: String(err) });
      }
    }

    if (candidates.length === 0) return empty;

    // Dedupe by hex, keep highest saturation copy.
    const byHex = new Map<string, Cand>();
    for (const c of candidates) {
      const existing = byHex.get(c.hex);
      if (!existing || c.sat > existing.sat) byHex.set(c.hex, c);
    }
    const unique = [...byHex.values()];

    const bySat = [...unique].sort((a, b) => b.sat - a.sat);
    const primary = bySat[0]?.hex ?? null;
    // secondary = darkest (good for headings/footer), excluding the primary.
    const secondary =
      [...unique].filter((c) => c.hex !== primary).sort((a, b) => a.light - b.light)[0]?.hex ??
      null;
    // accent = lightest pop (good for CTAs), excluding primary + secondary.
    const accent =
      [...unique]
        .filter((c) => c.hex !== primary && c.hex !== secondary)
        .sort((a, b) => b.light - a.light)[0]?.hex ?? null;

    return {
      hex: bySat.slice(0, 5).map((c) => c.hex),
      primary,
      secondary,
      accent,
    };
  } catch (err) {
    logger.warn("[research-photos] palette extraction failed", { error: String(err) });
    return empty;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * fetchBrandPhotos — download a lead's Google Maps Place Photos and derive a
 * brand palette from them. Best-effort: always resolves, never throws.
 *
 * The `db` param is accepted for signature parity with the other research
 * steps (and future persistence needs); the lead row's googlePhotoRefs are
 * persisted by the orchestrator from the returned photoRefs.
 */
export async function fetchBrandPhotos(
  _db: Db,
  lead: PhotoLead,
): Promise<BrandPhotosResult> {
  const key = apiKey();
  if (!key) {
    logger.warn("[research-photos] GOOGLE_MAPS_API_KEY not set — skipping photo capture");
    return emptyResult();
  }
  if (!lead.googleMapsPlaceId) {
    logger.info("[research-photos] no googleMapsPlaceId — skipping photo capture", {
      leadId: lead.id,
    });
    return emptyResult();
  }

  const details = await fetchPlaceDetails(lead.googleMapsPlaceId, key);
  if (!details) return emptyResult();

  const mapsWebsiteUri = details.websiteUri ?? null;

  if (details.businessStatus && details.businessStatus !== "OPERATIONAL") {
    logger.info("[research-photos] business not operational — skipping photos", {
      leadId: lead.id,
      businessStatus: details.businessStatus,
    });
    // Still return the websiteUri so the branding step can try IG/FB.
    return { ...emptyResult(), mapsWebsiteUri };
  }

  const photos = (details.photos ?? []).slice(0, MAX_PHOTOS);
  if (photos.length === 0) {
    logger.info("[research-photos] place has no photos", { leadId: lead.id });
    return { ...emptyResult(), mapsWebsiteUri };
  }

  // photos/ subdir under the existing per-lead asset dir. Wiped per run for
  // idempotency (research may re-run on the same lead).
  const photosDir = path.join(repoRoot(), "data", "assets", lead.id, "photos");
  if (existsSync(photosDir)) rmSync(photosDir, { recursive: true, force: true });
  mkdirSync(photosDir, { recursive: true });

  const photoPaths: string[] = [];
  const photoRefs: string[] = [];
  let n = 0;
  for (const photo of photos) {
    n += 1;
    const destPath = path.join(photosDir, `maps-${n}.jpg`);
    const ok = await downloadPhoto(photo.name, destPath, key);
    if (ok) {
      photoPaths.push(path.relative(repoRoot(), destPath).replace(/\\/g, "/"));
      photoRefs.push(photo.name);
    }
  }

  if (photoPaths.length === 0) {
    logger.warn("[research-photos] all photo downloads failed", { leadId: lead.id });
    return { ...emptyResult(), mapsWebsiteUri };
  }

  const palette = await extractPaletteAcross(
    photoPaths.map((rel) => path.join(repoRoot(), rel)),
  );

  logger.info("[research-photos] done", {
    leadId: lead.id,
    photos: photoPaths.length,
    hasPalette: palette.hex.length > 0,
    mapsWebsiteUri: mapsWebsiteUri ?? "(none)",
  });

  return {
    photoPaths,
    photoRefs,
    palette: palette.hex,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    mapsWebsiteUri,
  };
}
