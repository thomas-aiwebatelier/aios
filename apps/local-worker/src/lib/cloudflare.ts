/**
 * cloudflare.ts — Cloudflare Pages REST + wrangler deploy.
 *
 * Ported from apps/admin/lib/cloudflare.ts. Local-worker uses `npx wrangler
 * pages deploy` because the operator's machine has wrangler globally
 * installed (`npm i -g wrangler` + `wrangler login`). When this code ran
 * inside the cloud admin, the strategy needed swapping to direct-upload
 * REST — moot now that deploys run on the laptop.
 *
 * Rate limit: Cloudflare allows ~3 project-creates/min. Enforce a 25s gap
 * between consecutive createPagesProject calls via a module-level
 * timestamp + async wait.
 */

import { execSync } from "node:child_process";
import { logger } from "../logger.js";

// ── Env accessors (lazy) ───────────────────────────────────────────────────────

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

// ── Constants ──────────────────────────────────────────────────────────────────

const CREATE_THROTTLE_MS = 25_000;

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
    logger.info("cloudflare_throttle", { waitMs });
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

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

export async function createPagesProject(slug: string): Promise<void> {
  await throttleCreate();

  const url = `${cloudflareBaseUrl(getCfAccountId())}/pages/projects`;
  const body = JSON.stringify({ name: slug, production_branch: "main" });

  logger.info("cloudflare_create_project", { slug });
  const res = await fetch(url, { method: "POST", headers: cfHeaders(), body });
  _lastCreateAt = Date.now();

  if (res.ok) {
    logger.info("cloudflare_project_created", { slug });
    return;
  }

  const data = (await res.json()) as { errors?: { message?: string }[] };
  const errMsg = data.errors?.[0]?.message ?? "unknown";

  if (res.status === 409 || errMsg.toLowerCase().includes("already exists")) {
    logger.info("cloudflare_project_reused", { slug });
    return;
  }

  throw new Error(
    `[cloudflare] createPagesProject failed (${res.status}): ${errMsg}`,
  );
}

/**
 * Deploy a built dist/ directory to Cloudflare Pages via wrangler subprocess.
 *
 * Returns:
 *   canonicalUrl  — https://<slug>.pages.dev   (stable production URL)
 *   deploymentUrl — https://<8hex>.<slug>.pages.dev  (per-deploy hash)
 *
 * Wrangler must be on PATH (`npm i -g wrangler` + `wrangler login`).
 */
export async function deployToPages(
  slug: string,
  distPath: string,
): Promise<{ deploymentUrl: string; canonicalUrl: string }> {
  logger.info("cloudflare_deploy_start", { slug, distPath });

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
      timeout: 5 * 60 * 1000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    stdout = result;
  } catch (err: unknown) {
    const execErr = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const detail =
      execErr.stderr ?? execErr.stdout ?? execErr.message ?? String(err);
    throw new Error(`[cloudflare] wrangler deploy failed: ${detail}`);
  }

  logger.info("cloudflare_wrangler_output", {
    preview: stdout.slice(0, 500),
  });

  // Wrangler prints something like:
  //   ✨ Deployment complete! Take a peek over at https://abc12345.slug.pages.dev
  const deploymentMatch = stdout.match(
    /https:\/\/([a-f0-9]+)\.[^.]+\.pages\.dev/i,
  );
  const canonicalUrl = `https://${slug}.pages.dev`;
  const deploymentUrl = deploymentMatch ? deploymentMatch[0] : canonicalUrl;

  logger.info("cloudflare_deployed", { canonicalUrl, deploymentUrl });
  return { canonicalUrl, deploymentUrl };
}

export async function deletePagesProject(slug: string): Promise<void> {
  const url = `${cloudflareBaseUrl(getCfAccountId())}/pages/projects/${slug}`;
  const res = await fetch(url, { method: "DELETE", headers: cfHeaders() });

  if (res.ok || res.status === 404) {
    logger.info("cloudflare_project_deleted", { slug });
    return;
  }

  const text = await res.text();
  throw new Error(
    `[cloudflare] deletePagesProject failed (${res.status}): ${text}`,
  );
}
