import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const env = readFileSync(join(root, ".env"), "utf8");
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim();

const sql = postgres(url, { prepare: false });
try {
  // 1. Dedupe: delete all but the most-recent failed research job per lead
  const deleted = await sql`
    DELETE FROM pipeline_jobs
    WHERE pipeline_step = 'research' AND status = 'failed'
      AND id NOT IN (
        SELECT DISTINCT ON (lead_id) id
        FROM pipeline_jobs
        WHERE pipeline_step = 'research' AND status = 'failed'
        ORDER BY lead_id, created_at DESC
      )
    RETURNING id`;
  console.log(`deleted ${deleted.length} duplicate failed research jobs`);

  // 2. Reset survivors to queued so the local-worker claims them
  const reset = await sql`
    UPDATE pipeline_jobs
    SET status = 'queued', error_message = NULL, started_at = NULL,
        finished_at = NULL, attempt_count = 0, last_heartbeat_at = NULL
    WHERE pipeline_step = 'research' AND status = 'failed'
    RETURNING id, lead_id`;
  console.log(`reset ${reset.length} research jobs to queued:`);
  for (const r of reset) console.log(`  job=${r.id.slice(0,8)} lead=${r.lead_id?.slice(0,8)}`);

  await sql.end();
} catch (e) {
  console.error("FAIL:", e.message);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
