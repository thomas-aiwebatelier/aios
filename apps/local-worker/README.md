# local-worker

Local Windows daemon for the AI Web Atelier pipeline. Runs the **generation**
and **deploy** workers on Thomas's machine so the `claude` CLI (Max plan auth)
and `wrangler` can be invoked as subprocesses without per-token billing in
Cloud Run.

The rest of the workers (discovery, research, outreach, reply-poll) now run as
HTTP-driven endpoints on Cloud Run; both halves share the same Supabase
Postgres `pipeline_jobs` queue.

## Requirements

- Node 22+ (matches the rest of the workspace)
- pnpm 9
- `claude` CLI installed and authenticated against Thomas's Max plan
  (`%USERPROFILE%\.claude\` must contain valid tokens).
- `wrangler` on PATH: `npm install -g wrangler` and `wrangler login` once.
- `.env` populated at the repo root (the daemon walks up from `apps/local-worker/`
  to find it).

## Run (dev)

```powershell
pnpm install
pnpm --filter local-worker dev
```

Expected boot log:

```
{"ts":"...","level":"info","event":"boot","data":{"node":"vXX","hostname":"..."}}
{"ts":"...","level":"info","event":"env_loaded","data":{"path":"...\\.env"}}
{"ts":"...","level":"info","event":"db_connected"}
{"ts":"...","level":"info","event":"heartbeat","data":{"worker":"local-worker"}}
{"ts":"...","level":"info","event":"poll_idle","data":{"steps":["generate","deploy"]}}
```

Ctrl-C triggers a graceful drain: the in-flight job finishes, then the DB pool
closes.

## Env vars (read from repo-root `.env`)

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase pooler URL (transaction mode, port 6543). |
| `DIRECT_URL` | Optional, only used for DDL. |
| `CLOUDFLARE_API_TOKEN` | Pages REST + wrangler. |
| `CLOUDFLARE_ACCOUNT_ID` | Pages REST. |
| `PSI_API_KEY` | PageSpeed Insights scoring after deploy. |
| `GENERATED_SITES_DIR` | Optional. Defaults to `apps/local-worker/data/generated-sites/`. |
| `POLL_INTERVAL_MS` | Optional. Defaults to `5000`. |
| `WORKER_NAME` | Optional. Defaults to `local-worker@<hostname>`. |
| `LOG_LEVEL` | Optional. `debug` \| `info` \| `warn` \| `error`. Default `info`. |

## Install as a Windows scheduled task (auto-start)

Import the included Task Scheduler XML:

```powershell
schtasks /create /xml apps\local-worker\windows-task.xml /tn "AI Web Atelier Local Worker"
```

Start immediately (skip waiting for the next logon):

```powershell
schtasks /run /tn "AI Web Atelier Local Worker"
```

Uninstall:

```powershell
schtasks /delete /tn "AI Web Atelier Local Worker" /f
```

The task is configured to run **as user Thomas (not SYSTEM)** — this is
critical, because the `claude` CLI looks up its Max-plan tokens in
`%USERPROFILE%\.claude\` which only exists in the user's profile. It also
restarts on failure (5 min interval, 999 retries) and is allowed to run on
battery so the laptop doesn't pause it.

## Directory layout

```
apps/local-worker/
├── package.json
├── tsconfig.json
├── README.md
├── windows-task.xml          # `schtasks /create /xml ...`
├── src/
│   ├── index.ts              # entrypoint: dotenv, signal handlers, boots loops
│   ├── poll-loop.ts          # 5s claim → process loop for {generate, deploy}
│   ├── generation.ts         # ported from apps/admin/workers/generation.ts
│   ├── deploy.ts             # ported from apps/admin/workers/deployer.ts
│   ├── heartbeat.ts          # 30s worker_heartbeats upsert
│   └── logger.ts             # structured JSON logger (stdout)
├── test/                     # vitest
└── data/                     # gitignored — generated Astro projects live here
```

## Notes

- We poll instead of `LISTEN/NOTIFY` to keep the daemon's dependency surface
  tiny and so the same code path works when the dev DB is pglite.
- The 5-second interval is a deliberate trade-off: faster than 25s of unused
  capacity per job, slow enough to be invisible on Supabase's free tier.
