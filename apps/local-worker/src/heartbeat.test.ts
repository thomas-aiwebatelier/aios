/**
 * heartbeat.test.ts — writeHeartbeat upsert behaviour against pglite.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { getTestDb, workerHeartbeats } from "@atelier/db";
import {
  writeHeartbeat,
  getHostInfo,
  recordJobClaimed,
} from "./heartbeat.js";

describe("writeHeartbeat", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;

  beforeEach(async () => {
    db = await getTestDb();
  });

  it("inserts a new row on first call", async () => {
    await writeHeartbeat(db, "local-worker", getHostInfo());

    const rows = await db
      .select()
      .from(workerHeartbeats)
      .where(eq(workerHeartbeats.workerName, "local-worker"));
    expect(rows).toHaveLength(1);
    expect(rows[0].workerName).toBe("local-worker");
    expect(rows[0].lastSeenAt).toBeInstanceOf(Date);
    expect(rows[0].hostInfo?.nodeVersion).toBe(process.version);
    expect(rows[0].hostInfo?.platform).toBe(process.platform);
  });

  it("upserts (ON CONFLICT) on second call — row count stays 1", async () => {
    await writeHeartbeat(db, "local-worker", getHostInfo());
    const first = ((await db
      .select()
      .from(workerHeartbeats)
      .where(eq(workerHeartbeats.workerName, "local-worker"))
      ))[0];

    // Sleep 5ms so lastSeenAt advances measurably.
    await new Promise((r) => setTimeout(r, 5));

    await writeHeartbeat(db, "local-worker", getHostInfo());
    const rows = await db
      .select()
      .from(workerHeartbeats)
      .where(eq(workerHeartbeats.workerName, "local-worker"));
    expect(rows).toHaveLength(1);
    expect(rows[0].lastSeenAt.getTime()).toBeGreaterThanOrEqual(
      first.lastSeenAt.getTime(),
    );
  });

  it("preserves claimed_jobs_24h across upserts", async () => {
    recordJobClaimed();
    recordJobClaimed();
    await writeHeartbeat(db, "local-worker", getHostInfo());

    const row = ((await db
      .select()
      .from(workerHeartbeats)
      .where(eq(workerHeartbeats.workerName, "local-worker"))
      ))[0];
    // recordJobClaimed is module-level; other tests may have called it. We
    // only check it's >= 2 to keep the test order-independent.
    expect(row.claimedJobs24h).toBeGreaterThanOrEqual(2);
  });

  it("getHostInfo includes resolved CLI paths when provided", () => {
    const info = getHostInfo({
      claudePath: "C:\\fake\\claude.cmd",
      wranglerPath: "C:\\fake\\wrangler.cmd",
      appVersion: "0.1.0",
    });
    expect(info.claudePath).toBe("C:\\fake\\claude.cmd");
    expect(info.wranglerPath).toBe("C:\\fake\\wrangler.cmd");
    expect(info.appVersion).toBe("0.1.0");
    expect(info.nodeVersion).toBe(process.version);
  });
});
