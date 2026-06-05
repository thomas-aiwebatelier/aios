"use client";

import { useState } from "react";
import { updateBrandFile } from "@/lib/brand-file-actions";

/** View (rendered markdown) / edit (raw textarea) toggle for one brand-kit file. */
export default function BrandFileEditor({
  id,
  title,
  content,
  html,
}: {
  id: string;
  title: string;
  content: string;
  html: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content);
  const [busy, setBusy] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await updateBrandFile(id, value);
    setBusy(false);
    setEditing(false);
  }

  return (
    <section className="brandfile">
      <header className="brandfile__head">
        <h2 className="brandfile__title">{title}</h2>
        <button
          type="button"
          className="brandfile__toggle"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Annuleer" : "Bewerk"}
        </button>
      </header>
      {editing ? (
        <form onSubmit={onSave} className="brandfile__form">
          <textarea
            className="brandfile__textarea"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={16}
          />
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Opslaan…" : "Opslaan"}
          </button>
        </form>
      ) : (
        <div
          className="brandfile__md"
          // Content is our own generated markdown, rendered server-side.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </section>
  );
}
