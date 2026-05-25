import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS = ["contactName", "contactRole", "contactEmail", "mobilePhone", "whatsapp", "address", "phone", "email"] as const;

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of FIELDS) if (typeof body[f] === "string") update[f] = body[f];
  const db = getDb();
  await db.update(leads).set(update).where(eq(leads.id, id));
  return NextResponse.json({ ok: true });
}
