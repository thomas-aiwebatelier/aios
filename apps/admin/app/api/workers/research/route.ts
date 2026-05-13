/**
 * POST /api/workers/research — Cloud Scheduler invocation point.
 *
 * Claims at most one pipeline_jobs row with step='research' and runs the
 * existing processResearchJob. See lib/worker-endpoint.ts for response shape.
 */

import { createWorkerHandler } from "@/lib/worker-endpoint";
import { processResearchJob } from "@/workers/research";

export const POST = createWorkerHandler("research", processResearchJob);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
