import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const text = body?.body;
  if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });
  const db = getDb();
  await logActivity(db, { leadId: id, type: "note", body: text.trim() });
  return NextResponse.json({ ok: true });
}
