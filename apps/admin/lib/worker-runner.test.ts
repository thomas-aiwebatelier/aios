/**
 * worker-runner.test.ts — unit tests for the generic pull-loop helper.
 *
 * Tests loop mechanics only. Discovery/research logic is unit-tested separately.
 * Uses real timers with very short delays to avoid fake-timer issues with
 * async while-loops.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDb, createSchema, pipelineJobs } from "@atelier/db";
import { eq } from "drizzle-orm";
import { enqueue, completeJob } from "./queue.js";
import * as queueModule from "./queue.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDb() {
  const db = createDb(":memory:");
  createSchema(db);
  return db;
}

/** Wait for real async events to settle */
async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000,
  intervalMs = 10,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("worker-runner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("claims a queued job and calls process", async () => {
    // Import fresh module (isolated state)
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const jobId = enqueue(db, { step: "discovery", payload: { query: "bakkers Gent" } });
    const processed: string[] = [];

    const processor = vi.fn(async (_db: unknown, job: { id: string }) => {
      processed.push(job.id);
      completeJob(db, job.id);
    });

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: processor as Parameters<typeof startWorker>[0]["process"],
    });

    // Wait until processor is called
    await waitFor(() => processor.mock.calls.length >= 1);
    stopWorker("discovery");

    expect(processor).toHaveBeenCalledOnce();
    expect(processed[0]).toBe(jobId);

    const row = db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId)).get();
    expect(row?.status).toBe("succeeded");
  }, 10000);

  it("calls failJob when processor throws", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const failJobSpy = vi.spyOn(queueModule, "failJob");

    const jobId = enqueue(db, { step: "research", payload: { leadId: "lead-1" } });

    let threw = false;
    startWorker({
      step: "research",
      workerName: "research-worker",
      process: async () => {
        threw = true;
        throw new Error("network timeout");
      },
    });

    await waitFor(() => threw);
    // Give failJob a moment to be called after the throw
    await new Promise((r) => setTimeout(r, 50));
    stopWorker("research");

    expect(failJobSpy).toHaveBeenCalledWith(db, jobId, "network timeout");

    const row = db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId)).get();
    expect(row?.status).toBe("failed");
    expect(row?.errorMessage).toBe("network timeout");
  }, 10000);

  it("does not process jobs for a different step", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    // Enqueue a 'research' job only
    const researchId = enqueue(db, { step: "research", payload: { leadId: "l1" } });

    const discoveryProcessor = vi.fn();

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: discoveryProcessor as Parameters<typeof startWorker>[0]["process"],
    });

    // Wait longer than one poll cycle to confirm nothing was claimed
    await new Promise((r) => setTimeout(r, 150));
    stopWorker("discovery");

    expect(discoveryProcessor).not.toHaveBeenCalled();

    const row = db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, researchId))
      .get();
    expect(row?.status).toBe("queued");
  }, 10000);

  it("two workers with different steps claim only their own jobs", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const discId = enqueue(db, { step: "discovery", payload: { query: "q" } });
    const resId = enqueue(db, { step: "research", payload: { leadId: "l2" } });

    const discCalls: string[] = [];
    const resCalls: string[] = [];

    const discProcessor = vi.fn(async (_db: unknown, job: { id: string }) => {
      discCalls.push(job.id);
      completeJob(db, job.id);
    });
    const resProcessor = vi.fn(async (_db: unknown, job: { id: string }) => {
      resCalls.push(job.id);
      completeJob(db, job.id);
    });

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: discProcessor as Parameters<typeof startWorker>[0]["process"],
    });
    startWorker({
      step: "research",
      workerName: "research-worker",
      process: resProcessor as Parameters<typeof startWorker>[0]["process"],
    });

    await waitFor(() => discCalls.length >= 1 && resCalls.length >= 1);
    stopWorker("discovery");
    stopWorker("research");

    expect(discCalls[0]).toBe(discId);
    expect(resCalls[0]).toBe(resId);
  }, 10000);

  it("stopWorker breaks the loop without double-processing", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    enqueue(db, { step: "discovery", payload: { query: "x" } });

    let callCount = 0;
    const processor = vi.fn(async (_db: unknown, job: { id: string }) => {
      callCount++;
      completeJob(db, job.id);
    });

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: processor as Parameters<typeof startWorker>[0]["process"],
    });

    // Wait until the one job is processed
    await waitFor(() => callCount >= 1);
    stopWorker("discovery");

    // Wait another full poll cycle — should not process again (queue empty)
    await new Promise((r) => setTimeout(r, 150));

    expect(callCount).toBe(1);
  }, 10000);

  it("startWorker is idempotent — calling twice does not double-start", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    // Enqueue first so the loop can claim immediately on first poll
    enqueue(db, { step: "idempotent-step", payload: { query: "q" } });

    const processor = vi.fn(async (_db: unknown, job: { id: string }) => {
      completeJob(db, job.id);
    });
    const spec = {
      step: "idempotent-step",
      workerName: "idempotent-worker",
      process: processor as Parameters<typeof startWorker>[0]["process"],
    };

    startWorker(spec);
    startWorker(spec); // second call should be a no-op

    await waitFor(() => processor.mock.calls.length >= 1);
    stopWorker("idempotent-step");

    // At most 1 call — only one loop running
    expect(processor.mock.calls.length).toBeLessThanOrEqual(1);
  }, 10000);
});
