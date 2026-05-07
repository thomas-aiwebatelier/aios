/**
 * quality-checks.ts — Pre-deploy quality gate (Phase 0 A5)
 *
 * Runs all quality checks against a built Astro project.
 * A site failing ANY check goes back to Claude Code for one regeneration pass.
 * Second failure → status `generation_failed`.
 *
 * Spec §6.1.5 thresholds (Lighthouse mobile):
 *   Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95, Best Practices ≥ 90
 */

import { chromium } from "playwright";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createServer } from "node:net";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface QualityCheckOptions {
  /**
   * Optional override of the SITE_STATUS env.
   * Defaults to 'preview' (noindex IS expected).
   */
  siteStatus?: "preview" | "accepted";

  /**
   * Skip Lighthouse for fast smoke runs (e.g. local dev/test).
   * Default: false.
   */
  skipLighthouse?: boolean;

  /**
   * Logger hook for streaming progress to the worker.
   * Default: noop.
   */
  onProgress?: (msg: string) => void;
}

export interface QualityCheckResult {
  ok: boolean;
  /** Human-readable failure reasons. Empty array if ok. */
  failures: string[];
  /** Per-check breakdown for the admin UI. */
  details: {
    lighthouse?: {
      performance: number;
      accessibility: number;
      seo: number;
      bestPractices: number;
    };
    breakpoints: Array<{ width: number; ok: boolean; scrollWidth: number }>;
    altText: { total: number; missing: number };
    links: { total: number; missingHref: number; missingAccName: number };
    buildWarnings: string[];
    robotsMeta: { hasNoindex: boolean; expected: boolean };
    tokenUsage: { totalCustomProps: number; undefinedCustomProps: string[] };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find a free TCP port. */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Could not get free port"));
        return;
      }
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

/** Start `astro preview` as a child process. Returns url + stop function. */
async function startPreview(
  projectPath: string,
  port: number,
  log: (msg: string) => void
): Promise<{ url: string; stop: () => void }> {
  const url = `http://localhost:${port}`;

  // Resolve the astro binary inside the project's node_modules
  const astroBin = join(projectPath, "node_modules", ".bin", "astro");

  // On Windows, .cmd files must be executed via shell: true or via cmd.exe.
  // Use shell: true universally for simplicity (works on all platforms).
  const command =
    process.platform === "win32"
      ? `"${astroBin}.cmd" preview --port ${port} --host localhost`
      : `"${astroBin}" preview --port ${port} --host localhost`;

  return new Promise((resolve, reject) => {
    const proc: ChildProcess = spawn(command, [], {
      cwd: projectPath,
      env: { ...process.env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        proc.kill();
        reject(new Error(`astro preview did not start within 30s on port ${port}`));
      }
    }, 30_000);

    const tryResolve = (data: Buffer) => {
      const text = data.toString();
      log(`[preview] ${text.trim()}`);
      // Astro preview prints the port/URL when ready
      if (!resolved && (text.includes(String(port)) || text.toLowerCase().includes("local"))) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          url,
          stop: () => {
            try {
              proc.kill("SIGTERM");
            } catch {
              // ignore
            }
          },
        });
      }
    };

    proc.stdout?.on("data", tryResolve);
    proc.stderr?.on("data", (d: Buffer) => log(`[preview:err] ${d.toString().trim()}`));

    proc.on("error", (err) => {
      clearTimeout(timeout);
      if (!resolved) reject(err);
    });

    proc.on("exit", (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`astro preview exited with code ${code} before becoming ready`));
      }
    });
  });
}

