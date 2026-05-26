"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface NextActionProps {
  leadId: string;
  nextActionAt: string | null;
  nextActionNote: string | null;
}

export function NextAction({ leadId, nextActionAt, nextActionNote }: NextActionProps) {
  const router = useRouter();

  // nextActionAt is already an ISO string (or null) from the server
  const [dateVal, setDateVal] = useState<string>(
    nextActionAt ? nextActionAt.slice(0, 10) : ""
  );
  const [note, setNote] = useState(nextActionNote ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/leads/${leadId}/next-action`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextActionAt: dateVal || null,
          nextActionNote: note || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [leadId, dateVal, note, router]);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-stone-700">Volgende actie</h2>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">{error}</div>
      )}
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Datum</label>
        <input
          type="date"
          value={dateVal}
          onChange={(e) => setDateVal(e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-400 mb-1">Notitie</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Wat moet er gebeuren?"
          className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        {saved && <span className="text-xs text-green-600">Opgeslagen</span>}
      </div>
    </div>
  );
}
