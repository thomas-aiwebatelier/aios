/**
 * teardown-declined.test.ts — Task 4.10
 *
 * Unit tests for tearDownDeclinedLeads().
 * Uses an in-memory SQLite DB. Mocks deletePagesProject, rmSync, existsSync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTestDb,
  leads
} from "@atelier/db";
import { eq } from "drizzle-orm";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock cloudflare module
vi.mock("../../apps/admin/lib/cloudflare.js", () => ({
  deletePagesProject: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs — existsSync always returns false (no dirs to remove) by default;
// individual tests can override.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    rmSync: vi.fn(),
  };
});

// Mock logger to suppress noise
vi.mock("../../apps/admin/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock getDb to return our in-memory db
let _testDb: ReturnType<typeof createDb>;

vi.mock("../../apps/admin/lib/db.js", () => ({
  getDb: () => _testDb,
}));

// ── Import SUT after mocks ────────────────────────────────────────────────────

import { tearDownDeclinedLeads } from "./teardown-declined.js";
import { deletePagesProject } from "../../apps/admin/lib/cloudflare.js";
import { existsSync, rmSync } from "node:fs";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<{
  id: string;
  slug: string;
  businessName: string;
  status: typeof leads.$inferInsert["status"];
  updatedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? `lead-${Math.random().toString(36).slice(2)}`,
    slug: overrides.slug ?? `test-slug-${Math.random().toString(36).slice(2)}`,
    businessName: overrides.businessName ?? "Test Bedrijf",
    status: overrides.status ?? "declined",
    city: "Antwerpen",
    industryKey: "retail",
    updatedAt: overrides.updatedAt ?? new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
  } satisfies typeof leads.$inferInsert;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("tearDownDeclinedLeads", () => {
  beforeEach(async () => {
    _testDb = await getTestDb();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tears down a declined lead older than 24h", async () => {
    const lead = makeLead({ updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });
    _testDb.insert(leads).values(lead);

    const count = await tearDownDeclinedLeads();

    expect(count).toBe(1);
    expect(deletePagesProject).toHaveBeenCalledWith(lead.slug);

    const updated = _testDb.select().from(leads).where(eq(leads.id, lead.id)).get();
    expect(updated?.status).toBe("archived");
  });

  it("removes local project dir when it exists", async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const lead = makeLead();
    _testDb.insert(leads).values(lead);

    await tearDownDeclinedLeads();

    // rmSync should have been called (for the project dir and/or assets dir)
    expect(rmSync).toHaveBeenCalled();
  });

  it("does NOT tear down a declined lead updated only 1h ago", async () => {
    const lead = makeLead({ updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) });
    _testDb.insert(leads).values(lead);

    const count = await tearDownDeclinedLeads();

    expect(count).toBe(0);
    expect(deletePagesProject).not.toHaveBeenCalled();

    const unchanged = _testDb.select().from(leads).where(eq(leads.id, lead.id)).get();
    expect(unchanged?.status).toBe("declined");
  });

  it("never tears down an approved lead regardless of age", async () => {
    const lead = makeLead({
      status: "approved",
      updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    });
    _testDb.insert(leads).values(lead);

    const count = await tearDownDeclinedLeads();

    expect(count).toBe(0);
    expect(deletePagesProject).not.toHaveBeenCalled();
  });

  it("continues with local cleanup + status flip when deletePagesProject throws", async () => {
    vi.mocked(deletePagesProject).mockRejectedValueOnce(
      new Error("CF API 500"),
    );

    const lead = makeLead();
    _testDb.insert(leads).values(lead);

    // Should not throw
    const count = await tearDownDeclinedLeads();
    expect(count).toBe(1);

    // Lead should still be archived despite CF failure
    const updated = _testDb.select().from(leads).where(eq(leads.id, lead.id)).get();
    expect(updated?.status).toBe("archived");
  });

  it("processes multiple stale declined leads", async () => {
    const lead1 = makeLead({ id: "lead-a", slug: "slug-a" });
    const lead2 = makeLead({ id: "lead-b", slug: "slug-b" });
    _testDb.insert(leads).values([lead1, lead2]);

    const count = await tearDownDeclinedLeads();

    expect(count).toBe(2);
    expect(deletePagesProject).toHaveBeenCalledTimes(2);

    const a = _testDb.select().from(leads).where(eq(leads.id, "lead-a")).get();
    const b = _testDb.select().from(leads).where(eq(leads.id, "lead-b")).get();
    expect(a?.status).toBe("archived");
    expect(b?.status).toBe("archived");
  });
});
