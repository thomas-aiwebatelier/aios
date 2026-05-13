import { getDb } from "@/lib/db";
import { leads } from "@atelier/db";
import { inArray } from "drizzle-orm";
import { TriggerResearchModal } from "../_components/TriggerResearchModal";
import { DiscoveryTable } from "./DiscoveryTable";

export default async function DiscoveryPage() {
  const db = getDb();

  const rows = await db
    .select({
      id: leads.id,
      businessName: leads.businessName,
      slug: leads.slug,
      city: leads.city,
      existingWebsiteUrl: leads.existingWebsiteUrl,
      websiteStalenessScore: leads.websiteStalenessScore,
      industryKey: leads.industryKey,
      industryClassificationConfidence: leads.industryClassificationConfidence,
      status: leads.status,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(inArray(leads.status, ["discovered", "researching"]));

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt ? Number(r.createdAt) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Discovery Queue</h1>
          <p className="text-stone-500 text-sm mt-1">{rows.length} lead{rows.length !== 1 ? "s" : ""}</p>
        </div>
        <TriggerResearchModal />
      </div>

      <DiscoveryTable leads={serialized} />
    </div>
  );
}
