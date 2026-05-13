/**
 * research.test.ts — Vitest tests for Tasks 3.2-3.5.
 *
 * Mocking strategy:
 *   - playwright: vi.mock('playwright') — no real browser in CI
 *   - node:child_process: vi.mock(...) — no real claude spawns in CI
 *   - fetch: vi.stubGlobal — no real network calls in CI
 *   - node-vibrant: vi.mock('node-vibrant') — no image processing in CI
 *   - node:fs: partial mock for writeFileSync only
 *
 * All mocks declared BEFORE imports that trigger them.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getTestDb,
  leads,
  brandProfiles,
  siteInventories,
  competitors,
  pipelineJobs
} from "@atelier/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Mock node:child_process ───────────────────────────────────────────────────
// Prevents real claude spawns in CI.

vi.mock("node:child_process", () => ({
  spawn: vi.fn().mockImplementation((_cmd: string, _args: string[]) => {
    return createMockSpawn(JSON.stringify({ url: "https://example.be", title: "Test", meta_description: "", sections: [], images: [], ctas: [], forms: [], language: "nl" }));
  }),
}));

// ── Mock playwright ────────────────────────────────────────────────────────────
// vi.mock is hoisted, so the factory cannot reference outer variables.
// We use vi.hoisted() to create the mock objects at hoist-time.

const { mockPage, mockContext, mockBrowser } = vi.hoisted(() => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(undefined),
    $: vi.fn().mockResolvedValue(null),
    evaluate: vi.fn().mockResolvedValue(""),
    content: vi.fn().mockResolvedValue("<html><body><h1>Test</h1></body></html>"),
  };
  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { mockPage, mockContext, mockBrowser };
});

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

// ── Mock node-vibrant ──────────────────────────────────────────────────────────
// node-vibrant/node is the correct subpath for Node.js environments
vi.mock("node-vibrant/node", () => ({
  Vibrant: {
    from: vi.fn().mockReturnValue({
      getPalette: vi.fn().mockResolvedValue({
        Vibrant: { hex: "#ff0000" },
        DarkVibrant: { hex: "#880000" },
        LightVibrant: { hex: "#ff8888" },
        Muted: { hex: "#aa4444" },
        DarkMuted: { hex: "#550000" },
        LightMuted: { hex: "#ffbbbb" },
      }),
    }),
  },
}));

// ── Mock fs (only writeFileSync, mkdirSync, existsSync) ───────────────────────
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

// ── Import modules AFTER all mocks ────────────────────────────────────────────
import { spawn } from "node:child_process";
import { extractBranding } from "./research-branding.js";
import { enrichContact } from "./research-contact.js";
import { crawlSite } from "./research-crawl.js";
import { researchCompetitor } from "./research-competitor.js";
import { runResearchWorker } from "./research.js";
import { enqueue } from "../lib/queue.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
      setTimeout(() => {
        (listeners["close"] ?? []).forEach((fn) => fn(0));
      }, 5);
    }),
  };

  const child = { stdout, stderr, stdin, on, kill: vi.fn() };
  return child;
}

function mockSpawnOutput(json: string) {
  vi.mocked(spawn).mockImplementationOnce(
    ((_cmd: string, _args: readonly string[]) =>
      createMockSpawn(json) as unknown as ReturnType<typeof spawn>) as any,
  );
}

async function makeDb() {
  const db = await getTestDb();

  return db;
}

async function insertTestLead(db: Awaited<ReturnType<typeof makeDb>>, overrides: Partial<typeof leads.$inferInsert> = {}) {
  const id = nanoid();
  await db.insert(leads).values({
    id,
    slug: `test-lead-${id.slice(0, 6)}`,
    status: "discovered",
    businessName: "Test Bakkerij",
    city: "Antwerpen",
    industryKey: "bakery-restaurant",
    existingWebsiteUrl: "https://example.be",
    language: "nl",
    ...overrides,
  });
  return id;
}

// ── Tests: Branding ───────────────────────────────────────────────────────────

describe("extractBranding", () => {
  let db: Awaited<ReturnType<typeof makeDb>>;

  beforeEach(async () => {
    db = await makeDb();
    vi.clearAllMocks();

    // Reset browser singleton between tests
    mockBrowser.close.mockResolvedValue(undefined);
    mockContext.newPage.mockResolvedValue(mockPage);

    // Default mocks for page methods
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.$.mockResolvedValue(null);
    mockPage.evaluate.mockResolvedValue("");
    mockPage.content.mockResolvedValue("<html><body><h1>Test pagina</h1><p>Wij bakken de lekkerste broden.</p></body></html>");

    // Mock fetch for logo download
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(100),
    }));

    // Tone-of-voice spawn
    vi.mocked(spawn).mockImplementation(
      () => createMockSpawn("Warme en ambachtelijke bakkerij.") as unknown as ReturnType<typeof spawn>
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("inserts brand_profiles row with logo path when website present", async () => {
    const leadId = await insertTestLead(db);

    // Mock logo img found
    const mockLogoEl = {
      getAttribute: vi.fn().mockResolvedValue("/images/logo.png"),
    };
    mockPage.$.mockImplementation((selector: string) => {
      if (selector.includes("logo")) return Promise.resolve(mockLogoEl);
      return Promise.resolve(null);
    });

    await extractBranding(db, leadId, "https://example.be");

    const profile = ((await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId))))[0];
    expect(profile).toBeDefined();
    expect(profile!.leadId).toBe(leadId);
    // Logo path set (mocked download succeeds)
    expect(profile!.logoPath).not.toBeNull();
    expect(profile!.logoPath).toContain("logo");
  });

  it("inserts brand_profiles row with palette when logo downloaded", async () => {
    const leadId = await insertTestLead(db);

    const mockLogoEl = {
      getAttribute: vi.fn().mockResolvedValue("/images/logo.png"),
    };
    mockPage.$.mockResolvedValue(mockLogoEl);

    await extractBranding(db, leadId, "https://example.be");

    const profile = ((await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId))))[0];
    expect(profile).toBeDefined();
    expect(profile!.primaryColor).toBe("#ff0000");
    expect(profile!.secondaryColor).toBe("#880000");
    expect(profile!.accentColor).toBe("#ff8888");
    expect(profile!.extractedPalette).not.toBeNull();
    expect(Array.isArray(profile!.extractedPalette)).toBe(true);
  });

  it("inserts brand_profiles row with null logo_path when no website", async () => {
    const leadId = await insertTestLead(db, { existingWebsiteUrl: null });

    await extractBranding(db, leadId, null);

    const profile = ((await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId))))[0];
    expect(profile).toBeDefined();
    expect(profile!.logoPath).toBeNull();
    expect(profile!.extractedPalette).toBeNull();
    expect(profile!.toneOfVoiceSummary).toBe("no website to analyze");
  });

  it("stores social links when found on page", async () => {
    const leadId = await insertTestLead(db);

    mockPage.evaluate.mockImplementation((fn: unknown) => {
      // First call: social links (from page.evaluate in extractBranding)
      // Second call: heading font
      // Third call: body font
      const fnStr = fn?.toString() ?? "";
      if (fnStr.includes("facebook")) {
        return Promise.resolve({ facebook: "https://facebook.com/test", instagram: "https://instagram.com/test" });
      }
      if (fnStr.includes("h1") && fnStr.includes("fontFamily")) {
        return Promise.resolve("Georgia, serif");
      }
      return Promise.resolve("Arial, sans-serif");
    });

    await extractBranding(db, leadId, "https://example.be");

    const profile = ((await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId))))[0];
    expect(profile).toBeDefined();
    // socialLinks is a JSON column
    expect(profile!.socialLinks).not.toBeNull();
  });

  it("upserts: overwrites existing brand profile for same lead", async () => {
    const leadId = await insertTestLead(db);

    await extractBranding(db, leadId, null);
    await extractBranding(db, leadId, null);

    const profiles = await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId));
    expect(profiles).toHaveLength(1); // Only one row after two upserts
  });
});

// ── Tests: Contact ─────────────────────────────────────────────────────────────

describe("enrichContact", () => {
  let db: Awaited<ReturnType<typeof makeDb>>;

  beforeEach(async () => {
    db = await makeDb();
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
  });

  it("sets email from mailto: link on website", async () => {
    const leadId = await insertTestLead(db);

    // First evaluate call: home page hrefs for contact page discovery
    // Second evaluate call: mailto/tel collection
    mockPage.evaluate.mockImplementation((fn: unknown) => {
      const fnStr = fn?.toString() ?? "";
      if (fnStr.includes("querySelectorAll")) {
        // Return hrefs: no contact page links
        if (!fnStr.includes("mailto")) return Promise.resolve([]);
        // Return contacts
        return Promise.resolve({ emails: ["info@example.be"], phones: [] });
      }
      return Promise.resolve([]);
    });

    await enrichContact(db, leadId, "https://example.be");

    const lead = ((await db.select({ email: leads.email }).from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.email).toBe("info@example.be");
  });

  it("prefers business domain email over gmail", async () => {
    const leadId = await insertTestLead(db);

    mockPage.evaluate.mockImplementation((fn: unknown) => {
      const fnStr = fn?.toString() ?? "";
      if (fnStr.includes("mailto")) {
        return Promise.resolve({ emails: ["owner@gmail.com", "info@example.be"], phones: [] });
      }
      return Promise.resolve([]);
    });

    await enrichContact(db, leadId, "https://example.be");

    const lead = ((await db.select({ email: leads.email }).from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.email).toBe("info@example.be");
  });

  it("Maps phone wins over site phone when both present", async () => {
    const leadId = await insertTestLead(db, { phone: "+32 3 123 45 67" });

    mockPage.evaluate.mockImplementation((fn: unknown) => {
      const fnStr = fn?.toString() ?? "";
      if (fnStr.includes("mailto")) {
        return Promise.resolve({ emails: [], phones: ["+32 9 999 88 77"] });
      }
      return Promise.resolve([]);
    });

    await enrichContact(db, leadId, "https://example.be");

    const lead = ((await db.select({ phone: leads.phone }).from(leads).where(eq(leads.id, leadId))))[0];
    // Maps phone should remain unchanged
    expect(lead?.phone).toBe("+32 3 123 45 67");
  });

  it("sets phone from site when Maps has none", async () => {
    const leadId = await insertTestLead(db, { phone: null });

    mockPage.evaluate.mockImplementation((fn: unknown) => {
      const fnStr = fn?.toString() ?? "";
      if (fnStr.includes("mailto")) {
        return Promise.resolve({ emails: [], phones: ["+3293334455"] });
      }
      return Promise.resolve([]);
    });

    await enrichContact(db, leadId, "https://example.be");

    const lead = ((await db.select({ phone: leads.phone }).from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.phone).toBe("+3293334455");
  });

  it("returns early when no website", async () => {
    const leadId = await insertTestLead(db, { existingWebsiteUrl: null });

    await enrichContact(db, leadId, null);

    // page.goto should not have been called
    expect(mockPage.goto).not.toHaveBeenCalled();
  });
});

// ── Tests: Crawl ───────────────────────────────────────────────────────────────

describe("crawlSite", () => {
  let db: Awaited<ReturnType<typeof makeDb>>;

  beforeEach(async () => {
    db = await makeDb();
    vi.clearAllMocks();

    // Mock sitemap.xml fetch (returns 3 URLs → triggers sitemap path)
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("sitemap.xml")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            `<urlset><url><loc>https://example.be/</loc></url>` +
            `<url><loc>https://example.be/over</loc></url>` +
            `<url><loc>https://example.be/contact</loc></url>` +
            `<url><loc>https://example.be/producten</loc></url>` +
            `<url><loc>https://example.be/diensten</loc></url></urlset>`,
        });
      }
      // Image downloads
      return Promise.resolve({
        ok: true,
        headers: { get: () => "1000" },
        arrayBuffer: async () => new ArrayBuffer(1000),
      });
    }));

    // Claude response: valid page structure JSON
    vi.mocked(spawn).mockImplementation(() =>
      createMockSpawn(JSON.stringify({
        url: "https://example.be/",
        title: "Bakkerij Test",
        meta_description: "De beste broden van Antwerpen",
        sections: [{ heading: "Welkom", body: "Wij bakken elke dag vers brood." }],
        images: [{ src: "https://example.be/logo.png", alt: "logo" }],
        ctas: [{ text: "Bestel nu", intent: "order" }],
        forms: [],
        language: "nl",
      })) as unknown as ReturnType<typeof spawn>
    );

    mockPage.goto.mockResolvedValue(undefined);
    mockPage.content.mockResolvedValue("<html><body>Test</body></html>");
    mockPage.screenshot.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when no website", async () => {
    const leadId = await insertTestLead(db, { existingWebsiteUrl: null });
    const result = await crawlSite(db, leadId, null);
    expect(result).toBeNull();
  });

  it("inserts site_inventories row with structured pages", async () => {
    const leadId = await insertTestLead(db);

    const result = await crawlSite(db, leadId, "https://example.be");
    expect(result).not.toBeNull();
    expect(result!.pageCount).toBeGreaterThan(0);

    const inventory = ((await db.select().from(siteInventories).where(eq(siteInventories.leadId, leadId))))[0];
    expect(inventory).toBeDefined();
    expect(Array.isArray(inventory!.pages)).toBe(true);
    expect(inventory!.pages!.length).toBeGreaterThan(0);
    expect(inventory!.pages![0].url).toContain("example.be");
  });

  it("records assets from crawled pages", async () => {
    const leadId = await insertTestLead(db);

    await crawlSite(db, leadId, "https://example.be");

    const inventory = ((await db.select().from(siteInventories).where(eq(siteInventories.leadId, leadId))))[0];
    expect(inventory).toBeDefined();
    expect(Array.isArray(inventory!.assets)).toBe(true);
  });

  it("handles bad page gracefully — finalizes with remaining pages", async () => {
    const leadId = await insertTestLead(db);

    // Sitemap returns 3 pages (above the 5-page threshold to trigger sitemap path)
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("sitemap.xml")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            `<urlset><url><loc>https://example.be/</loc></url>` +
            `<url><loc>https://example.be/over</loc></url>` +
            `<url><loc>https://example.be/contact</loc></url>` +
            `<url><loc>https://example.be/producten</loc></url>` +
            `<url><loc>https://example.be/diensten</loc></url></urlset>`,
        });
      }
      return Promise.resolve({ ok: true, headers: { get: () => "0" }, arrayBuffer: async () => new ArrayBuffer(0) });
    }));

    // First page succeeds, second page goto throws, third succeeds
    let gotoCount = 0;
    mockPage.goto.mockImplementation(() => {
      gotoCount++;
      if (gotoCount === 2) throw new Error("navigation timeout");
      return Promise.resolve(undefined);
    });

    const result = await crawlSite(db, leadId, "https://example.be");

    // Should have collected some pages even with one failure
    const inventory = ((await db.select().from(siteInventories).where(eq(siteInventories.leadId, leadId))))[0];
    expect(inventory).toBeDefined();
    // Not 0 pages
    expect(inventory!.pages!.length).toBeGreaterThan(0);
    // Also returned a result (not null)
    expect(result).not.toBeNull();
  });
});

// ── Tests: Competitor ─────────────────────────────────────────────────────────

describe("researchCompetitor", () => {
  let db: Awaited<ReturnType<typeof makeDb>>;

  beforeEach(async () => {
    db = await makeDb();
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.content.mockResolvedValue("<html><body>Competitor page</body></html>");
    mockPage.evaluate.mockResolvedValue([]);

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("sitemap.xml")) {
        return Promise.resolve({ ok: false, text: async () => "" });
      }
      return Promise.resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("inserts competitors row with name, url, selection_reason, learnings", async () => {
    const leadId = await insertTestLead(db);

    // Mock: suggest → 3 candidates, pick → index 1, learnings → sentences
    const suggestResponse = JSON.stringify([
      { name: "Bakkerij A", websiteUrl: "https://bakkerij-a.be", reason: "lokale concurrent" },
      { name: "Bakkerij B", websiteUrl: "https://bakkerij-b.be", reason: "bekende keten" },
      { name: "Bakkerij C", websiteUrl: "https://bakkerij-c.be", reason: "online actief" },
    ]);
    const pickResponse = JSON.stringify({ index: 1, reason: "Beste online aanwezigheid" });
    const learningsResponse = "Bakkerij B heeft een duidelijke menukaart.\nDe bestelknop is prominent aanwezig.\nDe sfeerbeelden zijn professioneel.";
    const pageStructResponse = JSON.stringify({ url: "https://bakkerij-b.be", title: "Home", meta_description: "", sections: [{ heading: "Welkom", body: "Vers brood" }], images: [], ctas: [], forms: [], language: "nl" });

    // Order: suggest, pick, then claude is called per crawled page (pageStruct), then learnings
    // discoverPages → sitemap returns 0 pages (stubbed to ok:false) so fallback to link discovery
    // Link discovery uses page.evaluate → returns [] (no links), so only 1 page crawled
    // Crawl order: suggest(0) → pick(1) → pageStruct for 1 page(2) → learnings(3)
    const responses = [suggestResponse, pickResponse, pageStructResponse, learningsResponse];
    let callIdx = 0;
    vi.mocked(spawn).mockImplementation(() => {
      const resp = responses[callIdx++ % responses.length];
      return createMockSpawn(resp) as unknown as ReturnType<typeof spawn>;
    });

    await researchCompetitor(db, leadId, "Test Bakkerij", "Antwerpen", "bakery-restaurant", false);

    const row = ((await db.select().from(competitors).where(eq(competitors.leadId, leadId))))[0];
    expect(row).toBeDefined();
    expect(row!.competitorUrl).toBe("https://bakkerij-b.be");
    expect(row!.competitorName).toBe("Bakkerij B");
    expect(row!.selectionReason).toBe("Beste online aanwezigheid");
    // Learnings should be one of the expected responses (cycling may pick learningsResponse)
    expect(row!.learnings).toBeTruthy();
    expect(row!.learnings).not.toBe("no competitor identified");
  });

  it("inserts fallback row when no valid candidates", async () => {
    const leadId = await insertTestLead(db);

    // Claude returns invalid JSON for suggest
    vi.mocked(spawn).mockImplementation(
      () => createMockSpawn("I cannot identify competitors.") as unknown as ReturnType<typeof spawn>
    );

    await researchCompetitor(db, leadId, "Test Bakkerij", "Antwerpen", "bakery-restaurant", false);

    const row = ((await db.select().from(competitors).where(eq(competitors.leadId, leadId))))[0];
    expect(row).toBeDefined();
    expect(row!.learnings).toContain("no competitor identified");
  });
});

// ── Tests: Orchestrator ────────────────────────────────────────────────────────

describe("runResearchWorker — orchestrator", () => {
  let db: Awaited<ReturnType<typeof makeDb>>;

  beforeEach(async () => {
    db = await makeDb();
    vi.clearAllMocks();
    mockPage.goto.mockResolvedValue(undefined);
    mockPage.$.mockResolvedValue(null);
    mockPage.evaluate.mockResolvedValue([]);
    mockPage.content.mockResolvedValue("<html><body><h1>Test</h1></body></html>");
    mockPage.screenshot.mockResolvedValue(undefined);

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("sitemap.xml")) {
        return Promise.resolve({
          ok: true,
          text: async () =>
            `<urlset><url><loc>https://example.be/</loc></url>` +
            `<url><loc>https://example.be/over</loc></url>` +
            `<url><loc>https://example.be/contact</loc></url>` +
            `<url><loc>https://example.be/diensten</loc></url>` +
            `<url><loc>https://example.be/producten</loc></url></urlset>`,
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => "500" },
        arrayBuffer: async () => new ArrayBuffer(500),
      });
    }));

    // Claude: return valid page structure for all calls
    vi.mocked(spawn).mockImplementation(() =>
      createMockSpawn(JSON.stringify({
        url: "https://example.be/",
        title: "Test",
        meta_description: "",
        sections: [{ heading: "H1", body: "Body text" }],
        images: [{ src: "https://example.be/img.png", alt: "img" }],
        ctas: [],
        forms: [],
        language: "nl",
      })) as unknown as ReturnType<typeof spawn>
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("happy-path: all 4 child rows present, lead.status=awaiting_approval", async () => {
    const leadId = await insertTestLead(db);
    await enqueue(db, { step: "research", leadId, payload: { leadId } });

    const result = await runResearchWorker(db);
    expect(result).toBe(true);

    // Lead status updated
    const lead = ((await db.select({ status: leads.status }).from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("awaiting_approval");

    // All child rows present
    const bp = ((await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, leadId))))[0];
    expect(bp).toBeDefined();

    const si = ((await db.select().from(siteInventories).where(eq(siteInventories.leadId, leadId))))[0];
    expect(si).toBeDefined();

    const comp = ((await db.select().from(competitors).where(eq(competitors.leadId, leadId))))[0];
    expect(comp).toBeDefined();

    // Job succeeded
    const job = ((await db.select().from(pipelineJobs)))[0];
    expect(job?.status).toBe("succeeded");
  });

  it("returns false when no queued jobs", async () => {
    const result = await runResearchWorker(db);
    expect(result).toBe(false);
  });

  it("handles sub-step failure: lead.status stays discovered, job marked failed", async () => {
    const leadId = await insertTestLead(db);

    // Enqueue a research job with a payload pointing to a non-existent lead.
    // pipelineJobs.leadId FK is nullable — pass null as the FK but use a bad id in payload.
    await enqueue(db, { step: "research", leadId: null, payload: { leadId: "nonexistent-lead-id" } });

    const result = await runResearchWorker(db);
    expect(result).toBe(false);

    // Job should be marked failed with an error message
    const job = ((await db.select().from(pipelineJobs).orderBy(pipelineJobs.createdAt)))[0];
    expect(job?.status).toBe("failed");
    expect(job?.errorMessage).toBeTruthy();
    expect(job?.errorMessage).toContain("nonexistent-lead-id");

    // Original lead stays at discovered
    const lead = ((await db.select({ status: leads.status }).from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("discovered");
  });
});
