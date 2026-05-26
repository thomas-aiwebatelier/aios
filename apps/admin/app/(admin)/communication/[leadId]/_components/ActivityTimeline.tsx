"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export type ActivityData = {
  id: string;
  type: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  author: string;
  createdAt: string; // ISO string from server
};

const TYPE_LABELS: Record<string, string> = {
  email_sent: "✉︎ E-mail verzonden",
  email_replied: "↩︎ Antwoord ontvangen",
  stage_change: "→ Fase gewijzigd",
  note: "📝 Notitie",
  sequence_enrolled: "▶ Sequence gestart",
  step_skipped: "⤼ Stap overgeslagen",
  call_logged: "☎ Gesprek",
};

interface ActivityTimelineProps {
  activities: ActivityData[];
  leadId: string;
}

export function ActivityTimeline({ activities, leadId }: ActivityTimelineProps) {
  const router = useRouter();
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddNote = useCallback(async () => {
    if (!noteBody.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteBody }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setNoteBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [leadId, noteBody, router]);

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 space-y-4">
      <h2 className="text-sm font-semibold text-stone-700">Activiteiten</h2>

      {/* Add note */}
      <div className="space-y-2">
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          placeholder="Notitie toevoegen…"
          rows={2}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">{error}</div>
        )}
        <button
          onClick={handleAddNote}
          disabled={saving || !noteBody.trim()}
          className="inline-flex items-center rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {saving ? "Opslaan…" : "Notitie toevoegen"}
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {activities.length === 0 && (
          <p className="text-xs text-stone-400">Nog geen activiteiten.</p>
        )}
        {activities.map((a) => (
          <div key={a.id} className="flex gap-3 text-sm">
            <div className="flex-shrink-0 pt-0.5">
              <span className="text-stone-400 text-xs">
                {TYPE_LABELS[a.type] ?? a.type}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {a.body && <p className="text-stone-700 whitespace-pre-line">{a.body}</p>}
              <p className="text-xs text-stone-400 mt-0.5">
                {new Date(a.createdAt).toLocaleString("nl-BE")}
                {a.author ? ` · ${a.author}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
