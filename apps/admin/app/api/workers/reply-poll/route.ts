/**
 * POST /api/workers/reply-poll — Cloud Scheduler invocation point.
 *
 * Periodic scan (not job-queue based). Hit every ~5 minutes by Cloud
 * Scheduler. See lib/worker-endpoint.ts (createScanHandler) for response
 * shape and workers/reply-poll.ts for the scan logic.
 */

import { createScanHandler } from "@/lib/worker-endpoint";
import { processReplyPollJob } from "@/workers/reply-poll";

export const POST = createScanHandler("reply-poll", processReplyPollJob);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
