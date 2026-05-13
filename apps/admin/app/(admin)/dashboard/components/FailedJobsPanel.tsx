import { getDb } from "@/lib/db";
import { pipelineJobs, leads } from "@atelier/db";
import { eq, desc } from "drizzle-orm";
import { RetryButton } from "./RetryButton";

export async function FailedJobsPanel() {
  const db = getDb();
  const rows = db
    .select({
      id: pipelineJobs.id,
      pipelineStep: pipelineJobs.pipelineStep,
      leadId: pipelineJobs.leadId,
      businessName: leads.businessName,
      errorMessage: pipelineJobs.errorMessage,
      startedAt: pipelineJobs.startedAt,
      payload: pipelineJobs.payload,
    })
    .from(pipelineJobs)
    .leftJoin(leads, eq(pipelineJobs.leadId, leads.id))
    .where(eq(pipelineJobs.status, "failed"))
    .orderBy(desc(pipelineJobs.finishedAt))
    .limit(20)
    .all();

  if (rows.length === 0) {
    return (
      <div className="p-6 text-stone-500 text-sm">No failed jobs.</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-stone-50">
            <th className="text-left px-4 py-3 font-medium text-stone-600">Step</th>
            <th className="text-left px-4 py-3 font-medium text-stone-600">Business / Lead ID</th>
            <th className="text-left px-4 py-3 font-medium text-stone-600">Error</th>
            <th className="text-left px-4 py-3 font-medium text-stone-600">Started</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((job) => (
            <tr key={job.id} className="border-b hover:bg-stone-50">
              <td className="px-4 py-3 font-mono text-xs text-stone-700">{job.pipelineStep}</td>
              <td className="px-4 py-3 text-stone-700">
                {job.businessName ?? <span className="font-mono text-xs text-stone-400">{job.leadId ?? "—"}</span>}
              </td>
              <td className="px-4 py-3 text-red-700 max-w-xs">
                <ErrorCell message={job.errorMessage} />
              </td>
              <td className="px-4 py-3 text-stone-400 text-xs">
                {job.startedAt ? new Date(Number(job.startedAt)).toLocaleString("nl-BE") : "—"}
              </td>
              <td className="px-4 py-3">
                <RetryButton jobId={job.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorCell({ message }: { message: string | null }) {
  if (!message) return <span className="text-stone-400">—</span>;
  const short = message.length > 100 ? message.slice(0, 100) + "…" : message;
  return <span title={message}>{short}</span>;
}
