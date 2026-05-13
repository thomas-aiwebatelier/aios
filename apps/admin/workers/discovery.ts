/**
 * discovery.ts — Pipeline step 'discovery' worker (Task 3.1).
 *
 * Picks up pipeline_jobs with step='discovery', queries Google Places API,
 * deduplicates by googleMapsPlaceId, classifies industry, scores staleness,
 * and inserts lead rows.
 *
 * Payload variants:
 *   { query: string }           — text search (up to 20 results)
 *   { googleMapsUrl: string }   — single place lookup by URL
 */

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { leads } from "@atelier/db";
import { generateSlug } from "@atelier/shared";
import type { Db } from "@atelier/db";
import { claimNext, heartbeat, completeJob, failJob } from "../lib/queue.js";
import { classifyIndustry } from "../lib/industry-classify.js";
import { scoreStaleness } from "../lib/staleness.js";
import { logger } from "../lib/logger.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface PlaceResult {
  id: string;
  name: string;
  formattedAddress?: string;
  phone?: string;
  websiteUri?: string;
  types: string[];
  googleMapsUri?: string;
  businessStatus?: string;
}

// ── Belgian address parser ────────────────────────────────────────────────────

/** Parses a Google-formatted Belgian address string.
 *
 * Examples:
 *   "Lange Kievitstraat 48, 2018 Antwerpen, Belgium"
 *   "Rue de la Loi 1, 1000 Bruxelles, Belgique"
 *   "Stationsstraat 10, 9000 Gent"  (no country)
 *   "Grote Markt 1, 8900 Ieper, België"
 *
 * Returns { street, postal, city }.
 */
export function parseBelgianAddress(formatted: string): {
  street: string;
  postal: string;
  city: string;
} {
  // Strip known country suffixes (any casing)
  const stripped = formatted
    .replace(/,?\s*(Belgium|Belgique|België)\s*$/i, "")
    .trim();

  // Split on commas
  const parts = stripped.split(",").map((p) => p.trim());

  // Look for a segment that starts with a 4-digit postal code
  // Belgian postals are always 4 digits: 1000–9999
  const postalCityPattern = /^(\d{4})\s+(.+)$/;

  let street = "";
  let postal = "";
  let city = "";

  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(postalCityPattern);
    if (match) {
      postal = match[1];
      city = match[2].trim();
      // Everything before this segment is the street
      street = parts.slice(0, i).join(", ").trim();
      break;
    }
  }

  // If no postal found, treat first part as street, leave postal/city empty
  if (!postal) {
    street = parts[0] ?? "";
    city = parts[parts.length - 1] ?? "";
  }

  return { street, postal, city };
}

// ── Google Places API ─────────────────────────────────────────────────────────

const PLACES_BASE = "https://places.googleapis.com/v1";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "places.googleMapsUri",
  "places.location",
  "places.businessStatus",
].join(",");

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY not set");
  return key;
}

async function searchByQuery(query: string): Promise<PlaceResult[]> {
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 20 }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places searchText HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).map(rawToPlace);
}

async function searchByGoogleMapsUrl(url: string): Promise<PlaceResult[]> {
  const placeId = extractPlaceId(url);
  if (!placeId) {
    throw new Error(`Could not extract place_id from URL: ${url}`);
  }

  const singleFieldMask = FIELD_MASK.replace(/places\./g, "");

  const res = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": singleFieldMask,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places getById HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const raw = (await res.json()) as RawPlace;
  return [rawToPlace(raw)];
}

/** Extract place_id from common Google Maps URL formats. */
export function extractPlaceId(url: string): string | null {
  // Format 1: ?place_id=ChIJXXX
  const paramMatch = url.match(/[?&]place_id=([^&]+)/);
  if (paramMatch) return decodeURIComponent(paramMatch[1]);

  // Format 2: /maps/place/.../data=...!19s<place_id>
  // Format 3: embedded CID 0x...:0x... — these require a Lookup by CID
  // which the Places API supports as cid:DECIMAL
  const cidMatch = url.match(/0x[0-9a-f]+:0x([0-9a-f]+)/i);
  if (cidMatch) {
    // Convert hex to decimal for CID lookup
    const cid = BigInt(`0x${cidMatch[1]}`).toString();
    return `cid:${cid}`;
  }

  // Format 4: /maps/place/Name/ChIJ... path
  const pathMatch = url.match(/\/maps\/place\/[^/]+\/(ChIJ[^/?&]+)/);
  if (pathMatch) return pathMatch[1];

  return null;
}

