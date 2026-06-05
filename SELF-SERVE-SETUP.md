# Self-serve platform — local setup & validation

Everything needed to run + validate the Build / Market / Operate self-serve loop locally.
DB migrations `0007/0008/0009` are **already applied**. Project ref: `owooqqxnuluddvizkrzt`.

---

## A. Supabase dashboard (do these in order)

1. **Apply RLS + auth trigger** — SQL Editor → New query → paste the full contents of
   `packages/db/sql/rls-and-auth.sql` → **Run**. (Enables row-level security, the
   on-signup `profiles` trigger, and `is_admin()`.)

2. **Email auth for frictionless testing** — Authentication → Providers → **Email**:
   toggle **"Confirm email" OFF** (so signups log in immediately). You can re-enable later.

3. **Redirect URLs** — Authentication → URL Configuration → add `http://localhost:3000/**`
   if not present. (Site URL `http://localhost:3000` is fine for local.)

4. **Create your admin user** — Authentication → Users → **Add user** →
   `thomas@aiwebatelier.com` + a password (auto-confirmed).

5. **Grant admin role** — SQL Editor → run (works whether or not the trigger already made the row):
   ```sql
   insert into public.profiles (id, email, role)
   select id, email, 'admin' from auth.users where email = 'thomas@aiwebatelier.com'
   on conflict (id) do update set role = 'admin';
   ```

**Get your keys** for step B: Project Settings → API → copy **Project URL**, **anon public**, **service_role**.

---

## B. Env files (local)

> The web apps read their **own app-dir** `.env.local` (not the repo-root `.env`). The worker reads the repo-root `.env` (already has `DATABASE_URL`).

**`apps/agency-site/.env.local`** (create it):
```
NEXT_PUBLIC_SUPABASE_URL=https://owooqqxnuluddvizkrzt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

**`apps/admin/.env.local`** (the admin app now uses Supabase Auth — add these; keep its existing `DATABASE_URL`):
```
NEXT_PUBLIC_SUPABASE_URL=https://owooqqxnuluddvizkrzt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

Repo-root `.env`: nothing to add — the worker uses the existing `DATABASE_URL` and your Claude CLI.

---

## C. CLI auth (on the machine running the worker)

- **Claude** — already authenticated (other jobs use it). Sanity: `claude --version`.
- **Higgsfield** — `higgsfield auth login`. Sanity: `higgsfield account`.

(No API keys locally — both run on your subscriptions.)

---

## D. Run (separate terminals)

```
pnpm --filter agency-site dev      # customer site → http://localhost:3000
pnpm --filter local-worker start   # worker (boot log should show the claude path)
pnpm --filter admin dev            # admin (optional; uses :3001 if 3000 is taken)
```

---

## E. Validate — checklist

**Market (brand kit + ad):**
1. http://localhost:3000/diensten/market → enter `https://kidsnovel.com` → submit.
2. Sign up (email + password) → lands on `/app/market`.
3. Click **Maak mijn merkkit** → worker log shows `brandkit_scrape_start` → `brandkit_ready`.
4. Open **/app/brand** → 3 markdown files render; edit one → **Opslaan** → persists.
5. On /app/market → "Nieuwe advertentie" → describe a campaign → **Genereer**.
6. Worker log `creative_start` → `creative_ready`; refresh /app/market → ad card with image + copy.

**Build (site request):**
7. /diensten/build → enter a URL → **Bouw mijn site** → worker runs `[research]` → lead `awaiting_approval`.
8. /app/build shows "geanalyseerd … ik zet de bouw in gang."
9. Admin → **Approval Queue** (or **Build** tab) → approve → worker generates + deploys to **Cloudflare** → /app/build shows the live URL.

**Operate (intake):**
10. /diensten/operate → URL → /app/operate → fill the questionnaire → **Verstuur intake** → status `submitted`.

**Admin:**
11. http://localhost:3001/login → log in as the admin user → **Build / Market / Operate** tabs show the data.

**RLS sanity:**
12. Sign up a *second* user → they must NOT see the first user's brand/kit/ads.

---

## F. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| 500 `SUPABASE… not set` | Missing var in the right `.env.local` (web apps read app-dir, not repo-root). |
| Can't log in / redirect loop | "Confirm email" still on (confirm via link) or wrong anon key. |
| Admin login works but no access | `profiles.role` not `admin` — re-run the upsert in A.5. |
| Worker job stuck `queued` | Worker not running, or `claude`/`higgsfield` not authed — check boot log + `higgsfield account`. |
| brand-kit `failed` | Site unreachable or Claude/Higgsfield auth — see worker `…_failed` log line. |
| Ad image missing | Higgsfield CLI not authed / model rejected `--aspect_ratio` — check `higgsfield_stderr` in the log. |
