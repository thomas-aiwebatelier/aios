import cron, { ScheduledTask } from "node-cron";
import { eq } from "drizzle-orm";
import { leads } from "@atelier/db";
import { enqueue } from "./queue.js";
import { getDb } from "./db.js";
import { logger } from "./logger.js";

let tasks: ScheduledTask[] = [];

export function registerCronJobs(): void {
  if (tasks.length > 0) return; // idempotent, paired with instrumentation guard

  // 06:00 daily — find new leads
  // Spine: discovery cron is intentionally log-only — manual trigger via
  // admin UI is the validation path. Wire this to enqueue {query: "..."}
  // once Task 3.9 (real-SMB gate) passes and a default query is decided.
  tasks.push(cron.schedule("0 6 * * *", () => {
    logger.info("cron: discovery tick (manual trigger only during spine)", {
      ts: new Date().toISOString(),
    });
  }));

  // 07:00 daily — research discovered leads
  tasks.push(cron.schedule("0 7 * * *", async () => {
    const db = getDb();
    const discovered = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.status, "discovered"));

    if (discovered.length === 0) {
      logger.info("cron: research tick — no discovered leads to research", {
        ts: new Date().toISOString(),
      });
      return;
    }

    for (const lead of discovered) {
      await enqueue(db, { leadId: lead.id, step: "research", payload: {} });
    }
    logger.info(
      `cron: research tick — enqueued ${discovered.length} research jobs`,
      { ts: new Date().toISOString() },
    );
  }));

  // Every 30 min, 08:00–22:00 — poll Gmail replies
  tasks.push(cron.schedule("*/30 8-22 * * *", () => {
    logger.info("cron: poll-replies tick", { ts: new Date().toISOString() });
    // TODO: spawn scripts/cron/poll-replies.ts (Task 4.x)
  }));

  // 03:00 daily — delete CF projects for declined leads (Task 4.10)
  tasks.push(cron.schedule("0 3 * * *", async () => {
    try {
      const { tearDownDeclinedLeads } = await import(
        "../../../scripts/cron/teardown-declined.js"
      );
      const n = await tearDownDeclinedLeads();
      logger.info(`cron: teardown-declined tick — ${n} leads torn down`, {
        ts: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("cron: teardown-declined failed", { err });
    }
  }));

  // 02:00 daily — DB backup
  // TODO(Postgres migration): Cloud SQL provides native automated backups;
  // the legacy scripts/cron/backup-db.ts uses better-sqlite3's .backup() API
  // which no longer exists. Rewrite using pg_dump (or simply drop the schedule
  // and rely on Cloud SQL automated backups + PITR). Disabled for now to keep
  // boot clean during Migration Plan A.
  // tasks.push(cron.schedule("0 2 * * *", async () => { ... }));

  logger.info("cron: 4 schedules registered (backup-db deferred)");
}

export function stopCronJobs(): void {
  for (const t of tasks) t.stop();
  tasks = [];
}
