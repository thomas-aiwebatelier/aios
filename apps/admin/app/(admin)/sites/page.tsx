import { getDb } from "@/lib/db";
import { leads, generatedSites } from "@atelier/db";
import { inArray, eq, desc } from "drizzle-orm";

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Approved",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  generating: {
    label: "Generating…",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  generated: {
    label: "Generated",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  generation_failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  deployed: {
    label: "Deployed",
    className: "bg-violet-50 text-violet-700 border border-violet-200",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? {
    label: status,
    className: "bg-stone-100 text-stone-600 border border-stone-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Lighthouse score chip ─────────────────────────────────────────────────────

function ScoreChip({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) {
    return (
      <span className="text-stone-400 text-xs">—</span>
    );
  }
  const color =
    value >= 90
      ? "text-emerald-700 bg-emerald-50"
      : value >= 70
      ? "text-amber-700 bg-amber-50"
      : "text-red-700 bg-red-50";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-medium ${color}`}>
      {label} {Math.round(value)}
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SitesPage() {
  const db = getDb();

  const PIPELINE_STATUSES = [
    "approved",
    "generating",
    "generated",
    "generation_failed",
    "deployed",
  ] as const;

  // Fetch all leads in the pipeline
  const pipelineLeads = await db
    .select({
      id: leads.id,
      businessName: leads.businessName,
      slug: leads.slug,
      city: leads.city,
      industryKey: leads.industryKey,
      status: leads.status,
    })
    .from(leads)
    .where(inArray(leads.status, [...PIPELINE_STATUSES]));

  // Fetch the latest generated_sites row for each lead
  // SQLite doesn't support lateral joins — fetch all rows and dedupe in JS
  const leadIds = pipelineLeads.map((l) => l.id);

  const allSiteRows =
    leadIds.length > 0
      ? await db
          .select({
            id: generatedSites.id,
            leadId: generatedSites.leadId,
            version: generatedSites.version,
            astroProjectPath: generatedSites.astroProjectPath,
            lighthouseScores: generatedSites.lighthouseScores,
            cloudflarePreviewUrl: generatedSites.cloudflarePreviewUrl,
            createdAt: generatedSites.createdAt,
          })
          .from(generatedSites)
          .where(inArray(generatedSites.leadId, leadIds))
          .orderBy(desc(generatedSites.version))
      : [];

  // Latest site per lead (first row per leadId since sorted desc by version)
  const latestSiteByLead = new Map<string, typeof allSiteRows[0]>();
  for (const row of allSiteRows) {
    if (!latestSiteByLead.has(row.leadId)) {
      latestSiteByLead.set(row.leadId, row);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Generated Sites</h1>
          <p className="text-stone-500 text-sm mt-1">
            {pipelineLeads.length} lead{pipelineLeads.length !== 1 ? "s" : ""} in the generation pipeline
          </p>
        </div>
      </div>

      {/* Table */}
      {pipelineLeads.length === 0 ? (
        <div className="border border-stone-200 rounded-lg p-12 text-center">
          <p className="text-stone-400 text-sm">
            No leads in the generation pipeline yet. Approve leads in the Approval Queue to get started.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Business
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Version
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Lighthouse
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {pipelineLeads.map((lead) => {
                const site = latestSiteByLead.get(lead.id);
                const scores = site?.lighthouseScores as Record<string, number> | null | undefined;

                return (
                  <tr key={lead.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">{lead.businessName}</div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">{lead.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {site ? (
                        <span className="font-mono text-xs">v{site.version}</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {scores ? (
                        <div className="flex flex-wrap gap-1">
                          <ScoreChip label="Perf" value={scores.performance} />
                          <ScoreChip label="A11y" value={scores.accessibility} />
                          <ScoreChip label="SEO" value={scores.seo} />
                          <ScoreChip label="BP" value={scores.bestPractices} />
                        </div>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {site?.astroProjectPath ? (
                          <a
                            href={`vscode://file/${encodeURI(site.astroProjectPath)}`}
                            className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-2"
                            title={site.astroProjectPath}
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-stone-300 text-xs">—</span>
                        )}
                        {site?.cloudflarePreviewUrl && (
                          <a
                            href={site.cloudflarePreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-violet-600 hover:text-violet-900 underline underline-offset-2"
                          >
                            Preview
                          </a>
                        )}
                        <button
                          disabled
                          className="text-xs text-stone-300 cursor-not-allowed"
                          title="Coming in Task 4.5"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
