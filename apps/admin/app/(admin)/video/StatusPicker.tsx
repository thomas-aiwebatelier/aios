"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setVideoStatus } from "./actions";

/**
 * Move a deliverable along without touching a file.
 *
 * These values must stay in step with the labels in
 * apps/agency-site/lib/portal-status.ts — that map is what the client actually
 * reads, and an unmapped value falls back to a shrug ("Ik ben ermee bezig").
 */
const STATUSES = ["requested", "briefing", "producing", "review", "delivered"] as const;

export function StatusPicker({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <select
      value={status}
      disabled={busy}
      className="rounded border px-2 py-1 text-sm disabled:opacity-50"
      onChange={async (e) => {
        setBusy(true);
        try {
          await setVideoStatus(id, e.target.value);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
