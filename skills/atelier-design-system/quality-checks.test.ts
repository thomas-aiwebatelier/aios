/**
 * quality-checks.test.ts — Tests for the pre-deploy quality gate (Phase 0 A5)
 *
 * NOTE: skipLighthouse: true is used in all tests — Lighthouse takes 30+ seconds
 * per run and is hard to test reliably in CI. Lighthouse integration must be
 * validated manually. See report for details.
 *
 * Both fixture sites must be pre-built (astro build run) before these tests.
 * The beforeAll hook builds them.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { runQualityChecks } from "./quality-checks.js";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const goodSite = join(__dirname, "fixtures", "good-site");
const missingAltSite = join(__dirname, "fixtures", "missing-alt-site");

beforeAll(() => {
  // Build both fixture sites. They ship with node_modules already installed
  // (pnpm install --ignore-workspace was run during A5 setup).
  // If node_modules is absent, install first.
  for (const site of [goodSite, missingAltSite]) {
    const binPath = join(site, "node_modules", ".bin", "astro");
    const binExists =
      process.platform === "win32"
        ? (() => {
            try {
              execSync(`if exist "${binPath}.cmd" echo yes`, { shell: "cmd.exe", encoding: "utf8" });
              return true;
            } catch {
              return false;
            }
          })()
        : (() => {
            try {
              execSync(`test -f "${binPath}"`, { encoding: "utf8" });
              return true;
            } catch {
              return false;
            }
          })();

    if (!binExists) {
      console.log(`[beforeAll] Installing deps in ${site}…`);
      execSync("pnpm install --ignore-workspace", {
        cwd: site,
        stdio: "inherit",
        timeout: 180_000,
      });
    }

    console.log(`[beforeAll] Building ${site}…`);
    execSync(
      process.platform === "win32"
        ? `"${join(site, "node_modules", ".bin", "astro.cmd")}" build`
        : `"${join(site, "node_modules", ".bin", "astro")}" build`,
      {
        cwd: site,
        stdio: "inherit",
        timeout: 120_000,
        env: { ...process.env, NODE_ENV: "production" },
      }
    );
  }
}, 300_000);

describe("runQualityChecks", () => {
  it("passes a good site", async () => {
    const r = await runQualityChecks(goodSite, { skipLighthouse: true });

    // Log details for debugging if needed
    if (!r.ok) {
      console.error("Unexpected failures:", r.failures);
      console.error("Details:", JSON.stringify(r.details, null, 2));
    }

    expect(r.ok).toBe(true);
    expect(r.failures).toEqual([]);

    // Verify details shape
    expect(r.details.altText.missing).toBe(0);
    expect(r.details.links.missingHref).toBe(0);
    expect(r.details.links.missingAccName).toBe(0);
    expect(r.details.robotsMeta.hasNoindex).toBe(true);
    expect(r.details.robotsMeta.expected).toBe(true);
    expect(r.details.breakpoints).toHaveLength(5);
    expect(r.details.breakpoints.every((b) => b.ok)).toBe(true);
  }, 120_000);

  it("rejects site missing alt text", async () => {
    const r = await runQualityChecks(missingAltSite, { skipLighthouse: true });

    expect(r.ok).toBe(false);
    expect(r.failures.some((f) => f.toLowerCase().includes("alt"))).toBe(true);

    // Details: at least 1 image missing alt
    expect(r.details.altText.missing).toBeGreaterThan(0);
    // But other checks should still pass
    expect(r.details.robotsMeta.hasNoindex).toBe(true);
  }, 120_000);
});
