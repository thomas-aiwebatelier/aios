"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface StartSequenceButtonProps {
  leadId: string;
}

export function StartSequenceButton({ leadId }: StartSequenceButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/sequence/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">{error}</div>
      )}
      <button
        onClick={handleStart}
        disabled={loading}
        className="inline-flex items-center rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? "Starten…" : "▶ Sequence starten"}
      </button>
      <p className="text-xs text-stone-400">Maakt 3 e-mailstappen aan (Onthulling → Social proof → Afsluiter).</p>
    </div>
  );
}
