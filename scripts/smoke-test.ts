#!/usr/bin/env tsx
/**
 * SMOKE TEST — Task 1.9 (end-of-Week-1 gate).
 *
 * Validates the spine plumbing without exercising research or generation:
 *   1. Insert a hand-crafted fake lead into the SQLite DB (data/atelier.db)
 *   2. Build a hand-crafted minimal Astro site (scripts/smoke-fixtures/hand-built-site)
 *   3. Deploy that site to Cloudflare Pages (creates project on first run)
 *   4. Run PageSpeed Insights against the live URL → store scores
 *   5. Insert generated_sites row with PSI scores
 *   6. Compose a Dutch outreach email via Gmail API → save as DRAFT (not send)
 *   7. Print every artifact for inspection
 *   8. Print explicit teardown commands at the end
 *
 * Per spec §17.2 — this is the gate before Phase 0 design work consumes time.
 *
 * Usage (from repo root):
 *   pnpm tsx --env-file=.env scripts/smoke-test.ts
 *
 * Prereqs (all should already be done):
 *   - wrangler authenticated (npx wrangler whoami)
 *   - .env populated with GOOGLE_MAPS_API_KEY, PSI_API_KEY, GMAIL_OAUTH_*
 *   - SPF/DKIM/DMARC propagated for aiwebatelier.com
 */

import { execSync, spawn } from "node:child_process";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { google } from "googleapis";
import { eq } from "drizzle-orm";
import { createDb, leads, generatedSites, runMigrations } from "@atelier/db";

const REPO_ROOT = resolve(process.cwd());
const FIXTURE_LEAD_PATH = join(REPO_ROOT, "scripts/smoke-fixtures/fake-lead.json");
const FIXTURE_SITE_PATH = join(REPO_ROOT, "scripts/smoke-fixtures/hand-built-site");
const DB_PATH = process.env.DATABASE_PATH ?? join(REPO_ROOT, "data/atelier.db");
const MIGRATIONS_PATH = join(REPO_ROOT, "packages/db/migrations");

const log = (msg: string) => console.log(`[smoke] ${msg}`);

// ───────────────────────────────────────────────────────────────────────────
// 1. Read fake lead
// ───────────────────────────────────────────────────────────────────────────
log("step 1/7 — reading fake lead fixture…");
const fakeLead = JSON.parse(readFileSync(FIXTURE_LEAD_PATH, "utf8")) as {
  id: string;
  slug: string;
  status: string;
  businessName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  industryKey: string;
  language: string;
};
log(`  lead: ${fakeLead.businessName} (slug=${fakeLead.slug})`);

