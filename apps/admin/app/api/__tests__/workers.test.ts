/**
 * workers.test.ts — Integration tests for /api/workers/* endpoints.
 *
 * Covers the four Cloud Scheduler-driven handlers added in Migration Plan B:
 *   - discovery, research, outreach: createWorkerHandler (per-job claim)
 *   - reply-poll: createScanHandler (no-job scan)
 *
 * Strategy:
 *   - Real pglite via getTestDb() so claimNext/SKIP LOCKED semantics actually run.
 *   - Per-job processors mocked at the worker-module level — we don't exercise
 *     the discovery/research/outreach internals here (they have their own
 *     dedicated test files). We assert that the handler claims the right job
 *     and invokes the processor exactly once with the claimed job.
 *   - For reply-poll, gmail.getThread is mocked to return a fake thread with
 *     one inbound message; the test then asserts that outreach_messages was
 *     updated and the lead's status flipped to 'accepted'.
 *   - Auth: every endpoint is hit once with and once without the Bearer
 *     header to confirm the 401 path.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTestDb, leads, pipelineJobs, outreachMessages } from "@atelier/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Test DB plumbing ─────────────────────────────────────────────────────────

let currentDb: Awaited<ReturnType<typeof getTestDb>>;

vi.mock("@/lib/db", () => ({
  getDb: () => currentDb,
}));

// ── Worker processor mocks (set per-suite via vi.mock + vi.mocked) ──────────

vi.mock("@/workers/discovery", () => ({
  processDiscoveryJob: vi.fn(async () => undefined),
}));

vi.mock("@/workers/research", () => ({
  processResearchJob: vi.fn(async () => undefined),
}));

vi.mock("@/workers/outreach", () => ({
  processOutreachJob: vi.fn(async () => undefined),
}));

// Mock gmail.getThread so reply-poll runs without network. Keep SENDER_ADDRESS
// real so the inbound-vs-self filter works as in prod.
vi.mock("@/lib/gmail", async () => {
  return {
    getThread: vi.fn(async (_threadId: string) => ({
      id: _threadId,
      messages: [],
    })),
    SENDER_ADDRESS: "thomas@aiwebatelier.com",
  };
});

// ── Env setup ────────────────────────────────────────────────────────────────

const SECRET = "test-worker-secret-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

beforeEach(async () => {
  currentDb = await getTestDb();
  process.env.WORKER_AUTH_SECRET = SECRET;
  vi.clearAllMocks();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function authedReq(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: "{}",
  });
}

function unauthedReq(url: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

async function enqueueDirect(step: string, leadId: string | null = null): Promise<string> {
  const id = nanoid();
  await currentDb.insert(pipelineJobs).values({
    id,
    leadId,
    pipelineStep: step,
    status: "queued",
    payload: { test: true },
    attemptCount: 0,
  });
  return id;
}

async function insertLead(status: string = "discovered"): Promise<string> {
  const id = nanoid();
  await currentDb.insert(leads).values({
    id,
    slug: `slug-${id}`,
    status: status as any,
    businessName: "Test Biz",
    city: "Antwerpen",
    industryKey: "bakery-restaurant",
  });
  return id;
}

// ── Per-job endpoints: discovery, research, outreach ─────────────────────────

describe.each([
  { name: "discovery", routePath: "../workers/discovery/route.js", workerModule: "@/workers/discovery", processorName: "processDiscoveryJob" },
  { name: "research", routePath: "../workers/research/route.js", workerModule: "@/workers/research", processorName: "processResearchJob" },
  { name: "outreach", routePath: "../workers/outreach/route.js", workerModule: "@/workers/outreach", processorName: "processOutreachJob" },
])("POST /api/workers/$name", ({ name, routePath, workerModule, processorName }) => {
  it("returns 401 when Authorization header is missing", async () => {
    await enqueueDirect(name);
    const { POST } = (await import(routePath)) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(unauthedReq(`http://localhost/api/workers/${name}`));

    expect(res.status).toBe(401);
  });

  it("returns 401 when Authorization header is wrong", async () => {
    await enqueueDirect(name);
    const { POST } = (await import(routePath)) as unknown as { POST: (req: Request) => Promise<Response> };
    const req = new Request(`http://localhost/api/workers/${name}`, {
      method: "POST",
      headers: { Authorization: "Bearer not-the-secret" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 204 with no body when queue has no jobs for this step", async () => {
    // Insert a job for a different step to make sure we don't claim it
    await enqueueDirect("generation");
    const { POST } = (await import(routePath)) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(authedReq(`http://localhost/api/workers/${name}`));

    expect(res.status).toBe(204);
    // 204 forbids a body — must be empty per HTTP spec
    const text = await res.text();
    expect(text).toBe("");

    const mod: Record<string, any> = await import(workerModule);
    expect(mod[processorName]).not.toHaveBeenCalled();
  });

  it("claims one job and invokes the processor", async () => {
    const leadId = await insertLead();
    const jobId = await enqueueDirect(name, leadId);

    const { POST } = (await import(routePath)) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(authedReq(`http://localhost/api/workers/${name}`));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      claimed: 1,
      jobId,
      leadId,
      step: name,
    });
    expect(typeof json.durationMs).toBe("number");

    // Processor called exactly once with the claimed job
    const mod: Record<string, any> = await import(workerModule);
    expect(mod[processorName]).toHaveBeenCalledTimes(1);
    const [, claimedJob] = (mod[processorName] as any).mock.calls[0];
    expect(claimedJob.id).toBe(jobId);
    expect(claimedJob.leadId).toBe(leadId);

    // Job row is now in running state (the mocked processor doesn't call
    // completeJob — that's the real processor's responsibility)
    const rows = await currentDb
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, jobId));
    expect(rows[0]?.status).toBe("running");
    expect(rows[0]?.attemptCount).toBe(1);
  });

  it("returns 500 and calls failJob when processor throws", async () => {
    const jobId = await enqueueDirect(name);
    const mod: Record<string, any> = await import(workerModule);
    (mod[processorName] as any).mockImplementationOnce(async () => {
      throw new Error("kaboom");
    });

    const { POST } = (await import(routePath)) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(authedReq(`http://localhost/api/workers/${name}`));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("kaboom");
    expect(json.jobId).toBe(jobId);

    // Defensive failJob ran
    const rows = await currentDb
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, jobId));
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.errorMessage).toContain("kaboom");
  });
});

// ── Scan endpoint: reply-poll ────────────────────────────────────────────────

describe("POST /api/workers/reply-poll", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const { POST } = (await import("../workers/reply-poll/route.js")) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(unauthedReq("http://localhost/api/workers/reply-poll"));

    expect(res.status).toBe(401);
  });

  it("returns 200 with summary when no outreach rows exist", async () => {
    const { POST } = (await import("../workers/reply-poll/route.js")) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(authedReq("http://localhost/api/workers/reply-poll"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, step: "reply-poll" });
    expect(json.summary).toMatchObject({ checked: 0, repliesFound: 0, errors: 0 });
  });

  it("detects a new inbound reply and flips lead status", async () => {
    const leadId = await insertLead("contacted");
    const outreachId = nanoid();
    await currentDb.insert(outreachMessages).values({
      id: outreachId,
      leadId,
      direction: "outbound" as any,
      subject: "Hi",
      body: "Body",
      gmailThreadId: "thread-abc",
      gmailMessageId: "msg-1",
      status: "sent" as any,
      sentAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago, inside the 30d window
      gmailMessageCount: 1,
    });

    // Mock the thread to contain our outbound message + one inbound reply
    const gmail = await import("@/lib/gmail");
    (gmail.getThread as any).mockResolvedValueOnce({
      id: "thread-abc",
      messages: [
        {
          id: "msg-1",
          from: "AI Web Atelier <thomas@aiwebatelier.com>",
          body: "Body",
          internalDate: Date.now() - 60 * 60 * 1000,
        },
        {
          id: "msg-2",
          from: "Owner <owner@example.com>",
          body: "Yes, sounds great!",
          internalDate: Date.now() - 5 * 60 * 1000,
        },
      ],
    });

    const { POST } = (await import("../workers/reply-poll/route.js")) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(authedReq("http://localhost/api/workers/reply-poll"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.summary).toMatchObject({ checked: 1, repliesFound: 1, errors: 0 });

    const updatedRow = (
      await currentDb.select().from(outreachMessages).where(eq(outreachMessages.id, outreachId))
    )[0];
    expect(updatedRow?.status).toBe("replied");
    expect(updatedRow?.replyBody).toContain("sounds great");
    expect(updatedRow?.replyReceivedAt).toBeTruthy();
    expect(updatedRow?.gmailMessageCount).toBe(2);

    const updatedLead = (
      await currentDb.select().from(leads).where(eq(leads.id, leadId))
    )[0];
    expect(updatedLead?.status).toBe("accepted");
    expect(updatedLead?.respondedAt).toBeTruthy();
  });

  it("skips threads whose only sender is us", async () => {
    const leadId = await insertLead("contacted");
    const outreachId = nanoid();
    await currentDb.insert(outreachMessages).values({
      id: outreachId,
      leadId,
      direction: "outbound" as any,
      subject: "Hi",
      body: "Body",
      gmailThreadId: "thread-self",
      gmailMessageId: "msg-1",
      status: "sent" as any,
      sentAt: new Date(Date.now() - 60 * 60 * 1000),
      gmailMessageCount: 1,
    });

    const gmail = await import("@/lib/gmail");
    (gmail.getThread as any).mockResolvedValueOnce({
      id: "thread-self",
      messages: [
        { id: "msg-1", from: "thomas@aiwebatelier.com", body: "First", internalDate: Date.now() - 60 * 60 * 1000 },
        { id: "msg-2", from: "thomas@aiwebatelier.com", body: "Bump", internalDate: Date.now() - 10 * 60 * 1000 },
      ],
    });

    const { POST } = (await import("../workers/reply-poll/route.js")) as unknown as { POST: (req: Request) => Promise<Response> };
    const res = await POST(authedReq("http://localhost/api/workers/reply-poll"));
    const json = await res.json();

    expect(res.status).toBe(200);
    // checked=1 (we did process the row), repliesFound=0 (no inbound message)
    expect(json.summary).toMatchObject({ checked: 1, repliesFound: 0, errors: 0 });

    // Status unchanged but gmail_message_count advanced so we don't re-scan
    // forever.
    const updatedRow = (
      await currentDb.select().from(outreachMessages).where(eq(outreachMessages.id, outreachId))
    )[0];
    expect(updatedRow?.status).toBe("sent");
    expect(updatedRow?.gmailMessageCount).toBe(2);

    const lead = (await currentDb.select().from(leads).where(eq(leads.id, leadId)))[0];
    expect(lead?.status).toBe("contacted");
  });
});
