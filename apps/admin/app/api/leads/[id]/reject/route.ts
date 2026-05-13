import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";

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
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(leads.id, id))
    .run();

  return NextResponse.json({ ok: true });
}
