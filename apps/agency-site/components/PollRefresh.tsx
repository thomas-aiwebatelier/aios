"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * While something is processing server-side (a brand kit building, an ad
 * generating), re-fetch the server component on an interval so the UI updates
 * without a manual refresh. Render it only while a job is in progress.
 */
export default function PollRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
