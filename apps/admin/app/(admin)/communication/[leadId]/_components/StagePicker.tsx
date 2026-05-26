"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const STAGE_LABELS: Record<string, string> = {
  new: "Nieuw",
  contacted: "Gecontacteerd",
  follow_up: "Opvolging",
  in_gesprek: "In gesprek",
  won: "Gewonnen",
  lost: "Verloren",
};

const STAGES = Object.keys(STAGE_LABELS);

interface StagePickerProps {
  leadId: string;
  current: string | null;
}

export function StagePicker({ leadId, current }: StagePickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const salesStage = e.target.value;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salesStage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [leadId, router]);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 space-y-2">
      <h2 className="text-sm font-semibold text-stone-700">Verkoopfase</h2>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">{error}</div>
      )}
      <select
        defaultValue={current ?? ""}
        onChange={handleChange}
        disabled={saving}
        className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:opacity-50"
      >
        <option value="">— Kies fase —</option>
        {STAGES.map((s) => (
          <option key={s} value={s}>{STAGE_LABELS[s]}</option>
        ))}
      </select>
    </div>
  );
}
