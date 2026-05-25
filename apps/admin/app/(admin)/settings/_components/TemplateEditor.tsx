"use client";

/**
 * TemplateEditor.tsx — client editor for the outreach email template.
 *
 * Edits the subject + body (with {{placeholder}} tokens), previews against
 * sample data, and saves via PUT /api/settings/email-template. "Herstel
 * standaard" loads the built-in default into the fields (not yet saved until
 * the operator clicks Opslaan).
 */

import { useState, useMemo } from "react";

interface Placeholder {
  token: string;
  description: string;
}

interface Props {
  initialSubject: string;
  initialBody: string;
  defaultSubject: string;
  defaultBody: string;
  placeholders: Placeholder[];
}

type Status = "idle" | "saving" | "saved" | "error";

/** Sample data used purely for the live preview. */
const SAMPLE_VARS: Record<string, string> = {
  greeting: "Beste ondernemer",
  businessName: "Bakkerij De Korenbloem",
  city: "Antwerpen",
  industry: "bakkerij of horecazaak",
  observation:
    "Het viel me op dat Bakkerij De Korenbloem nog geen eigen website heeft. Vandaag zoeken klanten een lokale bakkerij in Antwerpen vaak eerst online, en dan maakt een vindbare site het verschil.",
  previewUrl: "https://voorbeeld.aiwebatelier.com",
  performance: "98",
};

/** Mirror of lib/email-template interpolate() — kept tiny + client-safe. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in vars ? vars[key] : match,
  );
}

export function TemplateEditor({
  initialSubject,
  initialBody,
  defaultSubject,
  defaultBody,
  placeholders,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const previewSubject = useMemo(() => interpolate(subject, SAMPLE_VARS), [subject]);
  const previewBody = useMemo(() => interpolate(body, SAMPLE_VARS), [body]);

  async function handleSave() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/settings/email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  function handleReset() {
    setSubject(defaultSubject);
    setBody(defaultBody);
    setStatus("idle");
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Placeholder legend */}
      <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-medium text-stone-500 mb-2">
          Beschikbare placeholders
        </p>
        <ul className="grid gap-1 text-sm text-stone-700 sm:grid-cols-2">
          {placeholders.map((p) => (
            <li key={p.token} className="flex gap-2">
              <code className="rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-800">
                {p.token}
              </code>
              <span className="text-xs text-stone-500">{p.description}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Status banners */}
      {status === "saved" && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          Sjabloon opgeslagen.
        </div>
      )}
      {status === "error" && error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">
          Onderwerp
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setStatus("idle");
          }}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
      </div>

      {/* Body / preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-stone-500">Tekst</label>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="text-xs text-stone-500 hover:text-stone-700 underline"
          >
            {showPreview ? "Bewerken" : "Voorbeeld"}
          </button>
        </div>

        {showPreview ? (
          <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-800 whitespace-pre-wrap min-h-[360px]">
            <p className="font-medium text-stone-900 mb-2">{previewSubject}</p>
            {previewBody}
          </div>
        ) : (
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setStatus("idle");
            }}
            rows={22}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving" || !subject.trim() || !body.trim()}
          className="inline-flex items-center rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "saving" ? "Opslaan…" : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Herstel standaard
        </button>
      </div>
    </div>
  );
}
