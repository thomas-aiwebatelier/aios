"use client";

import { useState } from "react";
import BrandFileEditor from "@/components/BrandFileEditor";

export type KitTab = { id: string; title: string; content: string; html: string };

/** Tabbed Brand Guidelines: one tab per file (visual / voice / business). */
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
      <BrandFileEditor
        key={current.id}
        id={current.id}
        title={current.title}
        content={current.content}
        html={current.html}
      />
    </div>
  );
}
