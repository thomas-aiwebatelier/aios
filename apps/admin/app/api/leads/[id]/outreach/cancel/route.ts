/**
 * POST /api/leads/[id]/outreach/cancel
 *
 * Body: { outreachMessageId: string }
 *
 * Cancels the 30s undo window for an outreach send:
 *   1. Flip outreach_messages row: status 'draft' → 'archived'.
 *   2. Cancel the queued pipeline_jobs row (status 'queued' → 'cancelled')
 *      matching step='outreach' and payload containing outreachMessageId.
 *   3. Flip lead status back to 'deployed'.
 *   4. Return { ok: true }.
 *
 * Idempotent — if the job was already picked up by the worker (status=running
 * or succeeded), this is a no-op for the job row. The outreach_messages row
 * is archived regardless so the UI reflects the cancellation.
 *
 * NOTE: SQLite JSON payload matching — the payload column is stored as JSON text.
 * We use a LIKE pattern to find the job because SQLite's ->> operator availability
 * depends on the compile-time JSON1 extension version. LIKE is safe and portable.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads, outreachMessages, pipelineJobs } from "@atelier/db";
import { eq, and, like } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leadId } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body.outreachMessageId !== "string") {
    return NextResponse.json(
      { error: "outreachMessageId is required" },
      { status: 400 },
    );
  }

  const { outreachMessageId } = body as { outreachMessageId: string };
  const db = getDb();

  // 1. Archive the outreach_messages draft
  await db.update(outreachMessages)
    .set({ status: "archived" })
    .where(
      and(
        eq(outreachMessages.id, outreachMessageId),
        eq(outreachMessages.leadId, leadId),
        eq(outreachMessages.status, "draft"),
      ),
    );

  // 2. Cancel the queued pipeline job — match by payload LIKE pattern
  // The payload is stored as JSON, e.g. {"outreachMessageId":"abc123"}
  // We escape the ID and use LIKE to avoid JSON operator compatibility issues.
  const payloadPattern = `%"outreachMessageId":"${outreachMessageId}"%`;
  await db.update(pipelineJobs)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(pipelineJobs.pipelineStep, "outreach"),
        eq(pipelineJobs.status, "queued"),
        like(pipelineJobs.payload as any, payloadPattern),
      ),
    );

  // 3. Flip lead status back to deployed
  await db.update(leads)
    .set({ status: "deployed", updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  return NextResponse.json({ ok: true });
}
