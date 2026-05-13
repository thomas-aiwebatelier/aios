/**
 * staleness.ts — scores how outdated a website looks using Playwright
 * screenshots + claude vision (Task 3.1).
 *
 * Export: scoreStaleness(url) → { score, screenshotPath, reason }
 */

import { createHash } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { logger } from "./logger.js";
import { runClaudeCode } from "./claude-code.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Screenshots stored under repo-root/data/staleness/
const SCREENSHOT_DIR = path.resolve(__dirname, "../../../data/staleness");

function ensureDir() {
  if (!existsSync(SCREENSHOT_DIR)) {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

export interface StalenessResult {
  score: number | null;
  screenshotPath: string | null;
  reason: string;
}

export async function scoreStaleness(url: string): Promise<StalenessResult> {
  ensureDir();

  const urlHash = createHash("sha256").update(url).digest("hex").slice(0, 12);
  const desktopPath = path.join(SCREENSHOT_DIR, `${urlHash}-desktop.png`);
  const mobilePath = path.join(SCREENSHOT_DIR, `${urlHash}-mobile.png`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    // ── Desktop screenshot ────────────────────────────────────────────────────
    const desktopCtx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopCtx.newPage();

    try {
      await desktopPage.goto(url, { timeout: 15_000, waitUntil: "domcontentloaded" });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      logger.warn("[staleness] navigation failed (desktop)", { url, reason });
      return { score: null, screenshotPath: null, reason };
    }

    await desktopPage.screenshot({ path: desktopPath, fullPage: false });
    await desktopCtx.close();

    // ── Mobile screenshot ─────────────────────────────────────────────────────
    const mobileCtx = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const mobilePage = await mobileCtx.newPage();

    try {
      await mobilePage.goto(url, { timeout: 15_000, waitUntil: "domcontentloaded" });
    } catch (err) {
      // Non-fatal: mobile may fail even if desktop worked
      logger.warn("[staleness] navigation failed (mobile)", { url, error: String(err) });
    }

    try {
      await mobilePage.screenshot({ path: mobilePath, fullPage: false });
    } catch {
      // Ignore mobile screenshot failure
    }
    await mobileCtx.close();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error("[staleness] playwright error", { url, reason });
    return { score: null, screenshotPath: null, reason };
  } finally {
    if (browser) await browser.close();
  }

  // ── Claude vision scoring ─────────────────────────────────────────────────
  // Pass screenshot file paths as Markdown image references — Claude Code's
  // vision feature reads local file:// URIs embedded in the prompt.
  const desktopUri = `file:///${desktopPath.replace(/\\/g, "/")}`;
  const mobileUri = `file:///${mobilePath.replace(/\\/g, "/")}`;

  const prompt =
    `You're scoring how outdated a website looks, 0–100, where ` +
    `100 = needs urgent redesign (Flash-era, broken mobile, no responsive design, ` +
    `image-heavy slow-load, generic templates from 2012) and ` +
    `0 = modern and professional.\n\n` +
    `Desktop screenshot:\n![desktop](${desktopUri})\n\n` +
    `Mobile screenshot:\n![mobile](${mobileUri})\n\n` +
    `Respond with a JSON object and NOTHING ELSE:\n` +
    `{ "score": <number 0-100>, "reason": "<one sentence>" }`;

  try {
    const raw = await runClaudeCode(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      logger.warn("[staleness] claude returned no JSON", { raw: raw.slice(0, 200) });
      return { score: null, screenshotPath: desktopPath, reason: "claude parse failed" };
    }
    const parsed = JSON.parse(match[0]) as { score?: number; reason?: string };
    const score = typeof parsed.score === "number"
      ? Math.min(100, Math.max(0, parsed.score))
      : null;
    const reason = typeof parsed.reason === "string" ? parsed.reason : "unknown";
    return { score, screenshotPath: desktopPath, reason };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "claude parse failed";
    logger.warn("[staleness] claude error", { url, reason });
    return { score: null, screenshotPath: desktopPath, reason };
  }
}
