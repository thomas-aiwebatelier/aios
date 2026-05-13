import { describe, it, expect, beforeEach } from "vitest";
import { enqueue, enqueueDelayed, claimNext, completeJob, failJob, reconcileStuckJobs } from "./queue.js";
import { createDb, createSchema, pipelineJobs } from "@atelier/db";
import { eq } from "drizzle-orm";

describe("queue", () => {
  let db: ReturnType<typeof createDb>;

  beforeEach(() => {
    db = createDb(":memory:");
    createSchema(db);
  });

  it("enqueues and claims a job", () => {
    const id = enqueue(db, { leadId: null, step: "discovery", payload: {} });
    const job = claimNext(db, "discovery-worker");
    expect(job?.id).toBe(id);
    expect(job?.status).toBe("running");
  });

  it("reconciles jobs with stale heartbeat to failed", () => {
    const id = enqueue(db, { leadId: null, step: "research", payload: {} });
    claimNext(db, "research-worker");

    // Set heartbeat 10 minutes ago (stored as ms timestamp integer)
    const staleTs = Date.now() - 10 * 60 * 1000;
    db.update(pipelineJobs)
      .set({ lastHeartbeatAt: new Date(staleTs) })
      .where(eq(pipelineJobs.id, id))
      .run();

    const reconciled = reconcileStuckJobs(db);
    expect(reconciled).toBe(1);

    const job = db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, id))
      .get();

    expect(job?.status).toBe("failed");
    expect(job?.errorMessage).toContain("stale heartbeat");
  });

  it("completes a job", () => {
    const id = enqueue(db, { step: "test", payload: {} });
    claimNext(db, "test-worker");
    completeJob(db, id);

    const job = db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id)).get();
    expect(job?.status).toBe("succeeded");
    expect(job?.finishedAt).toBeDefined();
  });

  it("fails a job with an error message", () => {
    const id = enqueue(db, { step: "test", payload: {} });
    claimNext(db, "test-worker");
    failJob(db, id, "something went wrong");

    const job = db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id)).get();
    expect(job?.status).toBe("failed");
    expect(job?.errorMessage).toBe("something went wrong");
  });

  it("does not reconcile healthy running jobs", () => {
    enqueue(db, { step: "healthy", payload: {} });
    claimNext(db, "worker"); // sets lastHeartbeatAt to now

    const reconciled = reconcileStuckJobs(db);
    expect(reconciled).toBe(0);
  });

  // ── claimNext step filter (Option A) ──────────────────────────────────────

  it("claimNext with step filter claims only matching step", () => {
    enqueue(db, { step: "research", payload: {} });
    const discId = enqueue(db, { step: "discovery", payload: {} });

    // Worker only interested in 'discovery'
    const job = claimNext(db, "discovery-worker", "discovery");
    expect(job?.id).toBe(discId);
    expect(job?.status).toBe("running");

    // Research job must still be queued
    const researchRow = db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "research"))
      .get();
    expect(researchRow?.status).toBe("queued");
  });

  it("claimNext with step filter returns null when no matching job exists", () => {
    enqueue(db, { step: "research", payload: {} }); // wrong step

    const job = claimNext(db, "discovery-worker", "discovery");
    expect(job).toBeNull();
  });

  it("claimNext without step filter claims any queued job (backwards compat)", () => {
    const id = enqueue(db, { step: "any-step", payload: {} });
    const job = claimNext(db, "generic-worker");
    expect(job?.id).toBe(id);
  });

  it("two workers with different steps do not steal each other's jobs", () => {
    const discId = enqueue(db, { step: "discovery", payload: {} });
    const resId = enqueue(db, { step: "research", payload: {} });

    const discJob = claimNext(db, "discovery-worker", "discovery");
    const resJob = claimNext(db, "research-worker", "research");

    expect(discJob?.id).toBe(discId);
    expect(resJob?.id).toBe(resId);

    // Both now running
    const rows = db.select().from(pipelineJobs).all();
    expect(rows.every((r) => r.status === "running")).toBe(true);
  });

  // ── Delay / notBefore support (Task 4.6 undo window) ─────────────────────

  it("delayed job: enqueueDelayed with future notBefore is not claimed immediately", () => {
    const id = enqueueDelayed(db, { step: "outreach", payload: { outreachMessageId: "x" } }, 30_000);

    // Worker should not claim it (created_at is in the future)
    const job = claimNext(db, "outreach-worker", "outreach");
    expect(job).toBeNull();

    // The row should exist in queued state
    const row = db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id)).get();
    expect(row?.status).toBe("queued");
  });

  it("delayed job: enqueue with past notBefore is claimed immediately", () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    const id = enqueue(db, {
      step: "outreach",
      payload: { outreachMessageId: "y" },
      notBefore: pastDate,
    });

    const job = claimNext(db, "outreach-worker", "outreach");
    expect(job?.id).toBe(id);
    expect(job?.status).toBe("running");
  });

  it("enqueueDelayed: normal job with no delay is still claimable", () => {
    const id = enqueue(db, { step: "test", payload: {} });
    const job = claimNext(db, "test-worker", "test");
    expect(job?.id).toBe(id);
  });
});
