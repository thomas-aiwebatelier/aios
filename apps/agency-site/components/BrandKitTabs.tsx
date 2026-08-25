"use client";

import { useState } from "react";

export type KitTab = { id: string; title: string; content: string; html: string };

/**
 * Tabbed Brand Guidelines: one tab per file (visual / voice / business).
 *
 * Read-only. This used to render BrandFileEditor, which saved through
 * updateBrandFile — now admin-only, with UPDATE revoked from the client role
 * at the database. Leaving an editor here would just hand clients a save
 * button that always errors.
 */
export default function BrandKitTabs({ files }: { files: KitTab[] }) {
  const [active, setActive] = useState(0);
  if (files.length === 0) return null;
  const current = files[Math.min(active, files.length - 1)];

  return (
    <div className="brandkit">
      <div className="brandkit__tabs" role="tablist">
        {files.map((f, i) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`brandkit__tab ${i === active ? "brandkit__tab--active" : ""}`}
            onClick={() => setActive(i)}
          >
            {f.title}
          </button>
        ))}
      </div>
      <article
        key={current.id}
        className="brandfile"
        role="tabpanel"
        aria-label={current.title}
      >
        <div
          className="brandfile__body prose"
          // Rendered server-side from the stored markdown, same as before.
          dangerouslySetInnerHTML={{ __html: current.html }}
        />
      </article>
    </div>
  );
}
