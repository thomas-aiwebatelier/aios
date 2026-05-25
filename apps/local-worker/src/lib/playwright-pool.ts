/**
 * playwright-pool.ts — shared Playwright Chromium browser singleton (Task 3.2).
 *
 * Ported verbatim from apps/admin/lib/playwright-pool.ts for the local-worker
 * research port. Only the logger import path changed (`./logger.js` →
 * `../logger.js`) to match local-worker's layout (logger lives at src/logger.ts,
 * lib files live at src/lib/).
 *
 * Research crawls 10-30 pages per lead — re-launching the browser per page is
 * wasteful. One singleton browser handles all 4 sub-steps of the research
 * pipeline for the lifetime of a single job.
 *
 * Usage:
 *   const browser = await getBrowser();
 *   // use browser.newContext() / browser.newPage() as normal
 *   // call closeBrowserPool() in the worker's finally block
 */

import { chromium, type Browser } from "playwright";
import { logger } from "../logger.js";

let _browser: Browser | null = null;

/**
 * Returns the shared Chromium browser instance, launching it on first call.
 * Subsequent calls return the same instance without re-launching.
 */
export async function getBrowser(): Promise<Browser> {
  if (!_browser) {
    logger.debug("[playwright-pool] launching chromium");
    _browser = await chromium.launch({ headless: true });
    logger.debug("[playwright-pool] chromium launched");
  }
  return _browser;
}

/**
 * Closes the browser and nulls the singleton.
 * Call from the worker's finally block after each job completes.
 */
export async function closeBrowserPool(): Promise<void> {
  if (_browser) {
    logger.debug("[playwright-pool] closing chromium");
    try {
      await _browser.close();
    } catch (err) {
      logger.warn("[playwright-pool] error closing browser", { error: String(err) });
    } finally {
      _browser = null;
    }
  }
}
