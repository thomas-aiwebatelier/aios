"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Lead {
  id: string;
  businessName: string;
  slug: string;
  city: string;
  existingWebsiteUrl: string | null;
  websiteStalenessScore: number | null;
  industryKey: string;
  industryClassificationConfidence: number | null;
  status: string;
  createdAt: number | null;
}

function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 60_000) return rtf.format(-Math.floor(diff / 1000), "second");
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  return rtf.format(-Math.floor(diff / 86_400_000), "day");
}

export function DiscoveryTable({ leads }: { leads: Lead[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  if (leads.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
        <p className="text-stone-500 mb-2">No discovered leads.</p>
        <p className="text-stone-400 text-sm">
          Trigger research above or wait for the 06:00 cron.
        </p>
      </div>
    );
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkAction(action: "research" | "archive") {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const json = await res.json();
      if (!res.ok) alert("Error: " + (json.error ?? res.statusText));
      else {
        setSelected(new Set());
        router.refresh();
      }
    } catch (err) {
      alert("Network error: " + String(err));
    } finally {
      setBulkLoading(false);
    }
  }

  async function rowAction(id: string, action: "research" | "archive") {
    const url =
      action === "research"
        ? `/api/leads/${id}/research`
        : `/api/leads/${id}/archive`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert("Error: " + (json.error ?? res.statusText));
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
          <span className="text-sm text-indigo-700 font-medium">{selected.size} selected</span>
          <button
            onClick={() => bulkAction("research")}
            disabled={bulkLoading}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Send to research
          </button>
          <button
            onClick={() => bulkAction("archive")}
            disabled={bulkLoading}
            className="px-3 py-1 text-xs bg-stone-600 text-white rounded hover:bg-stone-700 disabled:opacity-50 transition-colors"
          >
            Archive
          </button>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-stone-50">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === leads.length && leads.length > 0}
                  onChange={toggleAll}
                  className="rounded border-stone-300"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Business</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">City</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Website</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Staleness</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Industry</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600">Age</th>
              <th className="px-4 py-3 font-medium text-stone-600">Actions</th>
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
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      className="rounded border-stone-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{lead.businessName}</div>
                    <div className="text-xs text-stone-400">{lead.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{lead.city}</td>
                  <td className="px-4 py-3">
                    {lead.existingWebsiteUrl ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">yes</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-500">no</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {lead.websiteStalenessScore != null ? lead.websiteStalenessScore : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-stone-700 text-xs">{lead.industryKey}</div>
                    {lead.industryClassificationConfidence != null && (
                      <ConfidenceBadge confidence={lead.industryClassificationConfidence} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs">
                    {relativeTime(lead.createdAt)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => rowAction(lead.id, "research")}
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                      >
                        Research
                      </button>
                      <button
                        onClick={() => rowAction(lead.id, "archive")}
                        className="px-2 py-1 text-xs bg-stone-200 text-stone-700 rounded hover:bg-stone-300 transition-colors"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === lead.id && (
                  <tr key={lead.id + "-expanded"} className="border-b">
                    <td colSpan={8} className="px-8 py-4 bg-stone-50">
                      <div className="text-sm text-stone-600 space-y-1">
                        <div><span className="font-medium">ID:</span> <span className="font-mono text-xs">{lead.id}</span></div>
                        <div><span className="font-medium">Status:</span> {lead.status}</div>
                        <div><span className="font-medium">Industry:</span> {lead.industryKey}</div>
                        {lead.existingWebsiteUrl && (
                          <div>
                            <span className="font-medium">Website:</span>{" "}
                            <a href={lead.existingWebsiteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                              {lead.existingWebsiteUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence < 0.6) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 mt-0.5">
        needs review ({Math.round(confidence * 100)}%)
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs bg-stone-100 text-stone-500 mt-0.5">
      {Math.round(confidence * 100)}%
    </span>
  );
}
