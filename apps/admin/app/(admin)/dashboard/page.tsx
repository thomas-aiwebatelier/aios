import { getDb } from "@/lib/db";
import { leads, pipelineJobs } from "@atelier/db";
import { eq, desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { TriggerResearchModal } from "../_components/TriggerResearchModal";
import { LiveActivity } from "../_components/LiveActivity";
import { FailedJobsPanel } from "./components/FailedJobsPanel";

async function getStatusCounts() {
  const db = getDb();

  const allLeads = await db.select({ status: leads.status }).from(leads);

  const discovered = allLeads.filter((l) =>
    ["discovered", "researching"].includes(l.status)
  ).length;
  const awaitingApproval = allLeads.filter((l) => l.status === "awaiting_approval").length;
  const generated = allLeads.filter((l) =>
    ["approved", "generating", "generated", "deployed"].includes(l.status)
  ).length;
  const sent = allLeads.filter((l) =>
    ["email_drafted", "email_sent", "accepted", "declined"].includes(l.status)
  ).length;

  return { discovered, awaitingApproval, generated, sent };
}

async function getRecentJobs() {
  const db = getDb();

  const jobs = await db
    .select({
      id: pipelineJobs.id,
      pipelineStep: pipelineJobs.pipelineStep,
      status: pipelineJobs.status,
      leadId: pipelineJobs.leadId,
      businessName: leads.businessName,
      errorMessage: pipelineJobs.errorMessage,
      finishedAt: pipelineJobs.finishedAt,
      startedAt: pipelineJobs.startedAt,
      createdAt: pipelineJobs.createdAt,
    })
    .from(pipelineJobs)
    .leftJoin(leads, eq(pipelineJobs.leadId, leads.id))
    .orderBy(desc(pipelineJobs.createdAt))
    .limit(20);

  return jobs.map((j) => ({
    ...j,
    finishedAt: j.finishedAt ? Number(j.finishedAt) : null,
    startedAt: j.startedAt ? Number(j.startedAt) : null,
    createdAt: j.createdAt ? Number(j.createdAt) : null,
  }));
}

const STAT_CARDS = [
  { label: "Discovered", key: "discovered", href: "/discovery", color: "text-indigo-700" },
  { label: "Awaiting approval", key: "awaitingApproval", href: "/approval", color: "text-orange-600" },
  { label: "Generated", key: "generated", href: null, color: "text-green-700" },
  { label: "Sent", key: "sent", href: null, color: "text-stone-700" },
] as const;

export default async function DashboardPage() {
  const [counts, recentJobs] = await Promise.all([getStatusCounts(), getRecentJobs()]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
        <TriggerResearchModal />
      </div>

      {/* Status counts */}
      <section>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Pipeline status</h2>
        <div className="grid grid-cols-4 gap-4">
          {STAT_CARDS.map((card) => {
            const count = counts[card.key as keyof typeof counts];
            const inner = (
              <div className="bg-white border border-stone-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
                <div className={`text-3xl font-bold ${card.color}`}>{count}</div>
                <div className="text-sm text-stone-500 mt-1">{card.label}</div>
              </div>
            );
            return card.href ? (
              <Link key={card.key} href={card.href}>{inner}</Link>
            ) : (
              <div key={card.key}>{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Recent activity — live polling */}
      <section>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
          Recent activity <span className="text-xs font-normal text-stone-400">(refreshes every 5s)</span>
        </h2>
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <LiveActivity initialJobs={recentJobs} />
        </div>
      </section>

      {/* Failed jobs */}
      <section>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Failed jobs</h2>
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <FailedJobsPanel />
        </div>
      </section>
    </div>
  );
}
