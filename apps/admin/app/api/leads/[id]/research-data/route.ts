import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";

const ALLOWED_FIELDS = new Set([
  "phone",
  "email",
  "address",
  "city",
  "postal_code",
  "existing_website_url",
]);

// Map snake_case field names to Drizzle column names
const FIELD_MAP: Record<string, keyof typeof leads.$inferSelect> = {
  phone: "phone",
  email: "email",
  address: "address",
  city: "city",
  postal_code: "postalCode",
  existing_website_url: "existingWebsiteUrl",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body || typeof body.field !== "string") {
    return NextResponse.json({ error: "field is required" }, { status: 400 });
  }

  const field: string = body.field;

  if (!ALLOWED_FIELDS.has(field)) {
    return NextResponse.json(
      { error: `Field not allowed. Allowed: ${Array.from(ALLOWED_FIELDS).join(", ")}` },
      { status: 400 }
    );
  }

  const db = getDb();

  const lead = db.select().from(leads).where(eq(leads.id, id)).get();
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const columnKey = FIELD_MAP[field];
  db.update(leads)
    .set({ [columnKey]: body.value ?? null, updatedAt: new Date() } as Partial<typeof leads.$inferInsert>)
    .where(eq(leads.id, id))
    .run();

  return NextResponse.json({ ok: true, field, value: body.value });
}
