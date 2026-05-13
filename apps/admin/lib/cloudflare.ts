/**
 * cloudflare.ts — Cloudflare Pages REST API + wrangler deploy helper.
 *
 * NOTE on deploy strategy: The Cloudflare Pages REST API for direct upload
 * is multi-step (manifest → JWT → batch upload). For the spine, we shell out
 * to `npx wrangler pages deploy` instead — it's available on Thomas's laptop
 * (wrangler login done), picks up env vars, and produces a parseable URL.
 * Post-spine (when this runs on a server without npx/wrangler on PATH), swap
 * deployToPages() to use the REST direct-upload API.
 *
 * Rate limit: Cloudflare Pages allows ~3 project-creates/min (spec §11.4).
 * We enforce a 25-second gap between consecutive createPagesProject calls via
 * a module-level timestamp + async wait.
 */

import { execSync } from "node:child_process";
import { logger } from "./logger.js";

// ── Env accessors (lazy — checked at call time, not import time) ───────────────

function getCfToken(): string {
  const v = process.env.CLOUDFLARE_API_TOKEN;
  if (!v) throw new Error("CLOUDFLARE_API_TOKEN is not set");
  return v;
}

function getCfAccountId(): string {
  const v = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!v) throw new Error("CLOUDFLARE_ACCOUNT_ID is not set");
  return v;
}

// Keep module-level references for convenience — may be undefined at import time
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

// ── Constants ──────────────────────────────────────────────────────────────────

const CREATE_THROTTLE_MS = 25_000; // 25 s between consecutive project creates

// ── Module-level throttle state ────────────────────────────────────────────────

let _lastCreateAt: number | null = null;

// ── Internal helpers ───────────────────────────────────────────────────────────

export function cloudflareBaseUrl(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
}

function cfHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${getCfToken()}`,
    "Content-Type": "application/json",
  };
}

async function throttleCreate(): Promise<void> {
  if (_lastCreateAt === null) return;
  const elapsed = Date.now() - _lastCreateAt;
  if (elapsed < CREATE_THROTTLE_MS) {
    const waitMs = CREATE_THROTTLE_MS - elapsed;
    logger.info(`[cloudflare] throttling createPagesProject — waiting ${waitMs}ms`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Check if a Cloudflare Pages project exists for the given slug.
 */
export async function getPagesProject(
  slug: string,
): Promise<{ exists: boolean; url?: string }> {
  const url = `${cloudflareBaseUrl(getCfAccountId())}/pages/projects/${slug}`;
  const res = await fetch(url, { headers: cfHeaders() });

  if (res.ok) {
    const data = (await res.json()) as { result?: { subdomain?: string } };
    const subdomain = data.result?.subdomain ?? slug;
    return { exists: true, url: `https://${subdomain}.pages.dev` };
  }

  if (res.status === 404) {
    return { exists: false };
  }

  const text = await res.text();
  throw new Error(`[cloudflare] getPagesProject failed (${res.status}): ${text}`);
}

/**
 * Create a Cloudflare Pages project for the given slug.
 * No-op if the project already exists (409 → silently reuse).
 * Respects 25s throttle between consecutive calls.
 */
export async function createPagesProject(slug: string): Promise<void> {
  await throttleCreate();

  const url = `${cloudflareBaseUrl(getCfAccountId())}/pages/projects`;
  const body = JSON.stringify({ name: slug, production_branch: "main" });

  logger.info(`[cloudflare] creating Pages project: ${slug}`);
  const res = await fetch(url, { method: "POST", headers: cfHeaders(), body });
  _lastCreateAt = Date.now();

  if (res.ok) {
    logger.info(`[cloudflare] project created: ${slug}`);
    return;
  }

  const data = (await res.json()) as { errors?: { message?: string }[] };
  const errMsg = data.errors?.[0]?.message ?? "unknown";

  // 409 = already exists → fine, reuse
  if (res.status === 409 || errMsg.toLowerCase().includes("already exists")) {
    logger.info(`[cloudflare] project already exists (409), reusing: ${slug}`);
    return;
  }

  throw new Error(`[cloudflare] createPagesProject failed (${res.status}): ${errMsg}`);
}

/**
 * Deploy a built dist/ directory to Cloudflare Pages via wrangler subprocess.
 *
 * Returns:
 *   - canonicalUrl: https://<slug>.pages.dev   (stable production URL)
 *   - deploymentUrl: https://<8hex>.<slug>.pages.dev  (deployment-specific)
 *
 * Wrangler prints the deployment URL to stdout; we parse it from that output.
 * If we can't parse it, we fall back to constructing the canonical URL.
 */
export async function deployToPages(
  slug: string,
  distPath: string,
): Promise<{ deploymentUrl: string; canonicalUrl: string }> {
  logger.info(`[cloudflare] deploying ${slug} from ${distPath}`);

  const cmd = `npx wrangler pages deploy "${distPath}" --project-name=${slug} --branch=main --commit-dirty=true`;

  let stdout: string;
  try {
    const result = execSync(cmd, {
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: getCfToken(),
        CLOUDFLARE_ACCOUNT_ID: getCfAccountId(),
      },
      encoding: "utf8",
      // wrangler can be slow on first deploy; allow 5 min
      timeout: 5 * 60 * 1000,
      // Capture stderr merged so we don't miss URL lines
      stdio: ["pipe", "pipe", "pipe"],
    });
    stdout = result;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    const detail = execErr.stderr ?? execErr.stdout ?? execErr.message ?? String(err);
    throw new Error(`[cloudflare] wrangler deploy failed: ${detail}`);
  }

  logger.info(`[cloudflare] wrangler output: ${stdout.slice(0, 500)}`);

  // Wrangler prints something like:
  //   ✨ Deployment complete! Take a peek over at https://abc12345.slug.pages.dev
  // or:
  //   Success! URL: https://abc12345.slug.pages.dev
  const deploymentMatch = stdout.match(/https:\/\/([a-f0-9]+)\.[^.]+\.pages\.dev/i);
  const canonicalUrl = `https://${slug}.pages.dev`;
  const deploymentUrl = deploymentMatch ? deploymentMatch[0] : canonicalUrl;

  logger.info(`[cloudflare] deployed`, { canonicalUrl, deploymentUrl });
  return { canonicalUrl, deploymentUrl };
}

/**
 * Delete a Cloudflare Pages project.
 * Used by Task 4.10 (teardown cron). No-op if project doesn't exist (404).
 */
export async function deletePagesProject(slug: string): Promise<void> {
  const url = `${cloudflareBaseUrl(getCfAccountId())}/pages/projects/${slug}`;
  const res = await fetch(url, { method: "DELETE", headers: cfHeaders() });

  if (res.ok || res.status === 404) {
    logger.info(`[cloudflare] project deleted (or not found): ${slug}`);
    return;
  }

  const text = await res.text();
  throw new Error(`[cloudflare] deletePagesProject failed (${res.status}): ${text}`);
}
