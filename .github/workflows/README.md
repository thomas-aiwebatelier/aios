# GitHub Actions workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| [`ci.yml`](./ci.yml) | push to `main`, PRs to `main` | Fast tests (@atelier/db, @atelier/shared, admin) + admin build |
| [`ci-design-system.yml`](./ci-design-system.yml) | push / PR touching `skills/atelier-design-system/**` | Quality-checks fixture tests (boots astro preview + Playwright Chromium; ~5-7 min) |
| [`deploy-bakery-reference.yml`](./deploy-bakery-reference.yml) | push to `main` touching the bakery reference site, or manual via `workflow_dispatch` | Build + deploy bakery reference to Cloudflare Pages |

## Secrets

Set once via `gh secret set` (run from your local PowerShell):

```powershell
cd C:\Users\ThomasCortebeeck\aiwebatelier

# Cloudflare API token — create at https://dash.cloudflare.com → My Profile → API Tokens
# with scopes: Pages:Edit, Account:Read, Zone DNS:Edit (aiwebatelier.com)
gh secret set CLOUDFLARE_API_TOKEN

# Account ID — already known from `wrangler whoami` output
gh secret set CLOUDFLARE_ACCOUNT_ID --body c2a7c1f375f8848e2b4f1bcad74d4e3a
```

Verify with `gh secret list`.

## What CI does NOT do

- **Does NOT deploy the admin app**. Admin is local-first per spec §3.1, runs on `localhost:3000` only. Cloud migration is a post-spine concern (§3.4).
- **Does NOT trigger per-lead site generation**. Generation is triggered from the local admin process via the "Approve & Generate" button, not from a git push.
- **Does NOT send emails**. Cold outreach goes through the local admin's Gmail integration, not CI.

## Future workflows (not in spine)

- `deploy-agency-site.yml` — Task 4.8 will build the public `aiwebatelier.com` homepage; that workflow will deploy it to the `aiwebatelier` Cloudflare Pages project on push.
- `nightly-backup.yml` — optional cloud mirror of `data/backups/` if the local rclone setup (Task 4.10) proves unreliable.
- `release.yml` — post-spine, once the project hits a v1 tag.
