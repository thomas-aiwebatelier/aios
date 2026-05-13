"use client";

import { useEffect, useState } from "react";

interface JobRow {
  id: string;
  pipelineStep: string;
  status: string;
  leadId: string | null;
  businessName: string | null;
  errorMessage: string | null;
  finishedAt: number | null;
  startedAt: number | null;
  createdAt: number | null;
}

function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 60_000) return rtf.format(-Math.floor(diff / 1000), "second");
  if (diff < 3_600_000) return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000) return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  return rtf.format(-Math.floor(diff / 86_400_000), "day");
}

const STATUS_CLASSES: Record<string, string> = {
  queued: "bg-stone-100 text-stone-600",
  running: "bg-blue-100 text-blue-700",
  succeeded: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export function LiveActivity({ initialJobs }: { initialJobs: JobRow[] }) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/jobs/recent");
        if (res.ok) {
          const data = await res.json();
          setJobs(data.jobs ?? []);
        }
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(fetchJobs, 5_000);
    return () => clearInterval(interval);
  }, []);

  if (jobs.length === 0) {
    return <p className="text-stone-500 text-sm">No recent activity.</p>;
  }

  return (
    <div className="overflow-x-auto relative">
      {loading && (
        <div className="absolute top-0 right-0 text-xs text-stone-400 px-2 py-1">refreshing…</div>
      )}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-stone-50">
            <th className="text-left px-3 py-2 font-medium text-stone-600">Step</th>
            <th className="text-left px-3 py-2 font-medium text-stone-600">Business</th>
            <th className="text-left px-3 py-2 font-medium text-stone-600">Status</th>
            <th className="text-left px-3 py-2 font-medium text-stone-600">When</th>
            <th className="text-left px-3 py-2 font-medium text-stone-600">Error</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} className="border-b hover:bg-stone-50">
              <td className="px-3 py-2 font-mono text-xs text-stone-700">{job.pipelineStep}</td>
              <td className="px-3 py-2 text-stone-700">{job.businessName ?? <span className="text-stone-400">{job.leadId ?? "—"}</span>}</td>
              <td className="px-3 py-2">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_CLASSES[job.status] ?? "bg-stone-100 text-stone-600"}`}>
                  {job.status}
                </span>
              </td>
              <td className="px-3 py-2 text-stone-500 text-xs">
                {relativeTime(job.finishedAt ?? job.startedAt ?? job.createdAt)}
              </td>
              <td className="px-3 py-2 text-red-700 text-xs max-w-xs truncate">
                {job.errorMessage ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
