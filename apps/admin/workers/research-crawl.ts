/**
 * research-crawl.ts — Task 3.4: Site inventory crawl.
 *
 * Crawls up to 30 pages of the lead's website. For each page:
 *   - Takes a desktop screenshot (1280×800)
 *   - Parses structure with Claude (verbatim body copy preserved)
 *   - Downloads all image bytes to data/assets/<leadId>/scraped/
 *
 * Persists a site_inventories row.
 *
 * Called by research.ts orchestrator.
 *
 * Note: image byte download is mandatory per spec §7 ("URL-only references
 * are forbidden — source sites disappear, optimization needs the bytes").
 */

import path from "node:path";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { siteInventories } from "@atelier/db";
import type { Db, InventoryPage, InventoryAsset } from "@atelier/db";
import { getBrowser } from "../lib/playwright-pool.js";
import {
  discoverPages,
  crawlPage,
  ensureAssetDir,
  urlToSlug,
  extractImageUrls,
} from "../lib/site-crawler.js";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

const MAX_PAGES = 30;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const CRAWL_WALL_LIMIT_MS = 15 * 60 * 1000; // 15 min

// ── Image byte download ────────────────────────────────────────────────────────

async function downloadImage(
  src: string,
  scraperDir: string,
): Promise<{ localPath: string; downloadedBytes: number } | null> {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;

    const contentLength = parseInt(res.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_IMAGE_BYTES) {
      logger.debug("[research-crawl] skipping oversized image", { src, bytes: contentLength });
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;

    const ext = src.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "bin";
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext) ? ext : "bin";
    const hash = createHash("sha256").update(src).digest("hex").slice(0, 16);
    const filename = `${hash}.${safeExt}`;
    const localAbsPath = path.join(scraperDir, filename);

    writeFileSync(localAbsPath, buf);
    return {
      localPath: path.relative(REPO_ROOT, localAbsPath).replace(/\\/g, "/"),
      downloadedBytes: buf.byteLength,
    };
  } catch (err) {
    logger.debug("[research-crawl] image download failed", { src, error: String(err) });
    return null;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function crawlSite(
  db: Db,
  leadId: string,
  websiteUrl: string | null,
  heartbeatFn?: () => void,
): Promise<{ pageCount: number } | null> {
  if (!websiteUrl) {
    logger.info("[research-crawl] no website — skipping site inventory", { leadId });
    return null;
  }

  logger.info("[research-crawl] starting", { leadId, websiteUrl });

  const screenshotDir = ensureAssetDir(leadId, "screenshots");
  const scraperDir = ensureAssetDir(leadId, "scraped");

  const browser = await getBrowser();
  const startMs = Date.now();

  // ── Discover pages ─────────────────────────────────────────────────────────
  let pageUrls: string[];
  try {
    pageUrls = await discoverPages(browser, websiteUrl, MAX_PAGES);
  } catch (err) {
    logger.warn("[research-crawl] page discovery failed", { error: String(err) });
    pageUrls = [websiteUrl];
  }

  logger.info("[research-crawl] pages to crawl", { leadId, count: pageUrls.length });

  // ── Crawl each page ────────────────────────────────────────────────────────
  const structuredPages: InventoryPage[] = [];
  const allImageRefs: Array<{ src: string; alt: string; type: "img" | "background" }> = [];

  // Heartbeat every 30s during crawl
  let lastHeartbeat = Date.now();

  for (const pageUrl of pageUrls) {
    // Wall-clock guard
    if (Date.now() - startMs > CRAWL_WALL_LIMIT_MS) {
      logger.warn("[research-crawl] wall-clock limit reached — finalizing", {
        leadId,
        pagesCollected: structuredPages.length,
      });
      break;
    }

    // Heartbeat
    if (heartbeatFn && Date.now() - lastHeartbeat > 30_000) {
      try { heartbeatFn(); } catch { /* ignore heartbeat errors */ }
      lastHeartbeat = Date.now();
    }

    try {
      const slug = urlToSlug(pageUrl);
      const structured = await crawlPage(browser, pageUrl, screenshotDir, slug);
      if (!structured) continue;

      // Convert to InventoryPage shape
      const inventoryPage: InventoryPage = {
        url: structured.url,
        title: structured.title,
        metaDescription: structured.meta_description,
        sections: structured.sections?.map((s) => `${s.heading}\n${s.body}`),
        images: structured.images?.map((i) => i.src),
        ctas: structured.ctas?.map((c) => c.text),
        forms: structured.forms?.map((f) => f.intent),
        language: structured.language,
      };
      structuredPages.push(inventoryPage);

      // Collect image refs from claude response
      if (structured.images) {
        for (const img of structured.images) {
          if (img.src) allImageRefs.push({ src: img.src, alt: img.alt, type: "img" });
        }
      }
    } catch (err) {
      logger.warn("[research-crawl] page failed — skipping", { pageUrl, error: String(err) });
    }
  }

  // ── Download image bytes ────────────────────────────────────────────────────
  const assets: InventoryAsset[] = [];
  const seenUrls = new Set<string>();

  for (const ref of allImageRefs) {
    if (seenUrls.has(ref.src)) continue;
    seenUrls.add(ref.src);

    // Skip data URLs and SVGs
    if (ref.src.startsWith("data:") || ref.src.toLowerCase().endsWith(".svg")) {
      assets.push({ originalUrl: ref.src, type: ref.type, alt: ref.alt });
      continue;
    }

    // Heartbeat during image download
    if (heartbeatFn && Date.now() - lastHeartbeat > 30_000) {
      try { heartbeatFn(); } catch { /* ignore */ }
      lastHeartbeat = Date.now();
    }

    const downloaded = await downloadImage(ref.src, scraperDir);
    assets.push({
      originalUrl: ref.src,
      type: ref.type,
      alt: ref.alt,
      localPath: downloaded?.localPath,
      downloadedBytes: downloaded?.downloadedBytes,
    });
  }

  // ── Persist site_inventories row ───────────────────────────────────────────
  await db.insert(siteInventories)
    .values({
      id: nanoid(),
      leadId,
      crawledAt: new Date(),
      pages: structuredPages,
      assets,
    });

  logger.info("[research-crawl] done", {
    leadId,
    pageCount: structuredPages.length,
    assetCount: assets.length,
    elapsedMs: Date.now() - startMs,
  });

  return { pageCount: structuredPages.length };
}
