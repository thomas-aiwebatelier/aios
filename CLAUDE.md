# AI Web Atelier — live code repo

Production code (Next.js apps, Firebase App Hosting, CRM). Planning/brand live in the separate `aiwebatelier-spec` repo.

## Deploy & email governance (ENFORCED — do not bypass)

These are enforced by a PreToolUse hook (`.claude/hooks/guard-deploy-email.mjs`, wired in `.claude/settings.json`). Hooks run **even under bypass-permissions**, so they hold regardless of permission mode.

1. **Dev by default.** Development work targets the **`develop`** branch → `agency-site-dev` → `dev.aiwebatelier.com`. Nothing goes to prod automatically.
2. **Prod merges are admin-only (confirmed in the GitHub UI).** `main` → `agency-site-prod` → `aiwebatelier.com`. The AI **may open a merge request** to prod (push a branch + `gh pr create`, with your per-push OK) but must **not complete the merge**: `gh pr merge`, direct push to `main`, releases, and prod Firebase deploys/rollouts stay **BLOCKED**. The admin presses merge in the GitHub UI.
3. **Every GitHub push needs explicit approval** — even `develop`. The agent must stop and get a per-push OK (hook returns `ask`).
4. **The AI never sends email.** Outreach/transactional email flows are **admin-only**: an admin configures and triggers them manually. Email-send commands (sendmail, SMTP, SendGrid/Mailgun/Postmark/Resend/SES, `send-email` scripts, cold-email blasts, etc.) are **BLOCKED**.

To review or disable these: run `/hooks`. To make them truly un-disableable org-wide, move them to managed settings (admin/MDM).

## Branch → environment
| Branch | Backend | URL | Promotion |
|---|---|---|---|
| `develop` | agency-site-dev | dev.aiwebatelier.com | push (with your OK) |
| `main` | agency-site-prod | aiwebatelier.com | **manual, admin-only** |

## Architecture & domains
- Project `aiwebatelier-spine`. The public site is `apps/agency-site/` (Next.js 15 App Router, React 19, **no Tailwind / no framer-motion** — plain React + CSS + CSS Modules). `middleware.ts` noindexes every non-prod host.
- DNS for `aiwebatelier.com` is on **Cloudflare**.
- **Dev:** `dev.aiwebatelier.com` = **DNS-only (grey-cloud) A `35.219.200.110`** → Firebase App Hosting backend `agency-site-dev` (`europe-west4`). Firebase issues the TLS cert (Google Trust Services) via the `_acme-challenge…` CNAME. **Do not proxy `dev` through Cloudflare** (orange cloud breaks the cert → `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`).
- **Prod:** `aiwebatelier.com` is **still a Cloudflare Pages** custom domain (CNAME → `aiwebatelier-prod.pages.dev`), not yet on Firebase. `www` → Namecheap parking page (returns 525). Both still to migrate.
- Cutover steps: `aiwebatelier-spec/docs/runbooks/firebase-custom-domain-cutover.md`.
- **Recurring "dev unreachable" / `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` is almost always client-side, not the server.** It means that device cached the *old Cloudflare-proxied IP* (Cloudflare no longer serves `dev`, so its TLS handshake fails). Incognito does NOT clear OS/router/Chrome host caches.
  - First confirm the server is fine (it usually is): public DNS should be A `35.219.200.110` (no AAAA, no CNAME) on `1.1.1.1`/`8.8.8.8`/`9.9.9.9`, and a TLS probe to `dev` should return a valid TLSv1.3 cert (Google Trust Services). Also check the raw `…hosted.app` URL + `/_health.json`.
  - Diagnose the device: `nslookup dev.aiwebatelier.com` — a Cloudflare IP (`104.x`/`172.67.x`/`188.114.x`) instead of `35.219.200.110` = stale local cache.
  - Fix on that device: OS DNS flush (`ipconfig /flushdns`) · Chrome `chrome://net-internals/#dns` Clear host cache + `#sockets` flush + full Chrome restart · turn off Chrome **Secure DNS** (`chrome://settings/security`) · or test on a phone hotspot. Caches expire on their own within ~24–48h.

## Self-serve platform — Build · Market · Operate (branch `feat/ai-marketing`)

A self-serve layer on top of the existing admin/lead-gen pipeline. Three products, each reachable as a public landing page (`/diensten/{build,market,operate}`, signup-first) **and** the admin path. Full plan: `aiwebatelier-spec/docs/design/self-serve-platform-plan.md` + `ai-marketing-prd.md`. Local run/validation: **`SELF-SERVE-SETUP.md`** (repo root).
**Status:** built + validated locally; **not pushed** (~10 commits on `feat/ai-marketing`). Migrations `0007–0009` + RLS **applied to the shared Supabase DB**.

