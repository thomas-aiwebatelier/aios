import { describe, it, expect, beforeEach } from "vitest";
import { enqueue, enqueueDelayed, claimNext, completeJob, failJob, reconcileStuckJobs } from "./queue.js";
import { getTestDb, pipelineJobs } from "@atelier/db";
import { eq } from "drizzle-orm";

describe("queue", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;

  beforeEach(async () => {
    db = await getTestDb();
  });

  it("enqueues and claims a job", async () => {
    const id = await enqueue(db, { leadId: null, step: "discovery", payload: {} });
    const job = await claimNext(db, "discovery-worker");
    expect(job?.id).toBe(id);
    expect(job?.status).toBe("running");
  });

  it("reconciles jobs with stale heartbeat to failed", async () => {
    const id = await enqueue(db, { leadId: null, step: "research", payload: {} });
    await claimNext(db, "research-worker");

    // Set heartbeat 10 minutes ago
    const stale = new Date(Date.now() - 10 * 60 * 1000);
    await db.update(pipelineJobs)
      .set({ lastHeartbeatAt: stale })
      .where(eq(pipelineJobs.id, id));

    const reconciled = await reconcileStuckJobs(db);
    expect(reconciled).toBe(1);

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id));
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.errorMessage).toContain("stale heartbeat");
  });

  it("completes a job", async () => {
    const id = await enqueue(db, { step: "test", payload: {} });
    await claimNext(db, "test-worker");
    await completeJob(db, id);

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id));
    expect(rows[0]?.status).toBe("succeeded");
    expect(rows[0]?.finishedAt).toBeDefined();
  });

  it("fails a job with an error message", async () => {
    const id = await enqueue(db, { step: "test", payload: {} });
    await claimNext(db, "test-worker");
    await failJob(db, id, "something went wrong");

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id));
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.errorMessage).toBe("something went wrong");
  });

  it("does not reconcile healthy running jobs", async () => {
    await enqueue(db, { step: "healthy", payload: {} });
    await claimNext(db, "worker"); // sets lastHeartbeatAt to now

    const reconciled = await reconcileStuckJobs(db);
    expect(reconciled).toBe(0);
  });

  // ── claimNext step filter (Option A) ──────────────────────────────────────

  it("claimNext with step filter claims only matching step", async () => {
    await enqueue(db, { step: "research", payload: {} });
    const discId = await enqueue(db, { step: "discovery", payload: {} });

    // Worker only interested in 'discovery'
    const job = await claimNext(db, "discovery-worker", "discovery");
    expect(job?.id).toBe(discId);
    expect(job?.status).toBe("running");

    // Research job must still be queued
    const rows = await db.select().from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "research"));
    expect(rows[0]?.status).toBe("queued");
  });

  it("claimNext with step filter returns null when no matching job exists", async () => {
    await enqueue(db, { step: "research", payload: {} }); // wrong step

    const job = await claimNext(db, "discovery-worker", "discovery");
    expect(job).toBeNull();
  });

  it("claimNext without step filter claims any queued job (backwards compat)", async () => {
    const id = await enqueue(db, { step: "any-step", payload: {} });
    const job = await claimNext(db, "generic-worker");
    expect(job?.id).toBe(id);
  });

  it("two workers with different steps do not steal each other's jobs", async () => {
    const discId = await enqueue(db, { step: "discovery", payload: {} });
    const resId = await enqueue(db, { step: "research", payload: {} });

    const discJob = await claimNext(db, "discovery-worker", "discovery");
    const resJob = await claimNext(db, "research-worker", "research");

    expect(discJob?.id).toBe(discId);
    expect(resJob?.id).toBe(resId);

    const rows = await db.select().from(pipelineJobs);
    expect(rows.every((r) => r.status === "running")).toBe(true);
  });

  // ── Delay / notBefore support (Task 4.6 undo window) ─────────────────────

  it("delayed job: enqueueDelayed with future notBefore is not claimed immediately", async () => {
    const id = await enqueueDelayed(db, { step: "outreach", payload: { outreachMessageId: "x" } }, 30_000);

    const job = await claimNext(db, "outreach-worker", "outreach");
    expect(job).toBeNull();

    const rows = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id));
    expect(rows[0]?.status).toBe("queued");
  });

  it("delayed job: enqueue with past notBefore is claimed immediately", async () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago
    const id = await enqueue(db, {
      step: "outreach",
      payload: { outreachMessageId: "y" },
      notBefore: pastDate,
    });

    const job = await claimNext(db, "outreach-worker", "outreach");
    expect(job?.id).toBe(id);
    expect(job?.status).toBe("running");
  });

  it("enqueueDelayed: normal job with no delay is still claimable", async () => {
    const id = await enqueue(db, { step: "test", payload: {} });
    const job = await claimNext(db, "test-worker", "test");
    expect(job?.id).toBe(id);
  });
});