/** Run astro build and capture output for warning detection. */
function runBuild(projectPath: string): { warnings: string[] } {
  const astroBin = join(projectPath, "node_modules", ".bin", "astro");
  const binCmd = process.platform === "win32" ? `"${astroBin}.cmd"` : `"${astroBin}"`;

  let output = "";
  try {
    output = execSync(`${binCmd} build`, {
      cwd: projectPath,
      env: { ...process.env, NODE_ENV: "production" },
      encoding: "utf8",
      timeout: 120_000,
      // On Windows, execSync uses cmd.exe shell by default when shell: true
      // and can run .cmd files. With shell: false (default), .cmd works via CreateProcess.
      // execSync already handles this correctly on Windows unlike spawn.
    });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "stdout" in e) {
      output = String((e as { stdout?: string }).stdout ?? "");
    }
  }

  const warnings = output
    .split("\n")
    .filter((line) => /\[warn\]|warning:/i.test(line))
    .map((l) => l.trim())
    .filter(Boolean);

  return { warnings };
}

/** Strip CSS block comments to avoid false positives in token extraction. */
function stripCssComments(css: string): string {
  // Remove /* ... */ comments (non-greedy)
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Extract all --custom-prop DEFINITIONS from a CSS string. */
function extractTokenDefinitions(css: string): Set<string> {
  const defs = new Set<string>();
  // Strip comments first, then match "--foo-bar :" (definition pattern)
  const stripped = stripCssComments(css);
  const re = /--([\w-]+)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const name = `--${m[1]}`;
    if (!name.endsWith("-")) {
      defs.add(name);
    }
  }
  return defs;
}

/** Extract all var(--custom-prop) USAGES from a CSS string. */
function extractTokenUsages(css: string): Set<string> {
  const usages = new Set<string>();
  // Strip comments first so `/* var(--bp-*) */` doesn't produce false matches
  const stripped = stripCssComments(css);
  const re = /var\(--([\w-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stripped)) !== null) {
    const name = `--${m[1]}`;
    // Skip tokens ending with a trailing dash (malformed / comment artifacts)
    if (!name.endsWith("-")) {
      usages.add(name);
    }
  }
  return usages;
}

/** Recursively collect .css files from a directory. */
function collectCssFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectCssFiles(full));
      } else if (entry.isFile() && entry.name.endsWith(".css")) {
        results.push(full);
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return results;
}

// ---------------------------------------------------------------------------
// Lighthouse runner
// ---------------------------------------------------------------------------

async function runLighthouse(
  url: string,
  log: (msg: string) => void
): Promise<
  | { performance: number; accessibility: number; seo: number; bestPractices: number }
  | { error: string }
