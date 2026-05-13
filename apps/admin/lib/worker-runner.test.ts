/**
 * worker-runner.test.ts — unit tests for the generic pull-loop helper.
 *
 * Tests loop mechanics only. Discovery/research logic is unit-tested separately.
 * Uses real timers with very short delays to avoid fake-timer issues with
 * async while-loops.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb, pipelineJobs } from "@atelier/db";
import { eq } from "drizzle-orm";
import { enqueue, completeJob } from "./queue.js";
import * as queueModule from "./queue.js";

async function makeDb() {
  return await getTestDb();
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

describe("worker-runner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("claims a queued job and calls process", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = await makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const jobId = await enqueue(db, { step: "discovery", payload: { query: "bakkers Gent" } });
    const processed: string[] = [];

    const processor = vi.fn(async (_db: unknown, job: { id: string }) => {
      processed.push(job.id);
      await completeJob(db, job.id);
    });

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: processor as Parameters<typeof startWorker>[0]["process"],
    });

    await waitFor(() => processor.mock.calls.length >= 1);
    stopWorker("discovery");

    expect(processor).toHaveBeenCalledOnce();
    expect(processed[0]).toBe(jobId);

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId));
    expect(rows[0]?.status).toBe("succeeded");
  }, 10000);

  it("calls failJob when processor throws", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = await makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const failJobSpy = vi.spyOn(queueModule, "failJob");

    const jobId = await enqueue(db, { step: "research", payload: { leadId: "lead-1" } });

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
    await new Promise((r) => setTimeout(r, 100));
    stopWorker("research");

    expect(failJobSpy).toHaveBeenCalledWith(db, jobId, "network timeout");

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId));
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.errorMessage).toBe("network timeout");
  }, 10000);

  it("does not process jobs for a different step", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = await makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const researchId = await enqueue(db, { step: "research", payload: { leadId: "l1" } });

    const discoveryProcessor = vi.fn();

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: discoveryProcessor as Parameters<typeof startWorker>[0]["process"],
    });

    await new Promise((r) => setTimeout(r, 200));
    stopWorker("discovery");

    expect(discoveryProcessor).not.toHaveBeenCalled();

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, researchId));
    expect(rows[0]?.status).toBe("queued");
  }, 10000);

  it("two workers with different steps claim only their own jobs", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = await makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    const discId = await enqueue(db, { step: "discovery", payload: { query: "q" } });
    const resId = await enqueue(db, { step: "research", payload: { leadId: "l2" } });

    const discCalls: string[] = [];
    const resCalls: string[] = [];

    const discProcessor = vi.fn(async (_db: unknown, job: { id: string }) => {
      discCalls.push(job.id);
      await completeJob(db, job.id);
    });
    const resProcessor = vi.fn(async (_db: unknown, job: { id: string }) => {
      resCalls.push(job.id);
      await completeJob(db, job.id);
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
    const db = await makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    await enqueue(db, { step: "discovery", payload: { query: "x" } });

    let callCount = 0;
    const processor = vi.fn(async (_db: unknown, job: { id: string }) => {
      callCount++;
      await completeJob(db, job.id);
    });

    startWorker({
      step: "discovery",
      workerName: "discovery-worker",
      process: processor as Parameters<typeof startWorker>[0]["process"],
    });

    await waitFor(() => callCount >= 1);
    stopWorker("discovery");

    await new Promise((r) => setTimeout(r, 200));

    expect(callCount).toBe(1);
  }, 10000);

  it("startWorker is idempotent — calling twice does not double-start", async () => {
    const { startWorker, stopWorker } = await import("./worker-runner.js");
    const db = await makeDb();

    vi.spyOn(await import("./db.js"), "getDb").mockReturnValue(db);

    await enqueue(db, { step: "idempotent-step", payload: { query: "q" } });

    const processor = vi.fn(async (_db: unknown, job: { id: string }) => {
      await completeJob(db, job.id);
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

    expect(processor.mock.calls.length).toBeLessThanOrEqual(1);
  }, 10000);
});
