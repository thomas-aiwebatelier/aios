# Deploy — Firebase App Hosting (admin app → Cloud Run)

Operator guide for the first deploy of `apps/admin` to Firebase App Hosting on
GCP project `aiwebatelier-spine`. Estimated time end-to-end: **45–90 min**
including DNS propagation.

Target domain: **`admin.aiwebatelier.com`** (DNS managed on Cloudflare).

> All `gcloud` / `firebase` commands below assume PowerShell on Windows. For
> POSIX shells, replace `$env:VAR` with `$VAR` and use a here-doc instead of
> piping a string.

---

## 1. Enable required GCP APIs

```powershell
gcloud services enable `
  run.googleapis.com `
  cloudbuild.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  firebase.googleapis.com `
  firebasehosting.googleapis.com `
  --project=aiwebatelier-spine
```

---

## 2. Enable Firebase on the GCP project

```powershell
firebase projects:addfirebase aiwebatelier-spine
```

(Or via console: https://console.firebase.google.com → Add project → "Use an
existing GCP project" → `aiwebatelier-spine`.)

---

## 3. Install + log in to Firebase CLI

```powershell
npm install -g firebase-tools
firebase login
```

---

## 4. Create all secrets in Secret Manager

The build/runtime reads these by name (see `apphosting.yaml`). Substitute each
`<value>` placeholder with the actual secret content from your local `.env`.

> PowerShell pipe-to-stdin pattern: the string before `|` is the secret value.
> Quote strings containing `$`, `!`, or `&` with single quotes.

```powershell
# AUTH_SECRET — NextAuth session signing key
'<auth-secret-value>' | gcloud secrets create admin-auth-secret `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# ADMIN_PASSWORD_HASH — bcrypt hash of admin password
'<bcrypt-hash>' | gcloud secrets create admin-password-hash `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# DATABASE_URL — Supabase pooler (port 6543)
'<postgres-pooler-url>' | gcloud secrets create supabase-database-url `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# DIRECT_URL — Supabase direct connection (port 5432, used for migrations)
'<postgres-direct-url>' | gcloud secrets create supabase-direct-url `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# GOOGLE_MAPS_API_KEY
'<maps-api-key>' | gcloud secrets create google-maps-api-key `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# GMAIL_OAUTH_CLIENT_ID
'<client-id>' | gcloud secrets create gmail-oauth-client-id `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# GMAIL_OAUTH_CLIENT_SECRET
'<client-secret>' | gcloud secrets create gmail-oauth-client-secret `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# GMAIL_OAUTH_REFRESH_TOKEN
'<refresh-token>' | gcloud secrets create gmail-oauth-refresh-token `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# CLOUDFLARE_API_TOKEN
'<cf-api-token>' | gcloud secrets create cloudflare-api-token `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# PSI_API_KEY — PageSpeed Insights
'<psi-key>' | gcloud secrets create psi-api-key `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine

# WORKER_AUTH_SECRET — shared Bearer token for /api/workers/* (Plan B)
# Generate a fresh 32-byte hex secret if it does not yet exist in .env:
#   $env:WORKER_AUTH_SECRET = -join ((1..32) | % { '{0:x2}' -f (Get-Random -Max 256) })
'<worker-auth-secret>' | gcloud secrets create worker-auth-secret `
  --replication-policy=automatic --data-file=- --project=aiwebatelier-spine
```

To update an existing secret with a new version (instead of failing on
"already exists"):

```powershell
'<new-value>' | gcloud secrets versions add <secret-name> `
  --data-file=- --project=aiwebatelier-spine
```

---

## 5. Grant App Hosting backend access to secrets

App Hosting runs as a Compute Engine default service account by default:
`<project-number>-compute@developer.gserviceaccount.com`. Find your project
number with `gcloud projects describe aiwebatelier-spine --format='value(projectNumber)'`.

Grant `roles/secretmanager.secretAccessor` on each secret:

```powershell
$SA = "<project-number>-compute@developer.gserviceaccount.com"

$secrets = @(
  "admin-auth-secret",
  "admin-password-hash",
  "supabase-database-url",
  "supabase-direct-url",
  "google-maps-api-key",
  "gmail-oauth-client-id",
  "gmail-oauth-client-secret",
  "gmail-oauth-refresh-token",
  "cloudflare-api-token",
  "psi-api-key",
  "worker-auth-secret"
)

foreach ($s in $secrets) {
  gcloud secrets add-iam-policy-binding $s `
    --member="serviceAccount:$SA" `
    --role="roles/secretmanager.secretAccessor" `
    --project=aiwebatelier-spine
}
```

> If App Hosting provisions a dedicated service account (visible in Firebase
> Console → App Hosting → Settings → Service account), use that instead.

---

## 6. Create the App Hosting backend

```powershell
firebase apphosting:backends:create `
  --location=europe-west1 `
  --project=aiwebatelier-spine
