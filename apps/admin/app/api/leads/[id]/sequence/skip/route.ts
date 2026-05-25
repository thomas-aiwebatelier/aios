import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { skipStep } from "@/lib/sequence";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const stepId = body?.stepId;
  if (typeof stepId !== "string") return NextResponse.json({ error: "stepId required" }, { status: 400 });
  const db = getDb();
  await skipStep(db, stepId);
  await logActivity(db, { leadId: id, type: "step_skipped", metadata: { stepId } });
  return NextResponse.json({ ok: true });
}
