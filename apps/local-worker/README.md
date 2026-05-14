# local-worker

Local Windows daemon for the AI Web Atelier pipeline. Runs the **generation**
and **deploy** workers on Thomas's machine so the `claude` CLI (Max-plan auth
at `%USERPROFILE%\.claude\`) and `wrangler` can be invoked as subprocesses
without paying per-token in Cloud Run.

The rest of the workers (discovery, research, outreach, reply-poll) now run as
HTTP-driven endpoints on Firebase App Hosting; both halves share the same
Supabase Postgres `pipeline_jobs` queue and reconcile via
`worker_heartbeats.last_seen_at`.

## Prerequisites

- **Node 22+** (matches the rest of the workspace)
- **pnpm 9**
- **`claude` CLI** — installed and authenticated against Thomas's Max plan.
  Test with `claude --version`. The tokens live at `%USERPROFILE%\.claude\`,
  which is why the scheduled task runs as the user, not as `SYSTEM`.
- **`wrangler` CLI** — `npm install -g wrangler` then `wrangler login` once.
  Test with `wrangler --version`. Used by the deploy worker.
- **`pwsh` (PowerShell 7+)** — the Task Scheduler XML invokes `pwsh.exe`.
  Install via `winget install Microsoft.PowerShell` if missing.
- **`.env`** populated at the repo root. The daemon walks up from
  `apps/local-worker/src/index.ts` until it finds `pnpm-workspace.yaml`.

## Required env vars

Read from the repo-root `.env` (resolved on boot — log line `env_loaded`):

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase pooler URL (transaction mode, port 6543). Used for all runtime queries. |
| `DIRECT_URL` | Supabase direct URL (port 5432). Only used by `pnpm --filter @atelier/db migrate` for DDL. |
| `CLOUDFLARE_API_TOKEN` | Pages REST + wrangler. |
| `CLOUDFLARE_ACCOUNT_ID` | Pages REST. |
| `PSI_API_KEY` | PageSpeed Insights scoring after deploy (failure non-fatal). |
| `GENERATED_SITES_DIR` | _Optional._ Absolute path for generated Astro projects. Defaults to `<repo-root>/generated-sites/`. |
| `POLL_INTERVAL_MS` | _Optional._ Defaults to `5000`. |
| `WORKER_NAME` | _Optional._ Defaults to `local-worker`. PRIMARY KEY in `worker_heartbeats` — change if running multiple daemons. |
| `LOG_LEVEL` | _Optional._ `debug` \| `info` \| `warn` \| `error`. Default `info`. |

## Run manually

```powershell
pnpm install
pnpm --filter local-worker start    # production-mode (tsx src/index.ts)
pnpm --filter local-worker dev      # watch-mode (auto-restart on source change)
```

Expected boot log (one JSON line per event on stdout):

```
{"ts":"...","level":"info","event":"env_loaded","data":{"path":"...\\.env"}}
{"ts":"...","level":"info","event":"boot","data":{"worker":"local-worker","node":"v22.x","platform":"win32",...}}
{"ts":"...","level":"info","event":"db_connected"}
{"ts":"...","level":"info","event":"heartbeat_started","data":{"worker":"local-worker"}}
{"ts":"...","level":"info","event":"poll_loop_started","data":{"steps":["generate","deploy"],"intervalMs":5000}}
{"ts":"...","level":"debug","event":"poll_idle","data":{"steps":["generate","deploy"]}}
```

Ctrl-C (or any of SIGINT/SIGTERM/SIGHUP) triggers graceful drain: in-flight
job finishes, heartbeat ticker stops, final heartbeat written, DB pool closes.

## Install as a Windows scheduled task

Auto-starts at logon and 60s after boot; restarts on failure every 5 minutes
(999 retries); runs on battery; runs as the interactive user (critical for
the claude CLI's `%USERPROFILE%\.claude\` tokens).

```powershell
# Install
schtasks /create /xml apps\local-worker\windows-task.xml /tn "AI Web Atelier Local Worker"

# Start immediately (skip waiting for next logon)
schtasks /run /tn "AI Web Atelier Local Worker"

# View status + last result
schtasks /query /tn "AI Web Atelier Local Worker" /v /fo LIST

# Stop a running instance (does NOT remove the task)
schtasks /end /tn "AI Web Atelier Local Worker"

# Uninstall completely
schtasks /delete /tn "AI Web Atelier Local Worker" /f
```

To see live logs, run the task interactively from a PowerShell window with
`pnpm --filter local-worker start` instead of relying on Task Scheduler — the
daemon writes JSON lines to stdout, which the scheduler captures into the
task history but doesn't surface conveniently.

## Directory layout

```
apps/local-worker/
├── package.json
├── tsconfig.json
├── README.md
├── windows-task.xml          # schtasks /create /xml ...
├── src/
│   ├── index.ts              # entrypoint: dotenv, signal handlers, boots loops
│   ├── poll-loop.ts          # 5s claim → process loop for {generate, deploy}
│   ├── generation.ts         # ported from apps/admin/workers/generation.ts
│   ├── deploy.ts             # ported from apps/admin/workers/deployer.ts
│   ├── heartbeat.ts          # 30s worker_heartbeats upsert
│   ├── logger.ts             # newline-delimited JSON logger (stdout)
│   └── lib/
│       ├── db.ts             # getProdDb singleton
│       ├── queue.ts          # claimNext/enqueue/heartbeat/completeJob/failJob
│       ├── claude-code.ts    # claude CLI subprocess
│       ├── cloudflare.ts     # Pages REST + wrangler subprocess
│       ├── psi.ts            # PageSpeed Insights v5 API
│       └── generated-sites-fs.ts  # project-dir lifecycle
├── test/                     # vitest unit + integration tests
└── data/                     # gitignored — generated Astro projects live here
```

## Tests

```powershell
pnpm --filter local-worker test
```

Unit tests cover the logger, heartbeat upsert, and poll-loop dispatch. The
integration test boots the poll-loop against a pglite test DB with a mocked
`child_process.spawn` for claude + wrangler, inserts a fake generation job,
and confirms the job completes end-to-end.

## Notes

- We poll instead of `LISTEN/NOTIFY` to keep the dep surface tiny and so the
  same code path works against pglite in tests.
- The 5-second poll interval is a deliberate trade-off: fast enough that the
  end-to-end pipeline latency stays under 30s of overhead per stage; slow
  enough to be invisible on Supabase's free tier.
- Generation can take 10–30 minutes per lead. The 30s heartbeat (both the
  worker-level `worker_heartbeats` row and the per-job `last_heartbeat_at`)
  is what keeps the reconciler from marking those rows as stuck.
