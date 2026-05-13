/**
 * POST /api/workers/outreach — Cloud Scheduler invocation point.
 *
 * Claims at most one pipeline_jobs row with step='outreach' and runs the
 * existing processOutreachJob. The 30-second undo window is enforced by
 * claimNext's `lte(createdAt, now())` filter — jobs inserted with a future
 * createdAt are invisible to claim until their delay expires.
 */

import { createWorkerHandler } from "@/lib/worker-endpoint";
import { processOutreachJob } from "@/workers/outreach";

export const POST = createWorkerHandler("outreach", processOutreachJob);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
