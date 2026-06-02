import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase App Hosting's @apphosting/adapter-nextjs reads
  // `.next/standalone/.next/routes-manifest.json` post-build. Standalone
  // mode needed.
  output: "standalone",

  // Externalize Node.js-only packages so webpack doesn't try to bundle them.
  serverExternalPackages: ["postgres", "drizzle-orm"],

  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname);
    return config;
  },
};

export default nextConfig;
