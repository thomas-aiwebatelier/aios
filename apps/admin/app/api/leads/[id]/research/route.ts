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

  const jobId = enqueue(db, {
    leadId: id,
    step: "research",
    payload: { leadId: id },
  });

  return NextResponse.json({ ok: true, jobId });
}
