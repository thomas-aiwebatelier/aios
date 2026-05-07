import cron, { ScheduledTask } from "node-cron";
import { logger } from "./logger.js";

let tasks: ScheduledTask[] = [];

export function registerCronJobs(): void {
  if (tasks.length > 0) return; // idempotent, paired with instrumentation guard

  // 06:00 daily — find new leads
  tasks.push(cron.schedule("0 6 * * *", () => {
    logger.info("cron: discovery tick", { ts: new Date().toISOString() });
    // TODO: spawn scripts/cron/run-discovery.ts (Task 3.x)
  }));

  // 07:00 daily — research discovered leads
  tasks.push(cron.schedule("0 7 * * *", () => {
    logger.info("cron: research tick", { ts: new Date().toISOString() });
    // TODO: spawn scripts/cron/run-research.ts (Task 3.x)
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
