import { getDb } from "@/lib/db";
import { pipelineJobs } from "@atelier/db";
import { eq, desc } from "drizzle-orm";
import { RetryButton } from "./RetryButton";

export async function FailedJobs() {
  const db = getDb();
  const rows = db
    .select()
    .from(pipelineJobs)
    .where(eq(pipelineJobs.status, "failed"))
    .orderBy(desc(pipelineJobs.finishedAt))
    .limit(20)
    .all();

  if (rows.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Failed Jobs</h2>
        <p className="text-gray-500 text-sm">No failed jobs.</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold mb-2">Failed Jobs</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-3 py-2">Step</th>
              <th className="text-left px-3 py-2">Lead ID</th>
              <th className="text-left px-3 py-2">Error</th>
              <th className="text-left px-3 py-2">Started At</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((job) => (
              <tr key={job.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-xs">{job.pipelineStep}</td>
                <td className="px-3 py-2 font-mono text-xs">{job.leadId ?? "—"}</td>
                <td className="px-3 py-2 text-red-700 max-w-xs truncate">{job.errorMessage ?? "—"}</td>
                <td className="px-3 py-2 text-gray-500">
                  {job.startedAt ? new Date(job.startedAt).toLocaleString("nl-BE") : "—"}
                </td>
                <td className="px-3 py-2">
                  <RetryButton jobId={job.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
