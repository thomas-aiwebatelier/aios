import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads, leadStatusValues } from "@atelier/db";
import { inArray, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");

  const db = getDb();

  if (!statusParam) {
    const rows = await db.select().from(leads);
    return NextResponse.json({ leads: rows });
  }

  const statuses = statusParam.split(",").map((s) => s.trim()) as typeof leadStatusValues[number][];

  // Validate all statuses
  const valid = new Set(leadStatusValues);
  for (const s of statuses) {
    if (!valid.has(s)) {
      return NextResponse.json({ error: `Invalid status: ${s}` }, { status: 400 });
    }
  }

  const rows = await db.select().from(leads).where(inArray(leads.status, statuses));
  return NextResponse.json({ leads: rows });
}
