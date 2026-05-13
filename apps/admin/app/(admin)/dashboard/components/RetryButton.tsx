"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RetryButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRetry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert("Retry failed: " + (json.error ?? res.statusText));
      } else {
        router.refresh();
      }
    } catch (err) {
      alert("Network error: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "…" : "Retry"}
    </button>
  );
}
