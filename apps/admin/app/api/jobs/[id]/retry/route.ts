import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pipelineJobs } from "@atelier/db";
import { eq } from "drizzle-orm";
import { enqueue } from "@/lib/queue";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  const job = ((await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, id))))[0];
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "failed") {
    return NextResponse.json({ error: "Job is not in failed state" }, { status: 400 });
  }

  // Enqueue a new job with the same step and payload
  const newId = await enqueue(db, {
    leadId: job.leadId ?? undefined,
    step: job.pipelineStep,
    payload: (job.payload as Record<string, unknown>) ?? {},
  });

  // Mark original job as succeeded with a note
  await db.update(pipelineJobs)
    .set({
      status: "succeeded",
      finishedAt: new Date(),
      errorMessage: `retried as ${newId}`,
    })
    .where(eq(pipelineJobs.id, id));

  return NextResponse.json({ ok: true, newJobId: newId });
}
