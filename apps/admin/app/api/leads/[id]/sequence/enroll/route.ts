import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enrollLead } from "@/lib/sequence";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  await enrollLead(db, id);
  await logActivity(db, { leadId: id, type: "sequence_enrolled" });
  return NextResponse.json({ ok: true });
}
