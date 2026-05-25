/**
 * reply-poll.ts — Periodic Gmail thread monitor (Migration Plan B).
 *
 * Replaces the legacy half-hourly poll-replies cron tick in cron.ts. Cloud Scheduler
 * hits POST /api/workers/reply-poll every ~5 minutes; the handler calls
 * processReplyPollJob, which:
 *
 *   1. Selects outreach_messages where status='sent' AND sent_at > now() - 30d
 *      AND gmail_thread_id IS NOT NULL.
 *   2. For each row, fetches the thread via gmail.users.threads.get.
 *   3. If thread.messages.length > stored gmail_message_count:
 *        - The first message whose From-header is NOT the sender's address
 *          counts as a real inbound reply.
 *        - Persist reply_body / reply_received_at on the row, flip its
 *          status to 'replied', update gmail_message_count, and flip the
 *          lead's status to 'accepted' (operator can re-classify as
 *          declined/archived from the inbox UI).
 *   4. Returns { checked, repliesFound }.
 *
 * Idempotency: gmail_message_count + status='replied' guard against double-
 * counting. If the operator marks a lead 'archived' in the UI, the row's
 * own status is set to 'archived' too — but reply-poll still updates
 * gmail_message_count for future ticks (no further status flip — the WHERE
 * filter selects status='sent' only, so archived rows are skipped).
 *
 * Note (out-of-scope): the legacy cron also handled inbound_inquiries from
 * the public contact form. That stays a separate concern; reply-poll only
 * tracks replies on outbound outreach threads.
 */

import { and, eq, gt, isNotNull } from "drizzle-orm";
import { outreachMessages, leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { getThread, SENDER_ADDRESS } from "../lib/gmail.js";
import { logger } from "../lib/logger.js";
import { cancelRemainingSteps } from "../lib/sequence.js";
import { logActivity } from "../lib/activity.js";

const POLL_WINDOW_DAYS = 30;

export interface ReplyPollSummary extends Record<string, unknown> {
  checked: number;
  repliesFound: number;
  errors: number;
}

export async function processReplyPollJob(db: Db): Promise<ReplyPollSummary> {
  const windowStart = new Date(Date.now() - POLL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: outreachMessages.id,
      leadId: outreachMessages.leadId,
      gmailThreadId: outreachMessages.gmailThreadId,
      gmailMessageCount: outreachMessages.gmailMessageCount,
    })
    .from(outreachMessages)
    .where(
      and(
        eq(outreachMessages.status, "sent"),
        gt(outreachMessages.sentAt, windowStart),
        isNotNull(outreachMessages.gmailThreadId),
      ),
    );

  let repliesFound = 0;
  let errors = 0;

  for (const row of rows) {
    if (!row.gmailThreadId) continue;

    let thread: Awaited<ReturnType<typeof getThread>>;
    try {
      thread = await getThread(row.gmailThreadId);
    } catch (err) {
      errors++;
      logger.warn("[reply-poll] getThread failed", {
        outreachMessageId: row.id,
        threadId: row.gmailThreadId,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const messageCount = thread.messages.length;
    if (messageCount <= row.gmailMessageCount) {
      // No new messages — nothing to do.
      continue;
    }

    // Find the first message from someone other than us, scanning the
    // tail of the thread (Gmail returns chronological order).
    const inbound = thread.messages.find(
      (m) => m.from !== null && !m.from.toLowerCase().includes(SENDER_ADDRESS.toLowerCase()),
    );

    if (!inbound) {
      // Thread grew but only with self-sent messages. Bump the counter so
      // we don't keep re-checking the same delta.
      await db
        .update(outreachMessages)
        .set({ gmailMessageCount: messageCount })
        .where(eq(outreachMessages.id, row.id));
      continue;
    }

    const replyReceivedAt = inbound.internalDate
      ? new Date(inbound.internalDate)
      : new Date();

    await db
      .update(outreachMessages)
      .set({
        status: "replied",
        replyBody: inbound.body,
        replyReceivedAt,
        gmailMessageCount: messageCount,
      })
      .where(eq(outreachMessages.id, row.id));

    await db
      .update(leads)
      .set({
        status: "accepted",
        salesStage: "in_gesprek" as "in_gesprek",
        respondedAt: replyReceivedAt,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, row.leadId));

    await cancelRemainingSteps(db, row.leadId);
    await logActivity(db, {
      leadId: row.leadId,
      type: "email_replied",
      body: inbound.body ? inbound.body.slice(0, 500) : undefined,
      author: "system",
      metadata: { from: inbound.from },
    });

    logger.info("[reply-poll] reply detected", {
      outreachMessageId: row.id,
      leadId: row.leadId,
      threadId: row.gmailThreadId,
      from: inbound.from,
    });
    repliesFound++;
  }

  return { checked: rows.length, repliesFound, errors };
}
