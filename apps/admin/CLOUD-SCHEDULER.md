# Cloud Scheduler setup — worker endpoints

This document covers provisioning Cloud Scheduler jobs that drive the four
HTTP worker endpoints under `/api/workers/*`. It's the cloud-side half of
Migration Plan B (the local-worker half — generation + deploy — runs on the
operator's machine via `apps/local-worker`).

## Required environment variable

The admin app rejects worker requests that don't carry
`Authorization: Bearer ${WORKER_AUTH_SECRET}`. Generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

or:

```bash
openssl rand -hex 32
```

Set it in two places:

1. **`apps/admin/.env`** (local dev) and the App Hosting secret store
   (production) — see `DEPLOY.md` for the `firebase apphosting:secrets:set`
   command. The admin Cloud Run revision must have `WORKER_AUTH_SECRET`
   exported at runtime.
2. **Cloud Scheduler job headers** (see `--headers` below). The Bearer
   token in the scheduler's HTTP target is what the admin endpoint checks.

If the values diverge, every scheduler invocation returns `401`.

## Jobs to create

All commands target the `aiwebatelier-spine` project, `europe-west1`
region, and `Europe/Brussels` timezone. The admin host is assumed to be
`https://admin.aiwebatelier.com` — substitute the live App Hosting URL
if your deploy uses the Firebase-generated subdomain.

### Important: schedule cadence

Cloud Scheduler's minimum interval is **1 minute**. The original plan
imagined sub-minute (30s) polls; we accept the 1-minute floor because:

- Each handler claims at most one job per invocation, but the queue is
  drained quickly because every endpoint that triggers a new job
  (e.g. `/api/leads` POST → `enqueue('research')`) does so as part of
  the user-initiated request — the scheduler is the safety net, not the
  primary trigger.
- If you genuinely need sub-minute reaction time, switch to Cloud Tasks
  (which has no schedule floor) and have the API routes enqueue tasks
  directly. That's a future-iteration upgrade.

### 1. discovery — every 1 minute

```powershell
gcloud scheduler jobs create http worker-discovery `
  --location=europe-west1 `
  --schedule="* * * * *" `
  --time-zone="Europe/Brussels" `
  --uri="https://admin.aiwebatelier.com/api/workers/discovery" `
  --http-method=POST `
  --headers="Authorization=Bearer ${env:WORKER_AUTH_SECRET},Content-Type=application/json" `
  --message-body='{}' `
  --attempt-deadline=300s `
  --project=aiwebatelier-spine
```

### 2. research — every 1 minute

```powershell
gcloud scheduler jobs create http worker-research `
  --location=europe-west1 `
  --schedule="* * * * *" `
  --time-zone="Europe/Brussels" `
  --uri="https://admin.aiwebatelier.com/api/workers/research" `
  --http-method=POST `
  --headers="Authorization=Bearer ${env:WORKER_AUTH_SECRET},Content-Type=application/json" `
  --message-body='{}' `
  --attempt-deadline=300s `
  --project=aiwebatelier-spine
```

### 3. outreach — every 1 minute

```powershell
gcloud scheduler jobs create http worker-outreach `
  --location=europe-west1 `
  --schedule="* * * * *" `
  --time-zone="Europe/Brussels" `
  --uri="https://admin.aiwebatelier.com/api/workers/outreach" `
  --http-method=POST `
  --headers="Authorization=Bearer ${env:WORKER_AUTH_SECRET},Content-Type=application/json" `
  --message-body='{}' `
  --attempt-deadline=300s `
  --project=aiwebatelier-spine
```

### 4. reply-poll — every 5 minutes

Reply detection is a 30-day scan over `outreach_messages` per tick; running
it every minute would waste Gmail API quota. Five minutes is the sweet
spot between operator perception (we see replies in the inbox within a
few minutes) and cost.

```powershell
gcloud scheduler jobs create http worker-reply-poll `
  --location=europe-west1 `
  --schedule="*/5 * * * *" `
  --time-zone="Europe/Brussels" `
  --uri="https://admin.aiwebatelier.com/api/workers/reply-poll" `
  --http-method=POST `
  --headers="Authorization=Bearer ${env:WORKER_AUTH_SECRET},Content-Type=application/json" `
  --message-body='{}' `
  --attempt-deadline=300s `
  --project=aiwebatelier-spine
```

## Cost

Cloud Scheduler free tier: **3 jobs/month free**. We have 4 jobs, so
expect roughly **€0.10/month** on top of the rest of the Cloud Run /
Cloud SQL bill.

Per-job pricing reference (April 2026): \$0.10 / job / month after the
first 3 jobs.

## Updating a job

`gcloud scheduler jobs update http <name> --schedule="..."` only changes
the schedule; replace the whole job to swap auth or URI:

```powershell
gcloud scheduler jobs delete worker-discovery --location=europe-west1 --project=aiwebatelier-spine
# then recreate with the new command above
```

## Verification

After provisioning, run each job once manually and inspect the Cloud
Logging entries — every successful invocation emits a `worker_run`
structured log line with `claimed`, `jobId`, `durationMs`. A `claimed:0`
response is the empty-queue case (HTTP 204) and is the expected steady
state when there is no work.

```powershell
gcloud scheduler jobs run worker-discovery --location=europe-west1 --project=aiwebatelier-spine
gcloud logging read 'jsonPayload.event="worker_run"' --limit=5 --project=aiwebatelier-spine
```

## Rotating WORKER_AUTH_SECRET

1. Generate a new secret.
2. Update the App Hosting secret (`firebase apphosting:secrets:set WORKER_AUTH_SECRET`).
3. Wait for the new admin revision to roll out (App Hosting rollouts are
   blue/green — both old and new revisions accept the same secret until
   the old one drains).
4. Delete and recreate each of the four scheduler jobs with the new
   Bearer header.

Done in this order, there is no auth window where calls fail.
