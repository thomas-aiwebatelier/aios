#!/usr/bin/env tsx
/**
 * Probe — one-time Gmail OAuth refresh-token grab + send-to-self deliverability check.
 *
 * What this does:
 *   1. Starts a tiny local HTTP server on http://localhost:8976/oauth/callback
 *      (the same port wrangler uses for its OAuth flow — a Desktop-app OAuth
 *      client can use any loopback port).
 *   2. Builds the Google OAuth URL with the 3 Gmail scopes the spec requires
 *      (send / readonly / modify) plus access_type=offline + prompt=consent to
 *      guarantee a refresh token is issued.
 *   3. Opens your default browser to that URL (or you click it manually).
 *   4. You sign in as thomas@aiwebatelier.com, click "Allow" → browser redirects
 *      back to the local callback → script captures the auth code → exchanges
 *      it for { access_token, refresh_token, ... }.
 *   5. Prints the refresh_token. You paste it into .env as
 *      GMAIL_OAUTH_REFRESH_TOKEN.
 *   6. Sends a test email FROM thomas@aiwebatelier.com TO thomas@aiwebatelier.com
 *      using the access_token, confirming the API + scopes work end-to-end.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/probe/gmail-oauth.ts
 */

import http from "node:http";
import { URL } from "node:url";
import { exec } from "node:child_process";
import { google } from "googleapis";

const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "[gmail-oauth] GMAIL_OAUTH_CLIENT_ID or GMAIL_OAUTH_CLIENT_SECRET missing from .env",
  );
  process.exit(2);
}

const PORT = 8976;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
];

const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces a refresh_token even on re-auth
  scope: SCOPES,
});

console.log("[gmail-oauth] starting local callback server on", REDIRECT_URI);
console.log("[gmail-oauth] click this URL (or it should open automatically):");
console.log("\n  " + authUrl + "\n");

// Open the browser cross-platform
const opener =
  process.platform === "win32"
    ? `start "" "${authUrl}"`
    : process.platform === "darwin"
      ? `open "${authUrl}"`
      : `xdg-open "${authUrl}"`;
exec(opener, () => {
  /* ignore errors — user can paste manually */
});

// Wait for the OAuth redirect
const code: string = await new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    if (!req.url) return;
    const u = new URL(req.url, `http://localhost:${PORT}`);
    if (u.pathname !== "/oauth/callback") {
      res.statusCode = 404;
      res.end("not found");
      return;
    }
    const c = u.searchParams.get("code");
    const error = u.searchParams.get("error");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    if (error) {
      res.statusCode = 400;
      res.end(`<h1>OAuth error</h1><p>${error}</p>`);
      server.close();
      reject(new Error(`OAuth returned error: ${error}`));
      return;
    }
    if (!c) {
      res.statusCode = 400;
      res.end("<h1>Missing code</h1>");
      server.close();
      reject(new Error("No auth code in redirect"));
      return;
    }
    res.end(
      "<h1>✅ Authorized.</h1><p>You can close this tab. Return to the terminal.</p>",
    );
    server.close();
    resolve(c);
  });
  server.listen(PORT, "localhost", () => {
    console.log("[gmail-oauth] waiting for browser redirect…");
  });
  server.on("error", reject);
});

console.log("[gmail-oauth] got auth code, exchanging for tokens…");
const { tokens } = await oAuth2Client.getToken(code);

if (!tokens.refresh_token) {
  console.error(
    "[gmail-oauth] ⚠️  No refresh_token returned. This usually means you've",
  );
  console.error(
    "             authorized this client previously. Revoke the existing grant at",
  );
  console.error("             https://myaccount.google.com/permissions and rerun.");
  process.exit(1);
}

console.log("\n=================================================================");
console.log("[gmail-oauth] ✅ refresh_token obtained.");
console.log("=================================================================");
console.log("\nPaste this into .env:\n");
console.log(`GMAIL_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
console.log("=================================================================\n");

// Send a test email to self with the access token we just got.
oAuth2Client.setCredentials(tokens);
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

const subject = "AI Web Atelier — probe send-to-self ✓";
const body = [
  "Dit is een geautomatiseerd test-bericht van de gmail-oauth probe.",
  "",
  "Als je dit ziet, betekent dit:",
  "  • De Gmail API is correct geconfigureerd",
  "  • De OAuth scopes (send/readonly/modify) zijn actief",
  "  • SPF/DKIM/DMARC zijn werkend (de mail belandt niet in spam)",
  "  • De infrastructuur voor Pipeline 6 (outreach, spec §11.6) is klaar",
  "",
  "Veilig om te verwijderen.",
  "",
  "— AI Web Atelier probe",
].join("\n");

// Build raw RFC2822 message + base64url-encode
const rfc =
  `From: thomas@aiwebatelier.com\r\n` +
  `To: thomas@aiwebatelier.com\r\n` +
  `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=\r\n` +
  `Content-Type: text/plain; charset=utf-8\r\n` +
  `MIME-Version: 1.0\r\n\r\n` +
  body;

const raw = Buffer.from(rfc, "utf8")
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

console.log("[gmail-oauth] sending test email to self…");
const sendResult = await gmail.users.messages.send({
  userId: "me",
  requestBody: { raw },
});

console.log(`[gmail-oauth] ✅ sent. Message ID: ${sendResult.data.id}`);
console.log(
  "[gmail-oauth] check your inbox at thomas@aiwebatelier.com — should arrive within seconds.",
);
console.log(
  "[gmail-oauth] If it lands in SPAM, the SPF/DKIM/DMARC propagation isn't",
);
console.log("             complete yet. Recheck via mxtoolbox after 24h.");

process.exit(0);
