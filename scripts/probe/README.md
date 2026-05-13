# Probe scripts

One-off verification scripts for external API credentials. Run these once after Week 0 provisioning to confirm everything works end-to-end before wiring up the production workers.

## `maps.ts` — Google Maps Places API (New)

Verifies `GOOGLE_MAPS_API_KEY` works and returns results. Same query shape Pipeline 1 (Discovery, spec §11.1) uses.

```powershell
cd C:\Users\ThomasCortebeeck\aiwebatelier
pnpm tsx --env-file=.env scripts/probe/maps.ts
# or with a custom query:
pnpm tsx --env-file=.env scripts/probe/maps.ts "kapper Gent"
```

Expected: 5 results for `bakkerij Antwerpen`, each with name + address + phone + website (or "no website" — those are discovery candidates).

If you get **HTTP 403 PERMISSION_DENIED**: the API key is restricted to your IP and you're querying from a different IP, OR billing isn't linked, OR the Places API (New) isn't enabled. Check Google Cloud Console → APIs & Services → Credentials.

## `gmail-oauth.ts` — One-time refresh-token grab + send-to-self test

Run this **once** to:

1. Authorize the Gmail OAuth client for your Workspace account
2. Get a refresh token (paste into `.env` as `GMAIL_OAUTH_REFRESH_TOKEN`)
3. Send a test email from `thomas@aiwebatelier.com` to itself to verify deliverability (SPF/DKIM/DMARC working)

```powershell
cd C:\Users\ThomasCortebeeck\aiwebatelier
pnpm tsx --env-file=.env scripts/probe/gmail-oauth.ts
```

What happens:

1. A local HTTP server starts on `http://localhost:8976/oauth/callback`
2. Browser opens to the Google OAuth consent page (or click the URL printed in terminal)
3. Sign in as `thomas@aiwebatelier.com` → screen says "AI Web Atelier wants to access your Google Account" → click **Continue** (you may see a "Google hasn't verified this app" warning — click **Advanced** → **Go to AI Web Atelier (unsafe)** — this is normal for Testing-mode external apps and only applies to you since you're a test user)
4. Click **Allow** for all 3 scopes
5. Browser redirects to localhost callback → "✅ Authorized" page
6. Terminal prints the refresh token. Copy it.
7. Open `C:\Users\ThomasCortebeeck\aiwebatelier\.env` and paste:
   ```
   GMAIL_OAUTH_REFRESH_TOKEN=1//0g…
   ```
8. Check your inbox for the test email. Subject: "AI Web Atelier — probe send-to-self ✓"

If the email lands in **spam**, the SPF/DKIM/DMARC propagation isn't done yet (24-48h after the DNS records were added). Wait and retry.

If you see "No refresh_token returned": you've authorized this client before. Revoke the existing grant at <https://myaccount.google.com/permissions> → find "AI Web Atelier" → Remove access. Then rerun.

## What's NOT here

- **No automated test** — these probes are interactive (Gmail) or rate-limited (Maps). Once they pass, the real workers (`apps/admin/workers/discovery.ts` for Maps, `apps/admin/lib/gmail.ts` for outreach) take over and run unattended.
- **No PSI probe** — PageSpeed Insights is exercised by the smoke test (Task 1.9) against a real deployed Cloudflare Pages URL, not standalone.