- **Monorepo (pnpm):** `apps/agency-site` (public + `/app` portal), `apps/admin` (operator dashboard), `apps/local-worker` (Windows daemon polling `pipeline_jobs`), `packages/{db,auth,shared}`.
- **Unified auth = Supabase Auth** for everyone. `packages/auth` (`@atelier/auth`): browser/server/service Supabase clients + `requireUser`/`requireAdmin`/`getRole`. Role lives in `profiles.role` (`customer`|`admin`). agency-site `/app/*` is gated + branded (PortalNav: Build/Market/Operate tabs; Market sub-tabs: Dashboard/Creative/Brand assets/Publish/Monitor). **admin migrated off next-auth** → Supabase Auth + admin role (`apps/admin/lib/auth.ts` `auth()` returns admin-or-null).
- **Data model (`packages/db/src/schema.ts`):** self-serve tables `brands` (`owner_user_id` = auth uid, **text**; optional `lead_id` link to coexist with cold-outreach `leads`), `brand_kit_files`, `brand_kit_assets`, `profiles`, `operate_projects`, `ad_assets`; plus `pipeline_jobs.brand_id`. **RLS** in `packages/db/sql/rls-and-auth.sql` (idempotent; on-signup trigger creates `profiles`). ⚠️ `auth.users.id` is `uuid` but our id columns are `text` → policies compare `auth.uid()::text`; **no FK to auth.users**.
- **Worker steps** (registered in `apps/local-worker/src/index.ts`): `brand-kit` (Playwright render + node-vibrant palette + DOM fonts/social + LLM tone/products → `renderBrandKit` from `@atelier/db` → `brand_kit_files`); `creative` (LLM ad copy + **Higgsfield CLI** image → `ad_assets`). Build self-serve creates a `lead` (+ `existing_website_url`, `industry_key=professional-services`) and enqueues `research` — reusing the existing `research→generation→deploy` pipeline; **admin approves** before generate/deploy (sites still go to **Cloudflare**).
- **LLM/media auth:** **local = `claude` CLI** (Max-plan, no key) via `lib/llm.ts`; **prod = OpenRouter** (`OPENROUTER_API_KEY` + `OPENROUTER_MODEL`). **Higgsfield = `@higgsfield/cli`** (`higgsfield auth login`); prod auths the CLI/HTTP in the container. Worker writes user-owned rows via the **service-role** client (shared `pipeline_jobs`/`leads` never exposed to the user role).
- **Env (local):** web apps read their **own app-dir `.env.local`** (NOT repo-root): `apps/agency-site/.env.local` = `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`; `apps/admin/.env.local` = the two `NEXT_PUBLIC_*`. The worker reads repo-root `.env` (`DATABASE_URL`). apphosting.yaml secrets for prod: `supabase-anon-key`, `supabase-service-role-key`.
- **Gotchas (cost real time):**
  - **Migrations apply via the POOLER** (`DATABASE_URL`, `aws-0-…pooler.supabase.com:6543`), **not `DIRECT_URL`** — the direct `db.<ref>.supabase.co` host is unresolvable here (IPv6/Windows). `pnpm --filter @atelier/db migrate` needs the env exported (it doesn't load `.env`).
  - **`page.evaluate` must contain NO named inner functions** — esbuild (tsx) injects `__name`, which is undefined in the browser → `ReferenceError: __name is not defined`.
  - Both Next apps build workspace deps first (`scripts/build-workspace-deps.mjs` builds `@atelier/auth`, db, shared).
- **Pending:** containerize the worker for an always-on Cloud Run deploy (Playwright image + OpenRouter/Higgsfield auth); Market **publish/monitor** (v2/v3 — client-connected Meta/Google).

## Offer & site copy (current — locked)
- **€499** eenmalig voor de bouw (op maat, geen sjabloon). One iteration round after the first review.
- **Online in 5 werkdagen — 5 stappen, elke dag één stap.**
- Onderhoud/hosting: **€9,99/maand of €99/jaar** (optioneel). First year all-in = €499 + €99 = **€598**; or €499 and host it yourself.
- Customer owns the full code; cancellable monthly.
- **No meeting/booking/Calendly** — stay AI-driven; focus on "ask for a site" / AI-generate-website. Primary CTA: **"Vraag je site aan"**.
- Copy is **Dutch (nl-BE)**, informal **je/jij**, first person **ik** (one-person studio), per `aiwebatelier-spec/brand/PERSONALITY.md`. If a page reads English, it's the browser's Google Translate, not the source.

## Design (Studio Human)
- Active direction: **Studio Human** — sage/cream/terracotta, Bricolage Grotesque + Hanken Grotesk. Source of truth: `aiwebatelier-spec/brand/design-system/`.
- Header: animated logo **video** (`/video_logo.mp4`) in the nav; mobile (<640px) shows the logo mark only.
- Home order: Hero (single-column) → ServicesOrbital (`#diensten`) → WhatWeDo → Process (5 steps) → Pricing → About → Testimonials (`#getuigenissen`, placeholder) → Contact → Footer.
