/**
 * POST /api/leads/[id]/outreach/send
 *
 * Body: { subject: string; body: string }
 *
 * 1. Validate lead exists + status is 'deployed' or 'email_drafted'.
 * 2. Insert outreach_messages row (status='draft').
 * 3. Flip lead status to 'email_drafted'.
 * 4. Enqueue a delayed outreach job (30s delay = 30s undo window).
 * 5. Return { outreachMessageId, jobId }.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads, outreachMessages } from "@atelier/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { enqueueDelayed } from "@/lib/queue";

const UNDO_DELAY_MS = 30_000; // 30 seconds

const ALLOWED_STATUSES = new Set(["deployed", "email_drafted"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body.subject !== "string" || typeof body.body !== "string") {
    return NextResponse.json(
      { error: "subject and body are required strings" },
      { status: 400 },
    );
  }

  const db = getDb();

  // 1. Validate lead
  const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (!ALLOWED_STATUSES.has(lead.status)) {
    return NextResponse.json(
      {
        error: `Lead status must be 'deployed' or 'email_drafted', got '${lead.status}'`,
      },
      { status: 422 },
    );
  }

  // 2. Insert outreach_messages draft row
  const outreachMessageId = nanoid();
  await db.insert(outreachMessages)
    .values({
      id: outreachMessageId,
      leadId,
      direction: "outbound",
      subject: body.subject as string,
      body: body.body as string,
      status: "draft",
    });

  // 3. Flip lead status to email_drafted
  await db.update(leads)
    .set({ status: "email_drafted", updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  // 4. Enqueue delayed outreach job (worker won't claim until createdAt <= now())
  const jobId = await enqueueDelayed(
    db,
    {
      leadId,
      step: "outreach",
      payload: { outreachMessageId },
    },
    UNDO_DELAY_MS,
  );

  return NextResponse.json({ ok: true, outreachMessageId, jobId });
}