```

When prompted:
- Backend ID: **`admin`** (matches `firebase.json`'s `backendId`)
- Repository: connect the GitHub repo `aiwebatelier`
- Live branch: `main`
- Root directory: `apps/admin` (matches `firebase.json`)

> `europe-west1` (Belgium) is geographically closest to the operator and to
> Supabase EU-West-1.

---

## 7. Connect GitHub (if not yet connected)

If `firebase apphosting:backends:create` did not already prompt for GitHub
connection, set it up via:
- Firebase Console → App Hosting → backend `admin` → Settings → "Connect
  GitHub repository"
- Authorize the Firebase GitHub app on the `aiwebatelier` repo
- Select `main` as the live branch

---

## 8. Initial rollout

```powershell
firebase apphosting:rollouts:create admin `
  --git-branch=main `
  --project=aiwebatelier-spine
```

Once green, Firebase prints the default `*.run.app` URL — save it for the next
step.

---

## 9. Custom domain `admin.aiwebatelier.com`

### Cloudflare DNS (zone `aiwebatelier.com`)

Add a CNAME record:

| Type  | Name    | Target                              | Proxy status     | TTL  |
| ----- | ------- | ----------------------------------- | ---------------- | ---- |
| CNAME | `admin` | `<backend-default-url>.run.app`     | **DNS only (grey cloud)** | Auto |

> **Important:** disable Cloudflare proxy (orange cloud OFF). Cloud Run
> manages TLS termination itself, and proxying through Cloudflare breaks the
> SNI handshake unless you configure Full(strict) + origin certs — out of
> scope for spine. CNAME flattening on the apex is unaffected.

### Firebase Console → custom domain

1. Firebase Console → App Hosting → backend `admin` → "Add custom domain"
2. Enter `admin.aiwebatelier.com`
3. Follow the TXT verification prompt (add the TXT record to Cloudflare DNS)
4. Wait for verification (~5 min) and SSL provisioning (~5–60 min)

---

## 10. OAuth redirect URI update

The admin app uses Gmail API with a **long-lived refresh token** (no
redirect-based OAuth flow at request time — see `apps/admin/lib/gmail.ts`).
The refresh token was issued once via OAuth Playground or similar and does
not need an updated redirect URI for the deployed admin app.

**Action required only if** you ever re-issue the refresh token through a
hosted flow — at that point, add to the Gmail OAuth client's authorized
redirect URIs:
- `https://admin.aiwebatelier.com/api/auth/callback/gmail` (or whichever path
  your re-issuance flow uses)

Currently: **no redirect URI changes needed.**

NextAuth (`/api/auth/[...nextauth]`) is credentials-only (email + password
hash), so it has no OAuth redirect URIs either.

---

## 11. Cloud Scheduler setup (Plan B dependency)

Plan B creates `/api/workers/discovery`, `/api/workers/research`,
`/api/workers/outreach`, `/api/workers/reply-poll` HTTP endpoints. Cloud
Scheduler must hit these with a Bearer header matching `WORKER_AUTH_SECRET`.

> **Cross-reference:** see `CLOUD-SCHEDULER.md` (created by Plan B) for the
> authoritative job definitions, cron expressions, and retry policies. The
> commands below are the minimum to get one job running; Plan B's doc
> supersedes this section.

Example (discovery job, hourly):

```powershell
gcloud scheduler jobs create http worker-discovery `
  --location=europe-west1 `
  --schedule="0 * * * *" `
  --uri="https://admin.aiwebatelier.com/api/workers/discovery" `
  --http-method=POST `
  --headers="Authorization=Bearer <worker-auth-secret-value>" `
  --time-zone="Europe/Brussels" `
  --project=aiwebatelier-spine
```

Repeat for `research`, `outreach`, `reply-poll` with the cadence Plan B
specifies.

---

## 12. Smoke test post-deploy

```powershell
# 1. Login page responds
curl https://admin.aiwebatelier.com/login

