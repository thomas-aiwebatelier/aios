import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads, salesStageValues } from "@atelier/db";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const salesStage = body?.salesStage;
  if (typeof salesStage !== "string" || !(salesStageValues as readonly string[]).includes(salesStage)) {
    return NextResponse.json({ error: "invalid salesStage" }, { status: 400 });
  }
  const db = getDb();
  const current = (await db.select({ s: leads.salesStage }).from(leads).where(eq(leads.id, id)))[0];
  await db.update(leads).set({ salesStage: salesStage as typeof leads.salesStage._.data, updatedAt: new Date() }).where(eq(leads.id, id));
  await logActivity(db, { leadId: id, type: "stage_change", metadata: { from: current?.s ?? null, to: salesStage } });
  return NextResponse.json({ ok: true });
}
