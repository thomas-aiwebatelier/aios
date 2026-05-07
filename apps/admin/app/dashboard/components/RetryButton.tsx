"use client";

import { useState } from "react";

export function RetryButton({ jobId }: { jobId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleRetry() {
    setState("loading");
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
      if (res.ok) {
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  if (state === "done") return <span className="text-green-600 text-sm">Queued</span>;
  if (state === "error") return <span className="text-red-600 text-sm">Failed</span>;

  return (
    <button
      onClick={handleRetry}
      disabled={state === "loading"}
      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
    >
      {state === "loading" ? "..." : "Retry"}
    </button>
  );
}
