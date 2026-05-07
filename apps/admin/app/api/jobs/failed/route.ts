import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pipelineJobs } from "@atelier/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const jobs = db
    .select()
    .from(pipelineJobs)
    .where(eq(pipelineJobs.status, "failed"))
    .orderBy(desc(pipelineJobs.finishedAt))
    .limit(50)
    .all();
  return NextResponse.json({ jobs });
}
