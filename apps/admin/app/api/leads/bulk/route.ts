import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { inArray } from "drizzle-orm";
import { enqueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (body.action !== "research" && body.action !== "archive") {
    return NextResponse.json({ error: "action must be 'research' or 'archive'" }, { status: 400 });
  }

  const ids: string[] = body.ids;
  const action: "research" | "archive" = body.action;
  const db = getDb();

  if (action === "archive") {
    db.update(leads)
      .set({ status: "archived", updatedAt: new Date() })
      .where(inArray(leads.id, ids))
      .run();
    return NextResponse.json({ ok: true, processed: ids.length });
  }

  // action === 'research': enqueue research jobs for each lead
  const jobIds = ids.map((leadId) =>
    enqueue(db, { leadId, step: "research", payload: { leadId } })
  );

  return NextResponse.json({ ok: true, processed: ids.length, jobIds });
}