# 2. Manually trigger one worker (replace <secret> with WORKER_AUTH_SECRET value)
curl -X POST https://admin.aiwebatelier.com/api/workers/discovery `
  -H "Authorization: Bearer <secret>"

# 3. Browser: log in, view Dashboard, confirm queue counts render
```

If any step fails, inspect logs:

```powershell
firebase apphosting:logs:tail admin --project=aiwebatelier-spine
```

---

## 13. GitHub Actions deploy workflow (alternative to Firebase auto-deploy)

The repo ships with `.github/workflows/deploy-admin.yml` which triggers a
Firebase App Hosting rollout on every push to `main` that touches admin code,
shared packages, or deploy config. This gives you visible build logs in the
GitHub Actions UI, manual-dispatch capability, and one canonical deploy path.

**Setup (one-time):**

1. **Disable Firebase auto-deploy** so the workflow is the single trigger:
   Firebase Console → App Hosting → Backends → admin → Settings →
   "Auto-rollout on push" → toggle **OFF**

2. **Create a deploy service account:**

   ```powershell
   gcloud iam service-accounts create github-deploy `
     --display-name="GitHub Actions Deploy" `
     --project=aiwebatelier-spine
   ```

3. **Grant deploy roles:**

   ```powershell
   $sa = "github-deploy@aiwebatelier-spine.iam.gserviceaccount.com"

   gcloud projects add-iam-policy-binding aiwebatelier-spine `
     --member="serviceAccount:$sa" `
     --role="roles/firebaseapphosting.adminViewer"

   gcloud projects add-iam-policy-binding aiwebatelier-spine `
     --member="serviceAccount:$sa" `
     --role="roles/firebaseapphosting.rolloutsAdmin"

   gcloud projects add-iam-policy-binding aiwebatelier-spine `
     --member="serviceAccount:$sa" `
     --role="roles/run.viewer"
   ```

4. **Download a JSON key:**

   ```powershell
   gcloud iam service-accounts keys create github-deploy.json `
     --iam-account=$sa `
     --project=aiwebatelier-spine
   ```

   ⚠️ This file is a secret. Don't commit it.

5. **Add the key to GitHub Secrets:**

   GitHub → repo `aiwebatelier` → Settings → Secrets and variables → Actions →
   New repository secret:
   - Name: `GCP_SA_KEY`
   - Value: paste the entire contents of `github-deploy.json` (the full JSON)

   Delete `github-deploy.json` from your laptop afterwards.

6. **Test the workflow:**

   GitHub → Actions tab → "Deploy admin to Firebase App Hosting" → "Run workflow"
   → branch `main` → Run. Watch the live logs. Should finish in 3–5 min for the
   trigger; Firebase's Cloud Build itself takes another 5–10 min to build and
   deploy the new revision.

**Triggered automatically on:**
- Push to `main` touching `apps/admin/**`, `packages/db/**`, `packages/shared/**`,
  `apphosting.yaml`, `firebase.json`, `.firebaserc`, `pnpm-lock.yaml`,
  `package.json`, or the workflow file itself.
- Manual dispatch from the Actions UI.

---

## Rollback

To roll back to a previous rollout:

```powershell
firebase apphosting:rollouts:list admin --project=aiwebatelier-spine
firebase apphosting:rollouts:rollback admin <rollout-id> --project=aiwebatelier-spine
```

---

## Notes / known caveats

- **Monorepo + `rootDir`:** Firebase App Hosting reads `rootDir: apps/admin`
  in `firebase.json` and runs pnpm from the repo root, then `next build` from
  inside `apps/admin`. If the buildpack fails to detect the workspace, the
  fallback is to set the build command explicitly in the Firebase Console to
  `pnpm install && pnpm build:admin` and the start command to `pnpm start:admin`
  (root scripts added in commit 3).
- **Migrations on boot:** `apps/admin/instrumentation.ts` runs `runMigrations()`
  on every cold start. This is idempotent but adds ~500 ms to the first request
  after a deploy. If migration latency causes timeouts on cold start, move the
  migration to a Cloud Build step instead.
- **Local-worker (Plan C)** does NOT deploy to Cloud Run. It runs on the
  operator's Windows machine and pulls jobs from the cloud admin via the
  worker HTTP endpoints.