// ── Raw Place type (Google API response shape) ────────────────────────────────

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  googleMapsUri?: string;
  businessStatus?: string;
}

function rawToPlace(raw: RawPlace): PlaceResult {
  return {
    id: raw.id ?? "",
    name: raw.displayName?.text ?? "",
    formattedAddress: raw.formattedAddress,
    phone: raw.nationalPhoneNumber,
    websiteUri: raw.websiteUri,
    types: raw.types ?? [],
    googleMapsUri: raw.googleMapsUri,
    businessStatus: raw.businessStatus,
  };
}

// ── Worker ────────────────────────────────────────────────────────────────────

/**
 * Run one discovery job cycle:
 *   1. Claim next 'discovery' job
 *   2. Fetch places (query or URL)
 *   3. Deduplicate, classify, score, insert
 *   4. Complete or fail the job
 *
 * Returns the number of leads inserted (0 if no job found).
 */
export async function runDiscoveryWorker(db: Db): Promise<number> {
  const job = claimNext(db, "discovery-worker");
  if (!job) {
    logger.debug("[discovery] no queued discovery jobs");
    return 0;
  }

  // Heartbeat every 30s
  const hbInterval = setInterval(() => {
    try {
      heartbeat(db, job.id);
    } catch (err) {
      logger.warn("[discovery] heartbeat failed", { error: String(err) });
    }
  }, 30_000);

  try {
    const payload = job.payload as { query?: string; googleMapsUrl?: string };
    logger.info("[discovery] starting job", { jobId: job.id, payload });

    let places: PlaceResult[];
    if (payload.googleMapsUrl) {
      places = await searchByGoogleMapsUrl(payload.googleMapsUrl);
    } else if (payload.query) {
      places = await searchByQuery(payload.query);
    } else {
      throw new Error("Discovery job payload must have 'query' or 'googleMapsUrl'");
    }

    logger.info("[discovery] places fetched", { count: places.length });

    let inserted = 0;
    let skipped = 0;

    for (const place of places) {
      if (!place.id) {
        logger.warn("[discovery] place missing id, skipping", { name: place.name });
        continue;
      }

      // Dedup by googleMapsPlaceId
      const existing = db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.googleMapsPlaceId, place.id))
        .get();

      if (existing) {
        logger.debug("[discovery] skipping duplicate", { placeId: place.id });
        skipped++;
        continue;
      }

      // Parse address
      const { street, postal, city } = parseBelgianAddress(
        place.formattedAddress ?? "",
      );

      const cityForSlug = city || "be";
      const slug = generateSlug(place.name, cityForSlug);

      // Classify industry
      const classification = await classifyIndustry({
        name: place.name,
        googleTypes: place.types,
      });

      // Score staleness if website present
      let stalenessScore: number | null = null;
      if (place.websiteUri) {
        try {
          const staleness = await scoreStaleness(place.websiteUri);
          stalenessScore = staleness.score;
        } catch (err) {
          logger.warn("[discovery] staleness scoring failed", {
            url: place.websiteUri,
            error: String(err),
          });
        }
      }

      // Insert lead
      db.insert(leads)
        .values({
          id: nanoid(),
          slug,
          status: "discovered",
          businessName: place.name,
          phone: place.phone ?? null,
          email: null,
          address: street || null,
          city: city || "Belgium",
          postalCode: postal || null,
          googleMapsPlaceId: place.id,
          googleMapsUrl: place.googleMapsUri ?? null,
          existingWebsiteUrl: place.websiteUri ?? null,
          websiteStalenessScore: stalenessScore !== null ? Math.round(stalenessScore) : null,
          industryKey: classification.industry_key,
          industryClassificationConfidence: classification.confidence,
          language: "nl",
        })
        .run();

      logger.info("[discovery] lead inserted", {
        name: place.name,
        slug,
        industry: classification.industry_key,
        confidence: classification.confidence,
        source: classification.source,
      });
      inserted++;
    }

    completeJob(db, job.id);
    logger.info("[discovery] job complete", {
      jobId: job.id,
      inserted,
      skipped,
    });
    return inserted;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[discovery] job failed", { jobId: job.id, error: message });
    failJob(db, job.id, message);
    throw err;
  } finally {
    clearInterval(hbInterval);
  }
}
