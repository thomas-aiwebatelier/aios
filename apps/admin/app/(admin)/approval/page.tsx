import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { eq } from "drizzle-orm";
import { getValidIndustryKeys } from "@/lib/industry-keys";
import { ApprovalTable } from "./ApprovalTable";

export default async function ApprovalPage() {
  const db = getDb();

  const rows = await db
    .select({
      id: leads.id,
      businessName: leads.businessName,
      slug: leads.slug,
      city: leads.city,
      industryKey: leads.industryKey,
      industryClassificationConfidence: leads.industryClassificationConfidence,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(eq(leads.status, "awaiting_approval"));

  const serialized = rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt ? Number(r.updatedAt) : null,
  }));

  const validIndustryKeys = getValidIndustryKeys();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Approval Queue</h1>
          <p className="text-stone-500 text-sm mt-1">
            {rows.length} lead{rows.length !== 1 ? "s" : ""} awaiting approval
          </p>
        </div>
      </div>

      <ApprovalTable leads={serialized} validIndustryKeys={validIndustryKeys} />
    </div>
  );
}
