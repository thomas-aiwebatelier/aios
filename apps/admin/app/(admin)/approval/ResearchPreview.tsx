import { getDb } from "@/lib/db";
import { brandProfiles, siteInventories, competitors } from "@atelier/db";
import { eq } from "drizzle-orm";
import type { InventoryPage } from "@atelier/db";

export async function ResearchPreview({ leadId }: { leadId: string }) {
  const db = getDb();

  const brand = db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.leadId, leadId))
    .get();

  const inventory = db
    .select()
    .from(siteInventories)
    .where(eq(siteInventories.leadId, leadId))
    .get();

  const competitor = db
    .select()
    .from(competitors)
    .where(eq(competitors.leadId, leadId))
    .get();

  const pages = (inventory?.pages as InventoryPage[] | null) ?? [];
  const firstPage = pages[0];

  return (
    <div className="p-6 bg-stone-50 border-t border-stone-200 grid grid-cols-2 gap-6">
      {/* Brand profile */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Brand profile</h3>
        {brand ? (
          <div className="space-y-2">
            {/* Color swatches */}
            <div className="flex gap-2">
              {[
                { label: "Primary", color: brand.primaryColor },
                { label: "Secondary", color: brand.secondaryColor },
                { label: "Accent", color: brand.accentColor },
              ].map((s) =>
                s.color ? (
                  <div key={s.label} className="text-center">
                    <div
                      className="w-8 h-8 rounded border border-stone-200 shadow-sm"
                      style={{ backgroundColor: s.color }}
                      title={s.color}
                    />
                    <div className="text-xs text-stone-400 mt-1">{s.label}</div>
                  </div>
                ) : null
              )}
            </div>
            {brand.fontsDetected && (
              <div className="text-xs text-stone-600">
                <span className="font-medium">Heading:</span>{" "}
                {(brand.fontsDetected as { heading: string; body: string }).heading ?? "—"} ·{" "}
                <span className="font-medium">Body:</span>{" "}
                {(brand.fontsDetected as { heading: string; body: string }).body ?? "—"}
              </div>
            )}
            {brand.toneOfVoiceSummary && (
              <div className="text-xs text-stone-600">
                <span className="font-medium">Tone:</span> {brand.toneOfVoiceSummary}
              </div>
            )}
            {brand.logoPath && (
              <div>
                <img
                  src={brand.logoPath}
                  alt="Logo"
                  className="h-12 object-contain border border-stone-200 rounded bg-white p-1"
                />
              </div>
            )}
            {brand.socialLinks && Object.keys(brand.socialLinks as Record<string, string>).length > 0 && (
              <div className="text-xs text-stone-600">
                <span className="font-medium">Social:</span>{" "}
                {Object.entries(brand.socialLinks as Record<string, string>)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        ) : (
          <p className="text-stone-400 text-xs">No brand profile yet.</p>
        )}
      </div>

      {/* Site inventory */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Site inventory</h3>
        {inventory ? (
          <div className="space-y-2">
            <div className="text-xs text-stone-600">
              <span className="font-medium">{pages.length}</span> pages crawled
            </div>
            {pages.length > 0 && (
              <ul className="text-xs text-stone-500 space-y-0.5">
                {pages.slice(0, 5).map((p, i) => (
                  <li key={i} className="truncate">• {p.title || p.url}</li>
                ))}
                {pages.length > 5 && (
                  <li className="text-stone-400">+ {pages.length - 5} more…</li>
                )}
              </ul>
            )}
            {firstPage && firstPage.sections && firstPage.sections.length > 0 && (
              <div className="text-xs text-stone-600">
                <div className="font-medium mb-1">First page content:</div>
                <div className="text-stone-500 line-clamp-3">
                  {firstPage.sections.join(" ").slice(0, 500)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-stone-400 text-xs">No site inventory yet.</p>
        )}
      </div>

      {/* Competitor */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Selected competitor</h3>
        {competitor ? (
          <div className="space-y-1 text-xs text-stone-600">
            <div className="font-medium text-stone-800">{competitor.competitorName ?? "—"}</div>
            <div>
              <a href={competitor.competitorUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline break-all">
                {competitor.competitorUrl}
              </a>
            </div>
            {competitor.selectionReason && (
              <div><span className="font-medium">Reason:</span> {competitor.selectionReason}</div>
            )}
            {competitor.learnings && (
              <div><span className="font-medium">Learnings:</span> {competitor.learnings}</div>
            )}
          </div>
        ) : (
          <p className="text-stone-400 text-xs">No competitor selected yet.</p>
        )}
      </div>
    </div>
  );
}
