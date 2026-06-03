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
- After any DNS change, per-device browser/OS caches hold the old IP for a while — the dev URL can look "unreachable" on one device while server-side is healthy. Verify server health via the `…hosted.app` URL + `/_health.json`; fix the client with a DNS flush (`chrome://net-internals/#dns`) / browser restart / airplane-mode toggle.

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
