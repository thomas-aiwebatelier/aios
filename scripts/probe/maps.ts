#!/usr/bin/env tsx
/**
 * Probe — Google Maps Places API (New) text search.
 *
 * Verifies the GOOGLE_MAPS_API_KEY in .env works against the v1 endpoint
 * and that the expected fields come back. This is the same query shape the
 * Discovery pipeline (Pipeline 1, spec §11.1) uses every morning.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/probe/maps.ts
 *   pnpm tsx --env-file=.env scripts/probe/maps.ts "kapper Gent"
 */

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error("[maps] GOOGLE_MAPS_API_KEY missing from .env");
  process.exit(2);
}

const query = process.argv[2] ?? "bakkerij Antwerpen";
const maxResults = 5;

const url = "https://places.googleapis.com/v1/places:searchText";
const fieldMask = [
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

console.log(`[maps] querying "${query}" (max ${maxResults} results)…`);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": fieldMask,
  },
  body: JSON.stringify({ textQuery: query, maxResultCount: maxResults }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`[maps] HTTP ${res.status} ${res.statusText}`);
  console.error(body);
  process.exit(1);
}

const data = (await res.json()) as {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    types?: string[];
    googleMapsUri?: string;
    location?: { latitude: number; longitude: number };
    businessStatus?: string;
  }>;
};

const places = data.places ?? [];
if (places.length === 0) {
  console.error(`[maps] zero results — check the query or quota`);
  process.exit(1);
}

console.log(`[maps] got ${places.length} result${places.length === 1 ? "" : "s"}:\n`);
for (const [i, p] of places.entries()) {
  const name = p.displayName?.text ?? "(no name)";
  console.log(`${i + 1}. ${name}`);
  if (p.formattedAddress) console.log(`     ${p.formattedAddress}`);
  if (p.nationalPhoneNumber) console.log(`     ☎  ${p.nationalPhoneNumber}`);
  if (p.websiteUri) console.log(`     🌐 ${p.websiteUri}`);
  else console.log(`     🌐 (no website — discovery candidate!)`);
  if (p.types && p.types.length) console.log(`     types: ${p.types.slice(0, 4).join(", ")}`);
  console.log("");
}

const withoutWebsite = places.filter((p) => !p.websiteUri).length;
console.log(
  `[maps] ✅ probe OK. ${places.length} places returned; ${withoutWebsite} have no website (these would land in the Discovery queue).`,
);
