import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use node pool (no DOM needed — we use real Playwright browser)
    environment: "node",
    // Long timeout for Playwright + astro preview startup
    testTimeout: 120_000,
    hookTimeout: 300_000,
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/fixtures/**"],
  },
});
