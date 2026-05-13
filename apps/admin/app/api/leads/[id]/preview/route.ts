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

  const lead = db.select().from(leads).where(eq(leads.id, id)).get();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const brand = db.select().from(brandProfiles).where(eq(brandProfiles.leadId, id)).get() ?? null;
  const inventory = db.select().from(siteInventories).where(eq(siteInventories.leadId, id)).get() ?? null;
  const competitor = db.select().from(competitors).where(eq(competitors.leadId, id)).get() ?? null;

  return NextResponse.json({ brand, inventory, competitor });
}
