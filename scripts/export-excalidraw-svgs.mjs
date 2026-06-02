// Export .excalidraw JSON files to .svg via Puppeteer + @excalidraw/utils
// loaded from a CDN inside the page. Pure SVG, no React renderer required.
//
// Usage:
//   node scripts/export-excalidraw-svgs.mjs --src <dir> --dest <dir>

import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

const { src, dest } = parseArgs(process.argv);
if (!src || !dest) {
  console.error("Usage: --src <dir> --dest <dir>");
  process.exit(2);
}

const srcAbs = path.resolve(src);
const destAbs = path.resolve(dest);
await fs.mkdir(destAbs, { recursive: true });

const entries = (await fs.readdir(srcAbs)).filter((f) => f.endsWith(".excalidraw"));
if (entries.length === 0) {
  console.error(`No .excalidraw files found in ${srcAbs}`);
  process.exit(2);
}

console.log(`Found ${entries.length} excalidraw files`);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();

// Minimal HTML page that loads @excalidraw/utils from unpkg.
// utils exposes exportToSvg as a global on window.ExcalidrawUtils (UMD).
const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>excalidraw export</title></head>
<body>
<script src="https://unpkg.com/@excalidraw/utils@0.1.2/dist/excalidraw-utils.min.js"></script>
<script>
  window.__ready = typeof ExcalidrawUtils !== "undefined" && typeof ExcalidrawUtils.exportToSvg === "function";
</script>
</body></html>`;

await page.setContent(html, { waitUntil: "networkidle0" });

const ready = await page.evaluate(() => window.__ready === true);
if (!ready) {
  // Dump what's actually on window for diagnostics
  const keys = await page.evaluate(() =>
    Object.keys(window).filter((k) => /excalidraw/i.test(k))
  );
  console.error("ExcalidrawUtils.exportToSvg not available. Excalidraw-like globals:", keys);
  await browser.close();
  process.exit(1);
}

for (const entry of entries) {
  const inPath = path.join(srcAbs, entry);
  const raw = await fs.readFile(inPath, "utf8");
  const json = JSON.parse(raw);
  const elements = json.elements ?? [];
  const appState = { ...(json.appState ?? {}), exportBackground: true, exportWithDarkMode: false };
  const files = json.files ?? {};

  const svg = await page.evaluate(
    async ({ elements, appState, files }) => {
      const svgEl = await window.ExcalidrawUtils.exportToSvg({
        elements,
        appState,
        files,
        exportPadding: 16,
      });
      return svgEl.outerHTML;
    },
    { elements, appState, files }
  );

  const outName = entry.replace(/\.excalidraw$/, ".svg");
  const outPath = path.join(destAbs, outName);
  await fs.writeFile(outPath, svg, "utf8");
  const size = (await fs.stat(outPath)).size;
  console.log(`  wrote ${outName} (${size} bytes)`);
}

await browser.close();
console.log("done.");
