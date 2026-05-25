/**
 * /api/settings/email-template
 *
 * GET — returns the active outreach email template (or the built-in default).
 * PUT — upserts the active template { subject, body }.
 *
 * Admin-only: protected by the next-auth middleware (see apps/admin/middleware.ts,
 * which guards every route except /login + /api/auth).
 *
 * A single active row is kept under the fixed id "default" so edits upsert in
 * place. lib/email-template.ts reads it via loadActiveEmailTemplate().
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { emailTemplates } from "@atelier/db";
import { loadActiveEmailTemplate } from "@/lib/email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMPLATE_ID = "default";

export async function GET() {
  const { subject, body } = await loadActiveEmailTemplate();
  return NextResponse.json({ subject, body });
}

export async function PUT(req: NextRequest) {
  const payload = await req.json().catch(() => null);

  if (!payload || typeof payload.subject !== "string" || typeof payload.body !== "string") {
    return NextResponse.json(
      { error: "subject and body are required strings" },
      { status: 400 },
    );
  }

  const subject = payload.subject.trim();
  const body = payload.body.trim();

  if (!subject || !body) {
    return NextResponse.json(
      { error: "subject and body must not be empty" },
      { status: 400 },
    );
  }

  const db = getDb();
  await db
    .insert(emailTemplates)
    .values({ id: TEMPLATE_ID, name: "default", subject, body, isActive: true })
    .onConflictDoUpdate({
      target: emailTemplates.id,
      set: { subject, body, isActive: true, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
