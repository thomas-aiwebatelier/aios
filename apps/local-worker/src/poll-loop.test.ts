/**
 * poll-loop.test.ts — pollOnce dispatches to the correct processor and
 * normalises completion/failure.
 *
 * Backed by pglite (getTestDb) so the real claimNext SELECT...FOR UPDATE
 * SKIP LOCKED transaction is exercised end-to-end.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getTestDb, pipelineJobs } from "@atelier/db";
import { pollOnce, type Processor } from "./poll-loop.js";

async function enqueueJob(
  db: Awaited<ReturnType<typeof getTestDb>>,
  step: string,
  payload: Record<string, unknown> = {},
) {
  const id = nanoid();
  await db.insert(pipelineJobs).values({
    id,
    leadId: null,
    pipelineStep: step,
    status: "queued",
    payload,
    attemptCount: 0,
  });
  return id;
}

describe("pollOnce", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;

  beforeEach(async () => {
    db = await getTestDb();
  });

  it("returns false when queue is empty", async () => {
    const result = await pollOnce(db, {
      steps: ["generate", "deploy"],
      workerName: "test",
      processors: { generate: vi.fn(), deploy: vi.fn() },
    });
    expect(result).toBe(false);
  });

  it("claims a generate job, dispatches to processor, marks succeeded", async () => {
    const jobId = await enqueueJob(db, "generate", { foo: "bar" });
    const generateProc: Processor = vi.fn().mockResolvedValue(undefined);

    const result = await pollOnce(db, {
      steps: ["generate", "deploy"],
      workerName: "test",
      processors: { generate: generateProc, deploy: vi.fn() },
    });

    expect(result).toBe(true);
    expect(generateProc).toHaveBeenCalledOnce();
    expect((generateProc as ReturnType<typeof vi.fn>).mock.calls[0][1].id).toBe(jobId);

    const row = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, jobId))
      ))[0];
    expect(row.status).toBe("succeeded");
    expect(row.finishedAt).toBeInstanceOf(Date);
  });

  it("processor throw → row marked failed with error message", async () => {
    const jobId = await enqueueJob(db, "generate");
    const generateProc: Processor = vi
      .fn()
      .mockRejectedValue(new Error("kaboom"));

    const result = await pollOnce(db, {
      steps: ["generate"],
      workerName: "test",
      processors: { generate: generateProc },
    });

    expect(result).toBe(true);
    const row = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, jobId))
      ))[0];
    expect(row.status).toBe("failed");
    expect(row.errorMessage).toContain("kaboom");
  });

  it("processor that already marked the job succeeded is not clobbered", async () => {
    const jobId = await enqueueJob(db, "deploy");
    // Processor flips the row to succeeded itself (like deployer.ts does).
    const deployProc: Processor = vi.fn().mockImplementation(async (db, job) => {
      await db
        .update(pipelineJobs)
        .set({ status: "succeeded", finishedAt: new Date() })
        .where(eq(pipelineJobs.id, job.id));
    });

    await pollOnce(db, {
      steps: ["deploy"],
      workerName: "test",
      processors: { deploy: deployProc },
    });

    const row = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, jobId))
      ))[0];
    expect(row.status).toBe("succeeded");
  });

  it("step with no registered processor → row marked failed", async () => {
    const jobId = await enqueueJob(db, "generate");
    await pollOnce(db, {
      steps: ["generate"],
      workerName: "test",
      processors: {}, // no generate processor
    });

    const row = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, jobId))
      ))[0];
    expect(row.status).toBe("failed");
    expect(row.errorMessage).toContain("no processor");
  });

  it("priority: generate before deploy when both queued", async () => {
    const deployId = await enqueueJob(db, "deploy");
    // Tiny delay so createdAt differs (within ms) — but priority is by step
    // order in the claimNext loop, not createdAt across steps.
    await new Promise((r) => setTimeout(r, 5));
    const generateId = await enqueueJob(db, "generate");

    const generateProc: Processor = vi.fn().mockResolvedValue(undefined);
    const deployProc: Processor = vi.fn().mockResolvedValue(undefined);

    await pollOnce(db, {
      steps: ["generate", "deploy"],
      workerName: "test",
      processors: { generate: generateProc, deploy: deployProc },
    });

    expect(generateProc).toHaveBeenCalledOnce();
    expect(deployProc).not.toHaveBeenCalled();

    const generateRow = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, generateId))
      ))[0];
    expect(generateRow.status).toBe("succeeded");

    const deployRow = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, deployId))
      ))[0];
    expect(deployRow.status).toBe("queued");
  });
});
