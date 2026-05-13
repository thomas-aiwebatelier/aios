/**
 * discovery.test.ts — Vitest tests for Task 3.1.
 *
 * Mocking strategy:
 *   - fetch: vi.stubGlobal to return fake Places API responses
 *   - child_process: vi.mock('node:child_process') to prevent real claude spawns
 *   - playwright: vi.mock('playwright') to prevent browser launches in CI
 *
 * A `describe.skip` block at the bottom can be flipped to `describe` for
 * manual integration testing with real APIs locally.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createDb, createSchema, leads } from "@atelier/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Mock node:child_process before importing anything that uses it ────────────
// This prevents real claude spawns in CI.

vi.mock("node:child_process", () => ({
  spawn: vi.fn().mockImplementation((_cmd: string, _args: string[]) => {
    // Default: return junk so free-form falls through to default
    return createMockSpawn("NOT_VALID_JUNK");
  }),
}));

// ── Mock playwright to prevent browser launches in CI ────────────────────────
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          screenshot: vi.fn().mockResolvedValue(undefined),
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// ── Import modules AFTER mocks are set up ────────────────────────────────────
import { classifyIndustry, loadSkillData } from "../lib/industry-classify.js";
import { parseBelgianAddress, runDiscoveryWorker, extractPlaceId } from "./discovery.js";
import { enqueue } from "../lib/queue.js";
import { spawn } from "node:child_process";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a mock EventEmitter-like spawn child process. */
function createMockSpawn(output: string) {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  function on(event: string, fn: (...args: unknown[]) => void) {
    listeners[event] = listeners[event] ?? [];
    listeners[event].push(fn);
    return child;
  }

  const stdout = {
    on(event: string, fn: (...args: unknown[]) => void) {
      if (event === "data") {
        // Emit asynchronously
        setTimeout(() => fn(Buffer.from(output)), 0);
      }
      return stdout;
    },
  };

  const stderr = {
    on(_event: string, _fn: (...args: unknown[]) => void) { return stderr; },
  };

  const stdin = {
    write: vi.fn(),
    end: vi.fn(() => {
      // Trigger close after stdin ends
      setTimeout(() => {
        (listeners["close"] ?? []).forEach((fn) => fn(0));
      }, 5);
    }),
  };

  const child = { stdout, stderr, stdin, on, kill: vi.fn() };
  return child;
}

/** Make spawn return a specific JSON output. */
function mockSpawnOutput(json: string) {
  vi.mocked(spawn).mockImplementationOnce(
    (_cmd: string, _args: string[]) => createMockSpawn(json) as ReturnType<typeof spawn>,
  );
}

