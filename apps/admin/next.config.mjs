import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: `output: "standalone"` is INTENTIONALLY OFF for pnpm-monorepo
  // deploys. Standalone mode emits `.next/standalone/apps/admin/server.js`
  // (preserves workspace pathing), but Firebase App Hosting's buildpack looks
  // for `server.js` at the rootDir level — mismatch → "Missing script start
  // or file server.js" at Cloud Run startup. Falling back to `next start` via
  // the package.json `start` script works cleanly with workspace deps.

  // Externalize Node.js-only packages so webpack doesn't try to bundle them.
  // @atelier/* workspace packages are also kept external — they are TypeScript source
  // loaded at runtime via the tsx ESM loader (NODE_OPTIONS=--import tsx/esm).
  serverExternalPackages: [
    "postgres",
    "drizzle-orm",
    "@atelier/db",
    "@atelier/shared",
    "winston",
    "winston-daily-rotate-file",
    "node-cron",
    // Workers-only deps (research pipeline Tasks 3.2-3.5):
    "playwright",
    "playwright-core",
    "node-vibrant",
    "sharp",
    "googleapis",
    "google-auth-library",
    // Generation pipeline (Task 4.1) — quality-checks transitive deps:
    "lighthouse",
    "puppeteer-core",
    "@puppeteer/browsers",
    "proxy-agent",
    "agent-base",
  ],

  webpack: (config, { isServer }) => {
    config.resolve.alias["@"] = path.resolve(__dirname);

    // Allow webpack to resolve .js imports as .ts for workspace TypeScript packages
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
    };

    if (!isServer) {
      // On client bundle: stub out node-only packages entirely
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
        stream: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }

    // Externalize node-only packages from both client and server static analysis
    const nodeOnlyPackages = [
      /^postgres$/,
      /^@atelier\/db/,
      /^@atelier\/shared/,
      /^drizzle-orm/,
      /^winston/,
      /^node-cron/,
      // Workers-only deps (Tasks 3.2-3.5 research pipeline):
      /^playwright/,
      /^node-vibrant/,
      /^sharp/,
      /^googleapis/,
      /^google-auth-library/,
      // Generation pipeline (Task 4.1) — quality-checks transitive deps:
      /^lighthouse/,
      /^puppeteer-core/,
      /^@puppeteer\//,
      /^proxy-agent/,
      /^agent-base/,
      // node:* protocol scheme — webpack v5 chokes on these without an explicit
      // externals rule. Externalizing as commonjs lets Node's loader handle them
      // at runtime, which is correct for server bundles.
      /^node:/,
    ];

    const existingExternals = config.externals ?? [];
    config.externals = [
      ...(Array.isArray(existingExternals) ? existingExternals : [existingExternals]),
      ({ request }, callback) => {
        if (nodeOnlyPackages.some((re) => request && re.test(request))) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    ];

    return config;
  },
};

export default nextConfig;
