import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";
import { getValidIndustryKeys } from "@/lib/industry-keys";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body.industry_key !== "string") {
    return NextResponse.json({ error: "industry_key is required" }, { status: 400 });
  }

  const industryKey: string = body.industry_key;
  const validKeys = getValidIndustryKeys();

  if (!validKeys.includes(industryKey)) {
    return NextResponse.json(
      { error: `Invalid industry key. Valid keys: ${validKeys.join(", ")}` },
      { status: 400 }
    );
  }

  const db = getDb();

  const lead = db.select().from(leads).where(eq(leads.id, id)).get();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  db.update(leads)
    .set({
      industryKey,
      industryClassificationConfidence: 1.0,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id))
    .run();

  return NextResponse.json({ ok: true, industryKey });
}