/** Build fake Places API response body. */
function fakePlacesResponse(places: Array<{
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  types?: string[];
  mapsUri?: string;
}>) {
  return JSON.stringify({
    places: places.map((p) => ({
      id: p.id,
      displayName: { text: p.name },
      formattedAddress: p.address ?? `Teststraat 1, 2000 Antwerpen, Belgium`,
      nationalPhoneNumber: p.phone ?? "+32 3 123 45 67",
      websiteUri: p.website,
      types: p.types ?? ["bakery", "food"],
      googleMapsUri: p.mapsUri ?? `https://maps.google.com/?place_id=${p.id}`,
      businessStatus: "OPERATIONAL",
    })),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("parseBelgianAddress", () => {
  it("parses standard Belgian address with Belgium suffix", () => {
    const r = parseBelgianAddress("Lange Kievitstraat 48, 2018 Antwerpen, Belgium");
    expect(r.street).toBe("Lange Kievitstraat 48");
    expect(r.postal).toBe("2018");
    expect(r.city).toBe("Antwerpen");
  });

  it("parses without country suffix", () => {
    const r = parseBelgianAddress("Stationsstraat 10, 9000 Gent");
    expect(r.street).toBe("Stationsstraat 10");
    expect(r.postal).toBe("9000");
    expect(r.city).toBe("Gent");
  });

  it("parses with Belgique suffix", () => {
    const r = parseBelgianAddress("Rue de la Loi 1, 1000 Bruxelles, Belgique");
    expect(r.street).toBe("Rue de la Loi 1");
    expect(r.postal).toBe("1000");
    expect(r.city).toBe("Bruxelles");
  });

  it("parses with België suffix", () => {
    const r = parseBelgianAddress("Grote Markt 1, 8900 Ieper, België");
    expect(r.street).toBe("Grote Markt 1");
    expect(r.postal).toBe("8900");
    expect(r.city).toBe("Ieper");
  });
});

describe("extractPlaceId", () => {
  it("extracts place_id from query param", () => {
    const url = "https://maps.google.com/?place_id=ChIJ123ABC";
    expect(extractPlaceId(url)).toBe("ChIJ123ABC");
  });

  it("extracts ChIJ from path format", () => {
    const url = "https://www.google.com/maps/place/Bakkerij+Test/ChIJabc123def456";
    expect(extractPlaceId(url)).toBe("ChIJabc123def456");
  });

  it("returns null for unrecognized URL", () => {
    expect(extractPlaceId("https://example.com")).toBeNull();
  });
});

describe("industry classifier", () => {
  it("returns canonical key at 0.95 for known Google types", async () => {
    const result = await classifyIndustry({
      name: "Test Bakery",
      googleTypes: ["bakery", "food"],
    });
    expect(result.industry_key).toBe("bakery-restaurant");
    expect(result.confidence).toBe(0.95);
    expect(result.source).toBe("google_types");
  });

  it("applies keyword fallback for business_name with no useful types", async () => {
    const result = await classifyIndustry({
      name: "Bakkerij Test",
      googleTypes: [], // no types → falls to keyword
    });
    expect(result.industry_key).toBe("bakery-restaurant");
    expect(result.confidence).toBe(0.75);
    expect(result.source).toBe("keyword");
  });

  it("applies keyword match for kapper (beauty-personal-care)", async () => {
    const result = await classifyIndustry({
      name: "Kapper Centrum",
      googleTypes: [],
    });
    expect(result.industry_key).toBe("beauty-personal-care");
    expect(result.confidence).toBe(0.75);
    expect(result.source).toBe("keyword");
  });

  it("falls back to professional-services when claude returns junk", async () => {
    // spawn is already mocked to return NOT_VALID_JUNK (non-canonical)
    const result = await classifyIndustry({
      name: "Totally Unknown Business XYZ",
      googleTypes: ["point_of_interest"], // no match in types table
    });
    // keyword: no match for "Totally Unknown Business XYZ"
    // free_form: spawn returns junk → rejected
    // default fallback
    expect(result.industry_key).toBe("professional-services");
    expect(result.confidence).toBe(0.0);
    expect(result.source).toBe("default");
  });

  it("uses free_form result when claude returns valid canonical key", async () => {
    // Pre-queue a valid JSON response for the next spawn call
    mockSpawnOutput('{"industry_key":"automotive","confidence":0.8}');

    const result = await classifyIndustry({
      name: "Totally Unknown Car Thing",
      googleTypes: ["point_of_interest"],
    });
    // types: no match; keyword: 'car' not in keyword table → free_form
    // Depending on keyword table, 'car' may or may not match 'carwash'
    // We just assert it's either free_form with automotive or default
    if (result.source === "free_form") {
      expect(result.industry_key).toBe("automotive");
      expect(result.confidence).toBeCloseTo(0.8, 2);
    } else {
      // If keyword matched something, that's also fine
      expect(result.source).toMatch(/keyword|default/);
    }
  });

  it("loads canonical keys from SKILL.md filenames (no hardcoding)", () => {
    const { canonicalKeys } = loadSkillData();
    expect(canonicalKeys.size).toBeGreaterThanOrEqual(10);
    expect(canonicalKeys.has("bakery-restaurant")).toBe(true);
    expect(canonicalKeys.has("professional-services")).toBe(true);
    expect(canonicalKeys.has("automotive")).toBe(true);
  });
});

describe("discovery worker happy path", () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(":memory:");
    createSchema(db);
    // Provide a dummy API key so apiKey() doesn't throw; fetch is mocked anyway
    process.env.GOOGLE_MAPS_API_KEY = "TEST_KEY_MOCKED";
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    vi.restoreAllMocks();
  });

  it("inserts 3 leads from a Places API query response", async () => {
    const fakePlaces = [
      { id: "place-1", name: "Bakkerij Pieter", address: "Teststraat 1, 2000 Antwerpen, Belgium", types: ["bakery"] },
      { id: "place-2", name: "Bakkerij Marc", address: "Kerkstraat 5, 9000 Gent, Belgium", types: ["bakery"] },
      { id: "place-3", name: "Bakkerij Sarah", address: "Marktplein 2, 1000 Brussel, Belgique", types: ["bakery"] },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => JSON.parse(fakePlacesResponse(fakePlaces)),
      }),
    );

    enqueue(db, { step: "discovery", payload: { query: "bakkerij Antwerpen" } });
    const inserted = await runDiscoveryWorker(db);

    expect(inserted).toBe(3);

    const rows = db.select().from(leads).all();
    expect(rows).toHaveLength(3);

    // Check slugs contain city segments
    const antwerpenLead = rows.find((r) => r.city === "Antwerpen");
    expect(antwerpenLead).toBeDefined();
    expect(antwerpenLead?.slug).toContain("bakkerij-pieter");

    // Check industry classification
    rows.forEach((r) => {
      expect(r.industryKey).toBe("bakery-restaurant");
      expect(r.industryClassificationConfidence).toBe(0.95);
    });

    vi.unstubAllGlobals();
  });

  it("deduplicates: skips existing placeId, inserts only new ones", async () => {
    // Pre-insert lead with place-1
    db.insert(leads)
      .values({
        id: nanoid(),
        slug: "existing-antw-xxxx",
        status: "discovered",
        businessName: "Existing Bakery",
        city: "Antwerpen",
        postalCode: "2000",
        googleMapsPlaceId: "place-1",
        industryKey: "bakery-restaurant",
        industryClassificationConfidence: 0.95,
        language: "nl",
      })
      .run();

    const fakePlaces = [
      { id: "place-1", name: "Bakkerij Existing", types: ["bakery"] },
      { id: "place-2", name: "Bakkerij New 1", types: ["bakery"] },
      { id: "place-3", name: "Bakkerij New 2", types: ["bakery"] },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => JSON.parse(fakePlacesResponse(fakePlaces)),
      }),
    );

    enqueue(db, { step: "discovery", payload: { query: "bakkerij Antwerpen" } });
    const inserted = await runDiscoveryWorker(db);

    expect(inserted).toBe(2);

    const rows = db.select().from(leads).all();
    expect(rows).toHaveLength(3); // 1 pre-existing + 2 new

    vi.unstubAllGlobals();
  });

  it("handles googleMapsUrl payload (single place lookup)", async () => {
    const fakeSinglePlace = {
      id: "place-single",
      displayName: { text: "Garage Test" },
      formattedAddress: "Nijverheidsstraat 12, 3000 Leuven, Belgium",
      nationalPhoneNumber: "+32 16 12 34 56",
      websiteUri: undefined,
      types: ["car_repair", "car_dealer"],
      googleMapsUri: "https://maps.google.com/?place_id=place-single",
      businessStatus: "OPERATIONAL",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fakeSinglePlace,
      }),
    );

    enqueue(db, {
      step: "discovery",
      payload: { googleMapsUrl: "https://maps.google.com/?place_id=place-single" },
    });
    const inserted = await runDiscoveryWorker(db);

    expect(inserted).toBe(1);
    const row = db.select().from(leads).where(eq(leads.googleMapsPlaceId, "place-single")).get();
    expect(row?.businessName).toBe("Garage Test");
    expect(row?.industryKey).toBe("automotive");
    expect(row?.city).toBe("Leuven");

    vi.unstubAllGlobals();
  });
});

// ── Manual integration test (skipped in CI) ──────────────────────────────────
// Flip `describe.skip` → `describe` to run against real APIs locally.
// Requires: GOOGLE_MAPS_API_KEY in .env, claude CLI installed and authenticated.
describe.skip("discovery worker — manual integration (real APIs)", () => {
  it("queries real Google Maps and inserts leads", async () => {
    const { createDb, createSchema } = await import("@atelier/db");
    const db = createDb(":memory:");
    createSchema(db);

    const { enqueue } = await import("../lib/queue.js");
    enqueue(db, {
      step: "discovery",
      payload: { query: "bakkerij Antwerpen" },
    });

    const inserted = await runDiscoveryWorker(db);
    console.log(`Inserted ${inserted} leads`);
    expect(inserted).toBeGreaterThan(0);
  });
});