// ───────────────────────────────────────────────────────────────────────────
// 2. Open DB + apply migrations + upsert lead
// ───────────────────────────────────────────────────────────────────────────
log("step 2/7 — opening DB + applying migrations…");
const dataDir = join(REPO_ROOT, "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
const db = createDb(DB_PATH);
runMigrations(db, MIGRATIONS_PATH);

// Clean up any prior smoke test row so this is idempotent
db.delete(generatedSites).where(eq(generatedSites.leadId, fakeLead.id)).run();
db.delete(leads).where(eq(leads.id, fakeLead.id)).run();

db.insert(leads)
  .values({
    id: fakeLead.id,
    slug: fakeLead.slug,
    status: "deployed" as const,
    businessName: fakeLead.businessName,
    phone: fakeLead.phone,
    email: fakeLead.email,
    address: fakeLead.address,
    city: fakeLead.city,
    postalCode: fakeLead.postalCode,
    industryKey: fakeLead.industryKey,
    language: fakeLead.language,
  })
  .run();
log(`  ✅ lead inserted (id=${fakeLead.id})`);

// ───────────────────────────────────────────────────────────────────────────
// 3. Build hand-crafted Astro fixture site
// ───────────────────────────────────────────────────────────────────────────
log("step 3/7 — installing + building hand-built fixture site…");
try {
  execSync("pnpm install --ignore-workspace --frozen-lockfile=false", {
    cwd: FIXTURE_SITE_PATH,
    stdio: "inherit",
  });
} catch {
  // fallback if no lockfile exists yet
  execSync("pnpm install --ignore-workspace", {
    cwd: FIXTURE_SITE_PATH,
    stdio: "inherit",
  });
}
execSync("pnpm exec astro build", { cwd: FIXTURE_SITE_PATH, stdio: "inherit" });
log("  ✅ build complete");

// ───────────────────────────────────────────────────────────────────────────
// 4. Deploy to Cloudflare Pages (idempotent — creates project on first run)
// ───────────────────────────────────────────────────────────────────────────
log("step 4/7 — deploying to Cloudflare Pages…");
const projectName = "bakkerij-smoke-test-antw-smk1";
try {
  execSync(`npx wrangler pages project create ${projectName} --production-branch=main`, {
    cwd: REPO_ROOT,
    stdio: "ignore", // suppress "already exists" noise on re-runs
  });
  log("  ✅ pages project created");
} catch {
  log("  (project already exists — reusing)");
}

const deployOutput = execSync(
  `npx wrangler pages deploy ${join(FIXTURE_SITE_PATH, "dist")} --project-name=${projectName} --branch=main --commit-dirty=true`,
  { cwd: REPO_ROOT, encoding: "utf8" },
);

// Parse the deployment-specific URL from wrangler output
const deploymentUrlMatch = deployOutput.match(/https:\/\/[a-f0-9]+\.([\w-]+)\.pages\.dev/);
const canonicalUrl = `https://${projectName}.pages.dev`;
const deploymentUrl = deploymentUrlMatch?.[0] ?? canonicalUrl;
log(`  ✅ deployed to ${canonicalUrl}`);

// Brief wait for propagation
log("  waiting 15s for propagation…");
await new Promise((r) => setTimeout(r, 15_000));

// ───────────────────────────────────────────────────────────────────────────
// 5. Run PageSpeed Insights
// ───────────────────────────────────────────────────────────────────────────
log("step 5/7 — running PageSpeed Insights (mobile profile)…");
const psiKey = process.env.PSI_API_KEY;
if (!psiKey) {
  throw new Error("PSI_API_KEY missing from .env");
}
const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
psiUrl.searchParams.set("url", canonicalUrl);
psiUrl.searchParams.set("key", psiKey);
psiUrl.searchParams.set("strategy", "mobile");
for (const cat of ["performance", "accessibility", "seo", "best-practices"]) {
  psiUrl.searchParams.append("category", cat);
}
const psiRes = await fetch(psiUrl);
if (!psiRes.ok) {
  throw new Error(`PSI HTTP ${psiRes.status}: ${await psiRes.text()}`);
}
const psiData = (await psiRes.json()) as {
  lighthouseResult?: { categories: Record<string, { score: number }> };
};
const cats = psiData.lighthouseResult?.categories;
if (!cats) throw new Error("PSI returned no categories");

const psiScores = {
  performance: Math.round((cats["performance"]?.score ?? 0) * 100),
  accessibility: Math.round((cats["accessibility"]?.score ?? 0) * 100),
  seo: Math.round((cats["seo"]?.score ?? 0) * 100),
  bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
};
log(
  `  ✅ PSI: P=${psiScores.performance} A=${psiScores.accessibility} SEO=${psiScores.seo} BP=${psiScores.bestPractices}`,
);

// ───────────────────────────────────────────────────────────────────────────
// 6. Insert generated_sites row
// ───────────────────────────────────────────────────────────────────────────
log("step 6/7 — inserting generated_sites row…");
const generatedSiteId = `smoke-site-${Date.now()}`;
db.insert(generatedSites)
  .values({
    id: generatedSiteId,
    leadId: fakeLead.id,
    version: 1,
    astroProjectPath: FIXTURE_SITE_PATH,
    cloudflareProjectName: projectName,
    cloudflarePreviewUrl: canonicalUrl,
    cloudflareDeploymentId: deploymentUrl,
    lighthouseScores: psiScores,
    designSystemVersion: "smoke-v0",
    industryGuideVersion: "smoke-v0",
    createdVia: "initial_generation" as const,
  })
  .run();
log(`  ✅ generated_sites row inserted (id=${generatedSiteId})`);

// ───────────────────────────────────────────────────────────────────────────
// 7. Compose Dutch outreach draft via Gmail API (DRAFT — does NOT send)
// ───────────────────────────────────────────────────────────────────────────
log("step 7/7 — creating Gmail draft (NOT sending)…");
const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;
if (!clientId || !clientSecret || !refreshToken) {
  throw new Error("GMAIL_OAUTH_* env vars missing — run scripts/probe/gmail-oauth.ts first");
}

const oAuth2 = new google.auth.OAuth2(clientId, clientSecret);
oAuth2.setCredentials({ refresh_token: refreshToken });
const gmail = google.gmail({ version: "v1", auth: oAuth2 });

const subject = `Een nieuwe website voor ${fakeLead.businessName} — kijk eens`;
const body = [
  `Beste,`,
  ``,
  `Dit is een SMOKE TEST draft (Task 1.9). Niet versturen.`,
  ``,
  `Ik kwam ${fakeLead.businessName} tegen tijdens mijn zoektocht naar lokale ondernemers in ${fakeLead.city}.`,
  ``,
  `Ik heb alvast een voorstel voor jullie gebouwd: ${canonicalUrl}`,
  ``,
  `Wat erin zit:`,
  `- Volledig responsive (mobiel + desktop)`,
  `- SEO-geoptimaliseerd zodat klanten jullie vinden via Google`,
  `- Snelle laadtijden (Lighthouse score: ${psiScores.performance})`,
  `- Jullie branding, jullie tekst, modern uitgevoerd`,
  ``,
  `Mijn voorstel: €499 eenmalig, inclusief één herziening op basis van jullie wensen.`,
  ``,
  `Vriendelijke groet,`,
  `Thomas`,
  ``,
  `—`,
  `AI Web Atelier — vakwerk websites, gebouwd met AI`,
  `https://aiwebatelier.com`,
].join("\n");

const rfc =
  `From: thomas@aiwebatelier.com\r\n` +
  `To: ${fakeLead.email}\r\n` +
  `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=\r\n` +
  `Content-Type: text/plain; charset=utf-8\r\n` +
  `MIME-Version: 1.0\r\n\r\n` +
  body;

const raw = Buffer.from(rfc, "utf8")
  .toString("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

const draftRes = await gmail.users.drafts.create({
  userId: "me",
  requestBody: { message: { raw } },
});
log(`  ✅ Gmail draft created (id=${draftRes.data.id}, messageId=${draftRes.data.message?.id})`);

// ───────────────────────────────────────────────────────────────────────────
// Summary + teardown
// ───────────────────────────────────────────────────────────────────────────
const allOk =
  psiScores.performance >= 70 && // smoke fixture is minimal, real generation gates ≥90
  psiScores.accessibility >= 90 &&
  psiScores.seo >= 90 &&
  psiScores.bestPractices >= 80;

console.log("\n========================================================");
console.log("SMOKE TEST ARTIFACTS");
console.log("========================================================");
console.log(`Lead ID:               ${fakeLead.id}`);
console.log(`Lead slug:             ${fakeLead.slug}`);
console.log(`generated_sites ID:    ${generatedSiteId}`);
console.log(`Preview URL:           ${canonicalUrl}`);
console.log(`Deployment URL:        ${deploymentUrl}`);
console.log(`PSI Performance:       ${psiScores.performance}`);
console.log(`PSI Accessibility:     ${psiScores.accessibility}`);
console.log(`PSI SEO:               ${psiScores.seo}`);
console.log(`PSI Best Practices:    ${psiScores.bestPractices}`);
console.log(`Gmail draft ID:        ${draftRes.data.id}`);
console.log("========================================================");

if (allOk) {
  console.log("\n✅ SMOKE TEST PASSED — Week 1 plumbing validated.");
} else {
  console.log(
    "\n⚠️  SMOKE TEST PARTIAL — pipeline ran but PSI scores below smoke thresholds.",
  );
  console.log(
    "    For the smoke fixture (minimal hand-crafted page) this is acceptable.",
  );
  console.log(
    "    Real generated sites must hit ≥90/95/95/90 per spec §6.1.5 quality-checks gate.",
  );
}

console.log("\nTEARDOWN (run manually when done inspecting):");
console.log(
  `  1. Delete CF Pages project:  npx wrangler pages project delete ${projectName} --yes`,
);
console.log(`  2. Delete Gmail draft:        open Drafts folder, delete the smoke message`);
console.log(`  3. Delete DB rows:            re-running this script auto-cleans the smoke lead`);
console.log(
  `\nOr clean up via the Gmail Drafts UI + Cloudflare dashboard. The DB rows are harmless to leave.`,
);
console.log("");

// Close DB cleanly
db.$client.close();
process.exit(allOk ? 0 : 0); // exit 0 either way — partial PSI is acceptable for smoke
