/**
 * generation.test.ts — Vitest tests for Task 4.1.
 *
 * Six scenarios:
 *   1. Happy path — success on first attempt
 *   2. First build fails, second succeeds — retry works
 *   3. Both attempts fail — lead status = generation_failed
 *   4. Greenfield mode (no site_inventory) — bundle still composed, success
 *   5. Version increment — re-running for lead with existing version=2 → new row has version=3
 *   6. Missing brand_profiles — uses null brand, no crash
 *
 * All external I/O is mocked so no real disk, no real claude, no real build.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getTestDb,
  leads,
  brandProfiles,
  siteInventories,
  competitors,
  generatedSites,
  pipelineJobs
} from "@atelier/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Mock node:child_process (execSync for pnpm install / astro check / astro build) ──

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockReturnValue(Buffer.from("ok")),
  spawn: vi.fn().mockImplementation((_cmd: string, _args: string[]) => {
    return createMockSpawn("generated site output");
  }),
}));

// ── Mock node:fs (only the FS mutation fns — NOT readFileSync so createSchema works) ──

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(false), // default: dir does not exist yet
    // readFileSync is NOT mocked — actual is used (createSchema needs it).
    // The generation worker's readSkillFile has a try/catch that returns a
    // placeholder string if skill files aren't found, so tests pass even without
    // real skill files on the test runner.
  };
});

// ── Mock generated-sites-fs ───────────────────────────────────────────────────

vi.mock("../lib/generated-sites-fs.js", () => ({
  getProjectPath: vi.fn().mockReturnValue("/mock/generated-sites/test-slug"),
  ensureProjectDir: vi.fn().mockReturnValue("/mock/generated-sites/test-slug"),
  cleanProjectDir: vi.fn(),
  resetProjectDir: vi.fn().mockReturnValue("/mock/generated-sites/test-slug"),
}));

// ── Mock claude-code ──────────────────────────────────────────────────────────

vi.mock("../lib/claude-code.js", () => ({
  runClaudeCode: vi.fn().mockResolvedValue("claude code output"),
}));

// ── Mock quality-checks ───────────────────────────────────────────────────────

vi.mock("../../../skills/atelier-design-system/quality-checks.js", () => ({
  runQualityChecks: vi.fn().mockResolvedValue({ ok: true, failures: [], details: {} }),
}));

// ── Import modules AFTER all mocks ────────────────────────────────────────────

import { execSync } from "node:child_process";
import { spawn } from "node:child_process";
import { processGenerationJob } from "./generation.js";
import { runClaudeCode } from "../lib/claude-code.js";
import { resetProjectDir } from "../lib/generated-sites-fs.js";
import { runQualityChecks } from "../../../skills/atelier-design-system/quality-checks.js";

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
    on(_event: string, _fn: (...args: unknown[]) => void) {
      return stderr;
    },
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

async function makeDb() {
  const db = await getTestDb();

  return db;
}

async function insertTestLead(
  db: Awaited<ReturnType<typeof makeDb>>,
  overrides: Partial<typeof leads.$inferInsert> = {},
) {
  const id = nanoid();
  await db.insert(leads)
    .values({
      id,
      slug: `test-bakkerij-antwerpen`,
      status: "approved",
      businessName: "Test Bakkerij",
      city: "Antwerpen",
      industryKey: "bakery-restaurant",
      existingWebsiteUrl: "https://example.be",
      language: "nl",
      ...overrides,
    })
;
  return id;
}

async function insertBrandProfile(db: Awaited<ReturnType<typeof makeDb>>, leadId: string) {
  await db.insert(brandProfiles)
    .values({
      id: nanoid(),
      leadId,
      primaryColor: "#c8a96e",
      toneOfVoiceSummary: "Warm and artisanal",
    })
;
}

async function insertSiteInventory(db: Awaited<ReturnType<typeof makeDb>>, leadId: string) {
  await db.insert(siteInventories)
    .values({
      id: nanoid(),
      leadId,
      pages: [{ url: "https://example.be", title: "Home" }],
    })
;
}

async function insertCompetitor(db: Awaited<ReturnType<typeof makeDb>>, leadId: string) {
  await db.insert(competitors)
    .values({
      id: nanoid(),
      leadId,
      competitorUrl: "https://competitor.be",
      competitorName: "Competitor Bakkerij",
    })
;
}

function makeJob(leadId: string): Parameters<typeof processGenerationJob>[1] {
  return { id: nanoid(), payload: { leadId }, leadId };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("processGenerationJob", () => {
  let db: Awaited<ReturnType<typeof makeDb>>;

  beforeEach(async () => {
    db = await makeDb();
    vi.clearAllMocks();
    // Reset mocks to default success state
    vi.mocked(runClaudeCode).mockResolvedValue("claude output");
    vi.mocked(runQualityChecks).mockResolvedValue({ ok: true, failures: [], details: {} as never });
    vi.mocked(execSync).mockReturnValue(Buffer.from("ok"));
    vi.mocked(resetProjectDir).mockReturnValue("/mock/generated-sites/test-bakkerij-antwerpen");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Scenario 1: Happy path ──────────────────────────────────────────────────

  it("happy path — completes, lead status = generated, generated_sites row created with version=1, deploy job enqueued", async () => {
    const leadId = await insertTestLead(db);
    insertBrandProfile(db, leadId);
    insertSiteInventory(db, leadId);
    await insertCompetitor(db, leadId);

    const job = makeJob(leadId);
    await processGenerationJob(db, job);

    // Lead status flipped to 'generated'
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("generated");

    // generated_sites row with version=1
    const site = ((await db.select().from(generatedSites).where(eq(generatedSites.leadId, leadId))))[0];
    expect(site).toBeDefined();
    expect(site?.version).toBe(1);
    expect(site?.createdVia).toBe("initial_generation");

    // Deploy job enqueued
    const deployJob = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "deploy"))
      ))[0];
    expect(deployJob).toBeDefined();
    expect((deployJob?.payload as { leadId: string })?.leadId).toBe(leadId);

    // runClaudeCode called once
    expect(runClaudeCode).toHaveBeenCalledTimes(1);
  });

  // ── Scenario 2: First build fails, second succeeds ──────────────────────────

  it("first build fails, second succeeds — status=generated, deploy job enqueued once, version=1", async () => {
    const leadId = await insertTestLead(db, { slug: "test-bakkerij-2" });
    vi.mocked(resetProjectDir).mockReturnValue("/mock/generated-sites/test-bakkerij-2");

    // First call to execSync (pnpm install) throws on attempt 1
    let execCallCount = 0;
    vi.mocked(execSync).mockImplementation(() => {
      execCallCount++;
      if (execCallCount === 1) {
        const err = new Error("pnpm install failed");
        throw err;
      }
      return Buffer.from("ok");
    });

    const job = makeJob(leadId);
    await processGenerationJob(db, job);

    // Lead status = generated
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("generated");

    // Only one generated_sites row (from successful attempt 2)
    const sites = await db.select().from(generatedSites).where(eq(generatedSites.leadId, leadId));
    expect(sites).toHaveLength(1);
    expect(sites[0].version).toBe(1);

    // Deploy job enqueued exactly once
    const deployJobs = await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "deploy"))
;
    expect(deployJobs).toHaveLength(1);

    // runClaudeCode called twice (one per attempt)
    expect(runClaudeCode).toHaveBeenCalledTimes(2);
  });

  // ── Scenario 3: Both attempts fail ─────────────────────────────────────────

  it("both attempts fail — status=generation_failed, generated_sites row inserted, no deploy", async () => {
    const leadId = await insertTestLead(db, { slug: "test-bakkerij-fail" });
    vi.mocked(resetProjectDir).mockReturnValue("/mock/generated-sites/test-bakkerij-fail");

    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("build always fails");
    });

    const job = makeJob(leadId);
    await expect(processGenerationJob(db, job)).rejects.toThrow();

    // Lead status = generation_failed
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("generation_failed");

    // generated_sites row inserted (records the failed attempt)
    const site = ((await db.select().from(generatedSites).where(eq(generatedSites.leadId, leadId))))[0];
    expect(site).toBeDefined();

    // No deploy job
    const deployJob = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "deploy"))
      ))[0];
    expect(deployJob).toBeUndefined();

    // runClaudeCode called twice
    expect(runClaudeCode).toHaveBeenCalledTimes(2);
  });

  // ── Scenario 4: Greenfield (no site_inventory) ──────────────────────────────

  it("greenfield mode — no site_inventory, bundle composed, claude called once, success", async () => {
    const leadId = await insertTestLead(db, { slug: "test-bakkerij-green" });
    vi.mocked(resetProjectDir).mockReturnValue("/mock/generated-sites/test-bakkerij-green");
    insertBrandProfile(db, leadId);
    // No site inventory, no competitor

    const job = makeJob(leadId);
    await processGenerationJob(db, job);

    // Lead status = generated
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("generated");

    // runClaudeCode called once
    expect(runClaudeCode).toHaveBeenCalledTimes(1);

    // The prompt bundle passed to runClaudeCode should include null for inventory
    const promptArg = vi.mocked(runClaudeCode).mock.calls[0][0] as string;
    expect(promptArg).toContain("null"); // siteInventory is null → JSON.stringify(null)
    expect(promptArg).toContain("Test Bakkerij");
  });

  // ── Scenario 5: Version increment ──────────────────────────────────────────

  it("version increment — lead with existing version=2 gets new row with version=3", async () => {
    const leadId = await insertTestLead(db, { slug: "test-bakkerij-v3" });
    vi.mocked(resetProjectDir).mockReturnValue("/mock/generated-sites/test-bakkerij-v3");

    // Pre-insert two generated_sites rows for this lead (simulating prior runs)
    await db.insert(generatedSites)
      .values({
        id: nanoid(),
        leadId,
        version: 1,
        astroProjectPath: "/mock/v1",
        createdVia: "initial_generation",
      })
;
    await db.insert(generatedSites)
      .values({
        id: nanoid(),
        leadId,
        version: 2,
        astroProjectPath: "/mock/v2",
        createdVia: "initial_generation",
      })
;

    const job = makeJob(leadId);
    await processGenerationJob(db, job);

    const sites = await db
      .select()
      .from(generatedSites)
      .where(eq(generatedSites.leadId, leadId))
;
    expect(sites).toHaveLength(3);

    const newest = sites.find((s) => s.astroProjectPath !== "/mock/v1" && s.astroProjectPath !== "/mock/v2");
    expect(newest?.version).toBe(3);
  });

  // ── Scenario 6: Missing brand_profiles ────────────────────────────────────

  it("missing brand_profiles — uses null brand, no crash, status=generated", async () => {
    const leadId = await insertTestLead(db, { slug: "test-bakkerij-nobrand" });
    vi.mocked(resetProjectDir).mockReturnValue("/mock/generated-sites/test-bakkerij-nobrand");
    // No brand profile inserted
    insertSiteInventory(db, leadId);

    const job = makeJob(leadId);
    await processGenerationJob(db, job);

    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("generated");

    // Should have still called claude
    expect(runClaudeCode).toHaveBeenCalledTimes(1);
  });
});
