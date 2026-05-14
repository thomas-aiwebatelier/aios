/**
 * integration.test.ts — End-to-end poll-loop integration against pglite.
 *
 * Boots the poll-loop with the real processors (generation + deploy) wired
 * in, but with the external boundaries mocked: claude CLI subprocess,
 * pnpm/astro subprocesses, cloudflare REST, wrangler subprocess, PSI.
 *
 * Verifies:
 *   - A generate job in the queue gets claimed, processed, and succeeds
 *   - The processor enqueues a deploy job on success
 *   - The deploy job is then claimed by the next pollOnce and succeeds
 *   - The lead status walks approved → generating → generated → deployed
 *   - The worker_heartbeats row is upserted
 *
 * This is the only test that runs both processors against a shared DB —
 * unit tests pin individual layers.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  getTestDb,
  leads,
  generatedSites,
  pipelineJobs,
  workerHeartbeats,
} from "@atelier/db";

// ── Mock external boundaries BEFORE imports ───────────────────────────────────

vi.mock("node:child_process", () => ({
  // execSync drives pnpm install / astro check / astro build / wrangler.
  // Return a plausible wrangler stdout so the URL parser finds a match.
  execSync: vi.fn().mockReturnValue(
    Buffer.from(
      "✨ Deployment complete! Take a peek over at https://abc12345.test-slug.pages.dev\n",
    ),
  ),
  // spawn drives the claude CLI. Return a fake child that closes with code 0.
  spawn: vi.fn().mockImplementation(() => createFakeChild()),
}));

vi.mock("./lib/generated-sites-fs.js", () => ({
  resetProjectDir: vi
    .fn()
    .mockReturnValue("C:\\mock\\generated-sites\\test-slug"),
  getProjectPath: vi
    .fn()
    .mockReturnValue("C:\\mock\\generated-sites\\test-slug"),
  ensureProjectDir: vi
    .fn()
    .mockReturnValue("C:\\mock\\generated-sites\\test-slug"),
  cleanProjectDir: vi.fn(),
}));

vi.mock("./lib/claude-code.js", () => ({
  runClaudeCode: vi.fn().mockResolvedValue("fake claude output"),
}));

vi.mock("./lib/cloudflare.js", () => ({
  getPagesProject: vi.fn().mockResolvedValue({ exists: false }),
  createPagesProject: vi.fn().mockResolvedValue(undefined),
  deployToPages: vi.fn().mockResolvedValue({
    canonicalUrl: "https://test-slug.pages.dev",
    deploymentUrl: "https://abc12345.test-slug.pages.dev",
  }),
  deletePagesProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./lib/psi.js", () => ({
  runPagespeedInsights: vi.fn().mockResolvedValue({
    performance: 95,
    accessibility: 98,
    seo: 92,
    bestPractices: 100,
  }),
}));

vi.mock("../../../skills/atelier-design-system/quality-checks.js", () => ({
  runQualityChecks: vi
    .fn()
    .mockResolvedValue({ ok: true, failures: [], details: {} }),
}));

// ── Imports AFTER mocks ────────────────────────────────────────────────────────

import { pollOnce } from "./poll-loop.js";
import { processGenerationJob } from "./generation.js";
import { processDeployJob } from "./deploy.js";
import { writeHeartbeat, getHostInfo } from "./heartbeat.js";

function createFakeChild() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  const child: Record<string, unknown> = {
    stdout: {
      on(event: string, fn: (chunk: Buffer) => void) {
        if (event === "data") setTimeout(() => fn(Buffer.from("fake stdout\n")), 0);
        return child.stdout;
      },
    },
    stderr: {
      on() {
        return child.stderr;
      },
    },
    stdin: {
      write: vi.fn(),
      end: vi.fn(() => {
        setTimeout(() => {
          (listeners.close ?? []).forEach((fn) => fn(0));
        }, 5);
      }),
    },
    on(event: string, fn: (...args: unknown[]) => void) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(fn);
      return child;
    },
    kill: vi.fn(),
  };
  return child;
}

describe("local-worker integration", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;

  beforeEach(async () => {
    db = await getTestDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("poll-loop drives a lead through generate then deploy end-to-end", async () => {
    // Use fake timers so the 15s CDN propagation wait in processDeployJob
    // doesn't block the test for 15 real seconds. The deploy processor's
    // heartbeat interval is also collapsed by runAllTimersAsync.
    vi.useFakeTimers();

    // Setup: lead + queued generate job
    const leadId = nanoid();
    await db.insert(leads).values({
      id: leadId,
      slug: "test-slug",
      status: "approved",
      businessName: "Test Bakkerij",
      city: "Antwerpen",
      industryKey: "bakery-restaurant",
      language: "nl",
    });

    const generateJobId = nanoid();
    await db.insert(pipelineJobs).values({
      id: generateJobId,
      leadId,
      pipelineStep: "generate",
      status: "queued",
      payload: { leadId },
      attemptCount: 0,
    });

    // Tick 1: poll claims + runs generate
    const claimed1 = await pollOnce(db, {
      steps: ["generate", "deploy"],
      workerName: "local-worker",
      processors: {
        generate: processGenerationJob,
        deploy: processDeployJob,
      },
    });
    expect(claimed1).toBe(true);

    // Lead is now 'generated', generate job succeeded, deploy job enqueued
    const leadAfter1 = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(leadAfter1.status).toBe("generated");

    const generateAfter = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, generateJobId))
      ))[0];
    expect(generateAfter.status).toBe("succeeded");

    const deployJobs = await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "deploy"));
    expect(deployJobs).toHaveLength(1);
    expect(deployJobs[0].status).toBe("queued");

    // Tick 2: poll claims + runs deploy. processDeployJob waits 15s for CDN
    // propagation; advance fake timers so it resolves immediately.
    const tick2 = pollOnce(db, {
      steps: ["generate", "deploy"],
      workerName: "local-worker",
      processors: {
        generate: processGenerationJob,
        deploy: processDeployJob,
      },
    });
    await vi.runAllTimersAsync();
    const claimed2 = await tick2;
    expect(claimed2).toBe(true);

    // Lead is now 'deployed', deploy succeeded, site row populated
    const leadAfter2 = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(leadAfter2.status).toBe("deployed");

    const deployAfter = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, deployJobs[0].id))
      ))[0];
    expect(deployAfter.status).toBe("succeeded");

    const sites = await db
      .select()
      .from(generatedSites)
      .where(eq(generatedSites.leadId, leadId));
    expect(sites).toHaveLength(1);
    expect(sites[0].cloudflarePreviewUrl).toBe("https://test-slug.pages.dev");
    expect(sites[0].lighthouseScores).toMatchObject({
      performance: 95,
      accessibility: 98,
    });
  });

  it("writes a worker_heartbeats row when writeHeartbeat is invoked", async () => {
    await writeHeartbeat(db, "local-worker", getHostInfo());

    const row = ((await db
      .select()
      .from(workerHeartbeats)
      .where(eq(workerHeartbeats.workerName, "local-worker"))
      ))[0];
    expect(row).toBeDefined();
    expect(row.lastSeenAt).toBeInstanceOf(Date);
    expect(row.hostInfo?.platform).toBe(process.platform);
  });
});
