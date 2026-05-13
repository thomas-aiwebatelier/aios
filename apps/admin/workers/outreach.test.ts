/**
 * outreach.test.ts — Vitest tests for Task 4.6 outreach worker.
 *
 * Scenarios:
 *   1. Happy path: draft row → sendEmail called → row.status='sent', lead.status='email_sent', sentAt set
 *   2. Cancelled row (status='archived' before worker picks up): no-op, no send
 *   3. sendEmail throws → failJob, row.status remains 'draft'
 *   4. threadId present in row → passed through to sendEmail
 *
 * All Gmail calls are mocked — no live API.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getTestDb,
  leads,
  outreachMessages,
  pipelineJobs
} from "@atelier/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { Db } from "@atelier/db";

// ── Mock gmail lib (BEFORE import of outreach.ts) ─────────────────────────────

vi.mock("../lib/gmail.js", () => ({
  sendEmail: vi.fn().mockResolvedValue({
    messageId: "msg-abc123",
    threadId: "thread-xyz789",
  }),
}));

// ── Import modules AFTER mocks ────────────────────────────────────────────────

import { processOutreachJob } from "./outreach.js";
import { sendEmail } from "../lib/gmail.js";
import { completeJob, failJob } from "../lib/queue.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createInMemoryDb(): Promise<Db> {
  const db = await getTestDb();

  return db;
}

async function createTestLead(db: Db, overrides: Partial<{ email: string; status: string }> = {}) {
  const id = nanoid();
  await db.insert(leads)
    .values({
      id,
      slug: `test-lead-${id}`,
      status: (overrides.status ?? "email_drafted") as typeof leads.$inferInsert["status"],
      businessName: "Test Bakkerij",
      city: "Antwerpen",
      industryKey: "bakery",
      email: overrides.email ?? "owner@testbakkerij.be",
    })
;
  return { id };
}

async function createTestOutreachMessage(
  db: Db,
  leadId: string,
  overrides: Partial<{
    status: string;
    gmailThreadId: string | null;
  }> = {},
) {
  const id = nanoid();
  await db.insert(outreachMessages)
    .values({
      id,
      leadId,
      direction: "outbound",
      subject: "Een nieuwe website voor Test Bakkerij",
      body: "Beste ondernemer, ...",
      status: (overrides.status ?? "draft") as typeof outreachMessages.$inferInsert["status"],
      gmailThreadId: overrides.gmailThreadId ?? null,
    })
;
  return { id };
}

async function createTestJob(db: Db, leadId: string, outreachMessageId: string) {
  const id = nanoid();
  await db.insert(pipelineJobs)
    .values({
      id,
      leadId,
      pipelineStep: "outreach",
      status: "running",
      payload: { outreachMessageId },
      attemptCount: 1,
    })
;
  return { id, leadId, payload: { outreachMessageId } };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("processOutreachJob", () => {
  let db: Db;

  beforeEach(async () => {
    db = await createInMemoryDb();
    vi.clearAllMocks();
    vi.mocked(sendEmail).mockResolvedValue({
      messageId: "msg-abc123",
      threadId: "thread-xyz789",
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("happy path: draft row → sendEmail → row status=sent, lead status=email_sent, sentAt set", async () => {
    const { id: leadId } = await createTestLead(db);
    const { id: outreachMessageId } = await createTestOutreachMessage(db, leadId);
    const job = await createTestJob(db, leadId, outreachMessageId);

    await processOutreachJob(db, job as any);

    // sendEmail called with correct args
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@testbakkerij.be",
        subject: "Een nieuwe website voor Test Bakkerij",
        body: "Beste ondernemer, ...",
      }),
    );

    // outreach_messages row updated
    const row = ((await db
      .select()
      .from(outreachMessages)
      .where(eq(outreachMessages.id, outreachMessageId))
      ))[0];
    expect(row?.status).toBe("sent");
    expect(row?.gmailMessageId).toBe("msg-abc123");
    expect(row?.gmailThreadId).toBe("thread-xyz789");
    expect(row?.sentAt).toBeInstanceOf(Date);

    // lead status updated
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("email_sent");
    expect(lead?.sentAt).toBeInstanceOf(Date);

    // job completed
    const jobRow = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, job.id))
      ))[0];
    expect(jobRow?.status).toBe("succeeded");
  });

  it("cancelled row (status=archived before worker picks up): no-op, no send", async () => {
    const { id: leadId } = await createTestLead(db, { status: "deployed" });
    const { id: outreachMessageId } = await createTestOutreachMessage(db, leadId, {
      status: "archived",
    });
    const job = await createTestJob(db, leadId, outreachMessageId);

    await processOutreachJob(db, job as any);

    // sendEmail NOT called
    expect(sendEmail).not.toHaveBeenCalled();

    // lead status unchanged (still deployed)
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("deployed");

    // job still completed (idempotent no-op)
    const jobRow = ((await db
      .select()
      .from(pipelineJobs)
      .where(eq(pipelineJobs.id, job.id))
      ))[0];
    expect(jobRow?.status).toBe("succeeded");
  });

  it("sendEmail throws → worker throws → row.status remains draft", async () => {
    vi.mocked(sendEmail).mockRejectedValue(new Error("[gmail] API error: 503"));

    const { id: leadId } = await createTestLead(db);
    const { id: outreachMessageId } = await createTestOutreachMessage(db, leadId);
    const job = await createTestJob(db, leadId, outreachMessageId);

    await expect(processOutreachJob(db, job as any)).rejects.toThrow("API error: 503");

    // Row still draft (worker threw, no update applied)
    const row = ((await db
      .select()
      .from(outreachMessages)
      .where(eq(outreachMessages.id, outreachMessageId))
      ))[0];
    expect(row?.status).toBe("draft");

    // Lead status unchanged
    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead?.status).toBe("email_drafted");
  });

  it("threadId present in row → passed through to sendEmail", async () => {
    const { id: leadId } = await createTestLead(db);
    const { id: outreachMessageId } = await createTestOutreachMessage(db, leadId, {
      gmailThreadId: "existing-thread-id",
    });
    const job = await createTestJob(db, leadId, outreachMessageId);

    await processOutreachJob(db, job as any);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "existing-thread-id",
      }),
    );
  });
});
