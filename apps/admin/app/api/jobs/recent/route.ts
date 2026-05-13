import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pipelineJobs, leads } from "@atelier/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();

  const jobs = db
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
    .limit(20)
    .all();

  const serialized = jobs.map((j) => ({
    ...j,
    finishedAt: j.finishedAt ? Number(j.finishedAt) : null,
    startedAt: j.startedAt ? Number(j.startedAt) : null,
    createdAt: j.createdAt ? Number(j.createdAt) : null,
  }));

  return NextResponse.json({ jobs: serialized });
}
