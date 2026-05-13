import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enqueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const db = getDb();

  if (body.type === "discovery") {
    if (!body.query && !body.googleMapsUrl) {
      return NextResponse.json(
        { error: "query or googleMapsUrl is required for discovery" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {};
    if (body.query) payload.query = body.query;
    if (body.googleMapsUrl) payload.googleMapsUrl = body.googleMapsUrl;

    const jobId = enqueue(db, {
      leadId: null,
      step: "discovery",
      payload,
    });

    return NextResponse.json({ ok: true, jobId });
  }

  if (body.type === "research") {
    if (!body.leadId || typeof body.leadId !== "string") {
      return NextResponse.json({ error: "leadId is required for research" }, { status: 400 });
    }

    const jobId = enqueue(db, {
      leadId: body.leadId,
      step: "research",
      payload: { leadId: body.leadId },
    });

    return NextResponse.json({ ok: true, jobId });
  }

  return NextResponse.json({ error: `Unknown type: ${body.type}` }, { status: 400 });
}