> {
  try {
    // Dynamic import so it doesn't break if lighthouse fails to load
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lighthouse = (await import("lighthouse")).default as any;

    // Use a remote-debugging Chromium instance
    const debuggingPort = await getFreePort();
    const browser = await chromium.launch({
      args: [`--remote-debugging-port=${debuggingPort}`],
      headless: true,
    });

    log(`[lighthouse] running against ${url}`);

    try {
      const result = await lighthouse(url, {
        port: debuggingPort,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "seo", "best-practices"],
        // Mobile profile (spec §6.1.5)
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 812,
          deviceScaleFactor: 3,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      });

      const cats = result?.lhr?.categories;
      if (!cats) {
        return { error: "Lighthouse returned no categories" };
      }

      return {
        performance: Math.round((cats["performance"]?.score ?? 0) * 100),
        accessibility: Math.round((cats["accessibility"]?.score ?? 0) * 100),
        seo: Math.round((cats["seo"]?.score ?? 0) * 100),
        bestPractices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
      };
    } finally {
      await browser.close();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Lighthouse failed: ${msg}` };
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Runs all quality checks against a built Astro project at projectPath.
 * The project must have a `dist/` directory (i.e. `astro build` already run).
 */
export async function runQualityChecks(
  projectPath: string,
  options: QualityCheckOptions = {}
): Promise<QualityCheckResult> {
  const absPath = resolve(projectPath);
  const log = options.onProgress ?? ((_msg: string) => {});
  const siteStatus = options.siteStatus ?? "preview";
  const skipLighthouse = options.skipLighthouse ?? false;

  const failures: string[] = [];
  const details: QualityCheckResult["details"] = {
    breakpoints: [],
    altText: { total: 0, missing: 0 },
    links: { total: 0, missingHref: 0, missingAccName: 0 },
    buildWarnings: [],
    robotsMeta: { hasNoindex: false, expected: siteStatus !== "accepted" },
    tokenUsage: { totalCustomProps: 0, undefinedCustomProps: [] },
  };

  // ── 1. Build + capture warnings ─────────────────────────────────────────
  log("[quality] Running astro build to capture warnings…");
  const { warnings } = runBuild(absPath);
  details.buildWarnings = warnings;
  if (warnings.length > 0) {
    failures.push(`astro build warnings: ${warnings.join("; ")}`);
  }

  // ── 2. Start preview server ──────────────────────────────────────────────
  const port = await getFreePort();
  log(`[quality] Starting astro preview on port ${port}…`);
  const { url, stop } = await startPreview(absPath, port, log);

  try {
    // ── 3. Launch browser ────────────────────────────────────────────────
    log("[quality] Launching browser…");
    const browser = await chromium.launch({ headless: true });

    try {
      // ── 4. Breakpoint reflow checks ──────────────────────────────────
      log("[quality] Checking breakpoints for horizontal scroll…");
      const breakpointWidths = [320, 375, 768, 1024, 1440];

      for (const width of breakpointWidths) {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        try {
          await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
          const scrollWidth: number = await page.evaluate(
            () => document.documentElement.scrollWidth
          );
          const ok = scrollWidth <= width + 1; // 1px slack for sub-pixel rounding
          details.breakpoints.push({ width, ok, scrollWidth });
          if (!ok) {
            failures.push(
              `horizontal scroll at ${width}px viewport (scrollWidth=${scrollWidth}px)`
            );
          }
        } finally {
          await page.close();
        }
      }

      // ── 5. HTML checks: alt text + link accessible names ─────────────
      log("[quality] Checking HTML: alt text and link accessible names…");
      const mainPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      try {
        await mainPage.goto(url, { waitUntil: "networkidle", timeout: 30_000 });

        // Alt text check
        const imgs: Array<{ src: string | null; alt: string | null }> =
          await mainPage.$$eval("img", (els) =>
            (els as HTMLImageElement[]).map((e) => ({
              src: e.getAttribute("src"),
              alt: e.getAttribute("alt"),
            }))
          );

        const missingAlt = imgs.filter((i) => i.alt === null || i.alt.trim() === "").length;
        details.altText = { total: imgs.length, missing: missingAlt };
        if (missingAlt > 0) {
          failures.push(
            `${missingAlt} image${missingAlt > 1 ? "s" : ""} without alt text (image without alt text)`
          );
        }

        // Link accessible name check
        const anchors: Array<{
          href: string | null;
          text: string;
          ariaLabel: string | null;
        }> = await mainPage.$$eval("a", (els) =>
          (els as HTMLAnchorElement[]).map((e) => ({
            href: e.getAttribute("href"),
            text: (e.textContent ?? "").trim(),
            ariaLabel: e.getAttribute("aria-label"),
          }))
        );

        const missingHref = anchors.filter((a) => !a.href || a.href.trim() === "").length;
        const missingAccName = anchors.filter(
          (a) => !a.text && !a.ariaLabel
        ).length;

        details.links = {
          total: anchors.length,
          missingHref,
          missingAccName,
        };

        if (missingHref > 0) {
          failures.push(`${missingHref} link${missingHref > 1 ? "s" : ""} missing href`);
        }
        if (missingAccName > 0) {
          failures.push(
            `${missingAccName} link${missingAccName > 1 ? "s" : ""} missing accessible name`
          );
        }

        // ── 6. Robots meta check ─────────────────────────────────────
        log("[quality] Checking robots meta tag…");
        const robotsContent = await mainPage
          .locator('meta[name="robots"]')
          .getAttribute("content")
          .catch(() => null);

        const hasNoindex = robotsContent?.includes("noindex") ?? false;
        const expectedNoindex = siteStatus !== "accepted";
        details.robotsMeta = { hasNoindex, expected: expectedNoindex };

        if (hasNoindex !== expectedNoindex) {
          if (expectedNoindex) {
            failures.push(
              'missing <meta name="robots" content="noindex,nofollow"> (required when site not accepted)'
            );
          } else {
            failures.push(
              'unexpected noindex meta tag present on accepted site'
            );
          }
        }
      } finally {
        await mainPage.close();
      }

      // ── 7. Lighthouse ────────────────────────────────────────────────
      if (!skipLighthouse) {
        log("[quality] Running Lighthouse (mobile profile)…");
        const lhResult = await runLighthouse(url, log);

        if ("error" in lhResult) {
          failures.push(`Lighthouse error: ${lhResult.error}`);
        } else {
          details.lighthouse = lhResult;
          const thresholds = {
            performance: 90,
            accessibility: 95,
            seo: 95,
            bestPractices: 90,
          };

          for (const [key, threshold] of Object.entries(thresholds) as Array<
            [keyof typeof lhResult, number]
          >) {
            if (lhResult[key] < threshold) {
              failures.push(
                `Lighthouse ${key} score ${lhResult[key]} below threshold ${threshold}`
              );
            }
          }
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    stop();
  }

  // ── 8. Token usage check (filesystem-based, no server needed) ───────────
  log("[quality] Checking CSS custom property token usage…");
  const tokenCheckResult = checkTokenUsage(absPath);
  details.tokenUsage = tokenCheckResult;
  if (tokenCheckResult.undefinedCustomProps.length > 0) {
    failures.push(
      `CSS custom properties used but not defined in tokens.css: ${tokenCheckResult.undefinedCustomProps.join(", ")}`
    );
  }

  return {
    ok: failures.length === 0,
    failures,
    details,
  };
}

// ---------------------------------------------------------------------------
// Token usage check (filesystem-based)
// ---------------------------------------------------------------------------

function checkTokenUsage(projectPath: string): {
  totalCustomProps: number;
  undefinedCustomProps: string[];
} {
  // Canonical token source: the skill's tokens.css
  // This file is expected to be in public/styles/tokens.css of the project
  // OR we load it from the skill directory (two levels up from fixtures)
  const candidatePaths = [
    join(projectPath, "public", "styles", "tokens.css"),
    join(projectPath, "src", "styles", "tokens.css"),
    // Fallback: relative to the quality-checks.ts file location (skill root)
    join(projectPath, "..", "..", "tokens.css"), // fixtures/*/  → skill root
    join(projectPath, "..", "..", "..", "tokens.css"),
  ];

  let canonicalCss = "";
  for (const p of candidatePaths) {
    try {
      canonicalCss = readFileSync(p, "utf8");
      break;
    } catch {
      // try next
    }
  }

  const canonicalDefs = extractTokenDefinitions(canonicalCss);

  // Collect all CSS in dist/
  const distDir = join(projectPath, "dist");
  const cssFiles = collectCssFiles(distDir);

  // Also check inline styles in HTML files
  const htmlFiles: string[] = [];
  const collectHtml = (dir: string) => {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) collectHtml(full);
        else if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(full);
      }
    } catch {
      // ignore
    }
  };
  collectHtml(distDir);

  const allUsages = new Set<string>();

  for (const file of [...cssFiles, ...htmlFiles]) {
    try {
      const content = readFileSync(file, "utf8");
      for (const token of extractTokenUsages(content)) {
        allUsages.add(token);
      }
    } catch {
      // ignore unreadable files
    }
  }

  // Remove tokens that are defined in the canonical set
  const undefinedCustomProps = [...allUsages].filter(
    (token) => !canonicalDefs.has(token)
  );

  return {
    totalCustomProps: allUsages.size,
    undefinedCustomProps,
  };
}
