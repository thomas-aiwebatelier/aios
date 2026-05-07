import { describe, it, expect, beforeEach } from "vitest";
import { enqueue, claimNext, completeJob, failJob, reconcileStuckJobs } from "./queue.js";
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
});
