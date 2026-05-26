import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

// Read DATABASE_URL from repo-root .env
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const env = readFileSync(join(root, ".env"), "utf8");
const m = env.match(/^DATABASE_URL=(.*)$/m);
if (!m) { console.error("no DATABASE_URL"); process.exit(1); }
const url = m[1].trim();

const sql = postgres(url, { prepare: false });
try {
  const jobs = await sql`SELECT pipeline_step, status, count(*)::int AS n FROM pipeline_jobs GROUP BY pipeline_step, status ORDER BY pipeline_step, status`;
  console.log("=== pipeline_jobs ===");
  if (jobs.length === 0) console.log("  (none)");
  for (const j of jobs) console.log(`  ${j.pipeline_step.padEnd(12)} ${j.status.padEnd(12)} x${j.n}`);

  const leads = await sql`SELECT status, count(*)::int AS n FROM leads GROUP BY status ORDER BY status`;
  console.log("=== leads ===");
  for (const l of leads) console.log(`  ${l.status.padEnd(16)} x${l.n}`);

  // Show the most recent few research jobs with detail
  const recent = await sql`SELECT id, pipeline_step, status, lead_id, error_message, created_at FROM pipeline_jobs WHERE pipeline_step = 'research' ORDER BY created_at DESC LIMIT 5`;
  console.log("=== recent research jobs ===");
  for (const r of recent) console.log(`  ${r.status.padEnd(10)} lead=${(r.lead_id||'').slice(0,8)} err=${(r.error_message||'').slice(0,60)} at=${r.created_at?.toISOString?.()||r.created_at}`);

  await sql.end();
} catch (e) {
  console.error("FAIL:", e.message);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
