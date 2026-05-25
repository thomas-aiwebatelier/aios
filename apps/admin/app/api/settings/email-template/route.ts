import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { emailTemplates, sequenceAngleValues } from "@atelier/db";
import { loadActiveEmailTemplate } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Angle = "reveal" | "social_proof" | "breakup";
const isAngle = (a: unknown): a is Angle =>
  typeof a === "string" && (sequenceAngleValues as readonly string[]).includes(a);

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("angle");
  const angle: Angle = isAngle(raw) ? raw : "reveal";
  const { subject, body } = await loadActiveEmailTemplate(angle);
  return NextResponse.json({ angle, subject, body });
}

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  if (!payload || !isAngle(payload.angle)) {
    return NextResponse.json({ error: "valid angle is required" }, { status: 400 });
  }
  const angle = payload.angle;
  const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!subject || !body) {
    return NextResponse.json({ error: "subject and body must not be empty" }, { status: 400 });
  }
  const db = getDb();
  const id = `tmpl_${angle}`;
  await db.insert(emailTemplates)
    .values({ id, name: angle, angle, subject, body, isActive: true })
    .onConflictDoUpdate({
      target: emailTemplates.id,
      set: { subject, body, angle, isActive: true, updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
}
