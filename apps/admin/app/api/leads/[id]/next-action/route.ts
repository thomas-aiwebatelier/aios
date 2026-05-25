import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const nextActionAt = body?.nextActionAt ? new Date(body.nextActionAt) : null;
  const nextActionNote = typeof body?.nextActionNote === "string" ? body.nextActionNote : null;
  const db = getDb();
  await db.update(leads).set({ nextActionAt, nextActionNote, updatedAt: new Date() }).where(eq(leads.id, id));
  return NextResponse.json({ ok: true });
}
