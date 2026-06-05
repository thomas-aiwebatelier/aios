/**
 * cron.ts — In-process cron schedules (Migration Plan B).
 *
 * All time-based ticks that used to live here have moved to Cloud Scheduler:
 *
 *   - discovery (was: 06:00 daily, log-only stub)
 *       → Cloud Scheduler POST /api/workers/discovery every minute
 *   - research (was: 07:00 daily, scanned for status='discovered' leads)
 *       → Cloud Scheduler POST /api/workers/research every minute. Research
 *         jobs are now enqueued by /api/leads (manual trigger) or by the
 *         discovery worker on insert, not by a daily scan.
 *   - poll-replies (was: every 30 min, 08:00-22:00, stub)
 *       → Cloud Scheduler POST /api/workers/reply-poll every 5 minutes
 *   - teardown-declined (was: 03:00 daily, scripts/cron/teardown-declined.ts)
 *       → TODO: needs its own Cloud Scheduler endpoint (POST /api/workers/teardown-declined).
 *         Deferred to a follow-up commit — the script still exists and can be
 *         invoked manually via `pnpm tsx scripts/cron/teardown-declined.ts`.
 *   - backup-db (was: 02:00 daily, better-sqlite3 .backup())
 *       → Cloud SQL automated backups + PITR (no app-side cron needed).
 *
 * registerCronJobs() is kept as a no-op so instrumentation.ts can continue
 * calling it without conditional logic; if/when a future schedule belongs
 * truly in-process (e.g. a per-request hot-path warmer), it can be added
 * here without changing the boot wiring.
 */

export function registerCronJobs(): void {
  // Intentionally empty — see file header.
}
