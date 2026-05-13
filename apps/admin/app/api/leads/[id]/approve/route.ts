import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";
import { enqueue } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const lead = db.select().from(leads).where(eq(leads.id, id)).get();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  db.update(leads)
    .set({ status: "approved", approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(leads.id, id))
    .run();

  // Enqueue generation job — worker lands in Task 4.1, sits queued until then
  const jobId = enqueue(db, {
    leadId: id,
    step: "generation",
    payload: { leadId: id },
  });

  return NextResponse.json({ ok: true, jobId });
}
