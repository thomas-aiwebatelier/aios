import { getDb } from "@/lib/db";
import { brands, leads } from "@atelier/db";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Self-serve Build requests: brands that have a linked lead (created via the
 * agency-site front door). The full lead pipeline + approval lives in the
 * Approval Queue / Leads — this is the at-a-glance self-serve view.
 */
export default async function AdminBuildPage() {
  const db = getDb();

  const rows = await db
    .select({
      brandId: brands.id,
      sourceUrl: brands.sourceUrl,
      businessName: leads.businessName,
      leadStatus: leads.status,
      createdAt: brands.createdAt,
    })
    .from(brands)
    .innerJoin(leads, eq(brands.leadId, leads.id))
    .orderBy(desc(brands.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Build</h1>
        <p className="text-stone-500 text-sm mt-1">
          {rows.length} self-serve site-aanvra{rows.length !== 1 ? "gen" : "ag"}
        </p>
      </div>

      <div className="overflow-x-auto border border-stone-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Bedrijf</th>
              <th className="px-3 py-2 font-medium">Website</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.brandId} className="border-t border-stone-100">
                <td className="px-3 py-2 font-medium text-stone-800">{r.businessName}</td>
                <td className="px-3 py-2">
                  <a className="text-indigo-600" href={r.sourceUrl} target="_blank" rel="noreferrer">
                    {r.sourceUrl}
                  </a>
                </td>
                <td className="px-3 py-2">{r.leadStatus}</td>
                <td className="px-3 py-2">
                  {r.leadStatus === "awaiting_approval" && (
                    <a href="/approval" className="text-indigo-600">
                      Beoordelen →
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-stone-400">
                  Nog geen self-serve aanvragen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
