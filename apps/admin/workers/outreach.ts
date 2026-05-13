/**
 * outreach.ts — Outreach worker for Task 4.6.
 *
 * Claims pipeline_jobs with step="outreach". Each job carries:
 *   payload: { outreachMessageId: string }
 *
 * The job is enqueued by POST /api/leads/[id]/outreach/send with a 30-second
 * delay (created_at = now + 30s). The worker only claims jobs whose created_at
 * has passed (enforced by the updated claimNext in queue.ts).
 *
 * If the row was cancelled via POST /api/leads/[id]/outreach/cancel before the
 * worker picked up the job, the outreach_messages row will have status='archived'.
 * In that case the worker is a no-op (idempotent).
 */

import { eq } from "drizzle-orm";
import { outreachMessages, leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { heartbeat, completeJob, failJob } from "../lib/queue.js";
import { sendEmail } from "../lib/gmail.js";
import { logger } from "../lib/logger.js";
import type { WorkerJob } from "../lib/worker-runner.js";

// ── Main processor ─────────────────────────────────────────────────────────────

export async function processOutreachJob(db: Db, job: WorkerJob): Promise<void> {
  // 1. Parse payload
  const rawPayload = job.payload as Record<string, unknown>;
  const outreachMessageId = rawPayload.outreachMessageId as string | undefined;

  if (!outreachMessageId) {
    throw new Error(
      `[outreach] invalid payload: expected { outreachMessageId }, got ${JSON.stringify(rawPayload)}`,
    );
  }

  logger.info("[outreach] starting job", { jobId: job.id, outreachMessageId });

  // Heartbeat every 30s
  const hbInterval = setInterval(async () => {
    try {
      await heartbeat(db, job.id);
    } catch (err) {
      logger.warn("[outreach] heartbeat failed", { error: String(err) });
    }
  }, 30_000);

  try {
    // 2. Load outreach_messages row
    const row = ((await db
      .select()
      .from(outreachMessages)
      .where(eq(outreachMessages.id, outreachMessageId))
      ))[0];

    if (!row) {
      throw new Error(`[outreach] outreach_messages row not found: ${outreachMessageId}`);
    }

    // 3. Idempotency check: if cancelled before we ran, skip
    if (row.status !== "draft") {
      logger.info("[outreach] row status is not draft — skipping send", {
        outreachMessageId,
        status: row.status,
      });
      await completeJob(db, job.id);
      return;
    }

    // 4. Load lead for email address
    const lead = ((await db
      .select()
      .from(leads)
      .where(eq(leads.id, row.leadId))
      ))[0];

    if (!lead) {
      throw new Error(`[outreach] lead not found for outreachMessage ${outreachMessageId}`);
    }

    if (!lead.email) {
      throw new Error(`[outreach] lead ${lead.id} has no email address`);
    }

    if (!row.subject || !row.body) {
      throw new Error(`[outreach] outreach_messages row ${outreachMessageId} missing subject or body`);
    }

    // 5. Send via Gmail API
    logger.info("[outreach] sending email", { to: lead.email, outreachMessageId });

    const result = await sendEmail({
      to: lead.email,
      subject: row.subject,
      body: row.body,
      threadId: row.gmailThreadId ?? undefined,
    });

    // 6. Update outreach_messages row
    const now = new Date();
    await db.update(outreachMessages)
      .set({
        status: "sent",
        gmailMessageId: result.messageId,
        gmailThreadId: result.threadId,
        sentAt: now,
      })
      .where(eq(outreachMessages.id, outreachMessageId));

    logger.info("[outreach] outreach_messages updated", {
      outreachMessageId,
      gmailMessageId: result.messageId,
      gmailThreadId: result.threadId,
    });

    // 7. Update lead status → email_sent
    await db.update(leads)
      .set({
        status: "email_sent",
        sentAt: now,
        updatedAt: now,
      })
      .where(eq(leads.id, lead.id));

    logger.info("[outreach] lead status → email_sent", { leadId: lead.id });

    // 8. Complete job
    await completeJob(db, job.id);
    logger.info("[outreach] job complete", { jobId: job.id });
  } finally {
    clearInterval(hbInterval);
  }
}
