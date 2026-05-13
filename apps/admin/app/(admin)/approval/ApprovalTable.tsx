"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  businessName: string;
  slug: string;
  city: string;
  industryKey: string;
  industryClassificationConfidence: number | null;
  updatedAt: number | null;
}

interface PreviewData {
  brand: {
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    fontsDetected: { heading: string; body: string } | null;
    toneOfVoiceSummary: string | null;
    logoPath: string | null;
    socialLinks: Record<string, string> | null;
  } | null;
  inventory: {
    pages: Array<{ url: string; title: string; sections?: string[] }> | null;
  } | null;
  competitor: {
    competitorName: string | null;
    competitorUrl: string;
    selectionReason: string | null;
    learnings: string | null;
  } | null;
}

interface ApprovalTableProps {
  leads: Lead[];
  validIndustryKeys: string[];
}

function usePreview(leadId: string | null) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!leadId) { setData(null); return; }
    setFetching(true);
    fetch(`/api/leads/${leadId}/preview`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setFetching(false));
  }, [leadId]);

  return { data, fetching };
}

function PreviewPanel({ leadId }: { leadId: string }) {
  const { data, fetching } = usePreview(leadId);

  if (fetching) {
    return (
      <div className="p-6 bg-stone-50 border-t border-stone-200">
        <div className="h-4 bg-stone-200 rounded animate-pulse w-1/3 mb-2" />
        <div className="h-4 bg-stone-200 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  if (!data) return null;

  const { brand, inventory, competitor } = data;
  const pages = inventory?.pages ?? [];
  const firstPage = pages[0];

  return (
    <div className="p-6 bg-stone-50 border-t border-stone-200 grid grid-cols-2 gap-6">
      {/* Brand profile */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Brand profile</h3>
        {brand ? (
          <div className="space-y-2">
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
                <span className="font-medium">Heading:</span> {brand.fontsDetected.heading ?? "—"} ·{" "}
                <span className="font-medium">Body:</span> {brand.fontsDetected.body ?? "—"}
              </div>
            )}
            {brand.toneOfVoiceSummary && (
              <div className="text-xs text-stone-600">
                <span className="font-medium">Tone:</span> {brand.toneOfVoiceSummary}
              </div>
            )}
            {brand.logoPath && (
              <img src={brand.logoPath} alt="Logo" className="h-12 object-contain border border-stone-200 rounded bg-white p-1" />
            )}
            {brand.socialLinks && Object.keys(brand.socialLinks).length > 0 && (
              <div className="text-xs text-stone-600">
                <span className="font-medium">Social:</span>{" "}
                {Object.entries(brand.socialLinks).map(([k, v]) => `${k}: ${v}`).join(" · ")}
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
                {pages.length > 5 && <li className="text-stone-400">+ {pages.length - 5} more…</li>}
              </ul>
            )}
            {firstPage?.sections && firstPage.sections.length > 0 && (
              <div className="text-xs text-stone-600">
                <div className="font-medium mb-1">First page:</div>
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
      <div className="space-y-3 col-span-2">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Selected competitor</h3>
        {competitor ? (
          <div className="space-y-1 text-xs text-stone-600">
            <div className="font-medium text-stone-800">{competitor.competitorName ?? "—"}</div>
            <a href={competitor.competitorUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline break-all">
              {competitor.competitorUrl}
            </a>
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

export function ApprovalTable({ leads, validIndustryKeys }: ApprovalTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
        <p className="text-stone-500 mb-2">No leads awaiting approval.</p>
        <p className="text-stone-400 text-sm">Research completed leads will appear here.</p>
      </div>
    );
  }

  function setRowLoading(id: string, val: boolean) {
    setLoading((prev) => ({ ...prev, [id]: val }));
  }

  async function doAction(leadId: string, action: "approve" | "reject") {
    setRowLoading(leadId, true);
    try {
      const url = action === "approve" ? `/api/leads/${leadId}/approve` : `/api/leads/${leadId}/reject`;
      const res = await fetch(url, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) alert("Error: " + (json.error ?? res.statusText));
      else router.refresh();
    } catch (err) {
      alert("Network error: " + String(err));
    } finally {
      setRowLoading(leadId, false);
    }
  }

  async function doIndustryOverride(leadId: string, industryKey: string) {
    setRowLoading(leadId, true);
    try {
      const res = await fetch(`/api/leads/${leadId}/industry-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry_key: industryKey }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) alert("Error: " + (json.error ?? res.statusText));
      else router.refresh();
    } catch (err) {
      alert("Network error: " + String(err));
    } finally {
      setRowLoading(leadId, false);
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-stone-50">
            <th className="text-left px-4 py-3 font-medium text-stone-600">Business</th>
            <th className="text-left px-4 py-3 font-medium text-stone-600">City</th>
            <th className="text-left px-4 py-3 font-medium text-stone-600">Industry</th>
            <th className="text-left px-4 py-3 font-medium text-stone-600">Research date</th>
            <th className="px-4 py-3 font-medium text-stone-600 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <>
              <tr
                key={lead.id}
                className="border-b hover:bg-stone-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-stone-800">{lead.businessName}</div>
                  <div className="text-xs text-stone-400">{lead.slug}</div>
                </td>
                <td className="px-4 py-3 text-stone-600">{lead.city}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.industryKey}
                    disabled={loading[lead.id]}
                    onChange={(e) => doIndustryOverride(lead.id, e.target.value)}
                    className="text-xs border border-stone-300 rounded px-2 py-1 text-stone-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {validIndustryKeys.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-stone-400 text-xs">
                  {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString("nl-BE") : "—"}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => doAction(lead.id, "approve")}
                      disabled={loading[lead.id]}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      Approve & Generate
                    </button>
                    <button
                      onClick={() => doAction(lead.id, "reject")}
                      disabled={loading[lead.id]}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
              {expandedId === lead.id && (
                <tr key={lead.id + "-preview"} className="border-b bg-stone-50">
                  <td colSpan={5} className="p-0">
                    <PreviewPanel leadId={lead.id} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
