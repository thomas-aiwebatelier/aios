/**
 * POST /api/workers/discovery — Cloud Scheduler invocation point.
 *
 * Claims at most one pipeline_jobs row with step='discovery' and runs the
 * existing processDiscoveryJob. See lib/worker-endpoint.ts for response shape.
 */

import { createWorkerHandler } from "@/lib/worker-endpoint";
import { processDiscoveryJob } from "@/workers/discovery";

export const POST = createWorkerHandler("discovery", processDiscoveryJob);

// Force Node.js runtime — Edge doesn't ship postgres-js / playwright deps.
export const runtime = "nodejs";
// Cloud Scheduler invocations should not be cached.
export const dynamic = "force-dynamic";
