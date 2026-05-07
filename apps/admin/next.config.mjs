import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize Node.js-only packages so webpack doesn't try to bundle them
  serverExternalPackages: [
    "better-sqlite3",
    "drizzle-orm",
    "@atelier/db",
    "winston",
    "winston-daily-rotate-file",
    "node-cron",
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
        "better-sqlite3": false,
      };
    }

    // Externalize node-only packages from both client and server static analysis
    const nodeOnlyPackages = [
      /^better-sqlite3/,
      /^@atelier\/db/,
      /^drizzle-orm/,
      /^winston/,
      /^node-cron/,
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
