import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { brandProfiles, siteInventories, competitors, leads } from "@atelier/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const lead = ((await db.select().from(leads).where(eq(leads.id, id))))[0];
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const brand = ((await db.select().from(brandProfiles).where(eq(brandProfiles.leadId, id))))[0] ?? null;
  const inventory = ((await db.select().from(siteInventories).where(eq(siteInventories.leadId, id))))[0] ?? null;
  const competitor = ((await db.select().from(competitors).where(eq(competitors.leadId, id))))[0] ?? null;

  return NextResponse.json({ brand, inventory, competitor });
}
