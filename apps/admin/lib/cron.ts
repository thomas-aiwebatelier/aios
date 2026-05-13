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
  tasks.push(cron.schedule("0 7 * * *", () => {
    const db = getDb();
    const discovered = db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.status, "discovered"))
      .all();

    if (discovered.length === 0) {
      logger.info("cron: research tick — no discovered leads to research", {
        ts: new Date().toISOString(),
      });
      return;
    }

    for (const lead of discovered) {
      enqueue(db, { leadId: lead.id, step: "research", payload: {} });
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

  // 03:00 daily — delete CF projects for declined leads
  tasks.push(cron.schedule("0 3 * * *", () => {
    logger.info("cron: teardown-declined tick", { ts: new Date().toISOString() });
    // TODO: spawn scripts/cron/teardown-declined.ts (Task 4.x)
  }));

  // 02:00 daily — SQLite backup
  tasks.push(cron.schedule("0 2 * * *", () => {
    logger.info("cron: backup-db tick", { ts: new Date().toISOString() });
    // TODO: spawn scripts/cron/backup-db.ts (Task 4.x)
  }));

  logger.info("cron: 5 schedules registered");
}

export function stopCronJobs(): void {
  for (const t of tasks) t.stop();
  tasks = [];
}
