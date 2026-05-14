import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPkg = path.resolve(__dirname, "../../packages/db");

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    server: {
      deps: {
        // @atelier/db is TS source, not compiled — inline it so vitest
        // transforms the .ts files via esbuild rather than trying to
        // resolve the dist/.
        inline: ["@atelier/db"],
      },
    },
  },
  resolve: {
    alias: {
      // Resolve drizzle-orm from the db package's node_modules so the
      // pglite driver and the postgres-js driver agree on a single
      // drizzle-orm version (mirrors apps/admin/vitest.config.ts).
      "drizzle-orm": path.resolve(dbPkg, "node_modules/drizzle-orm"),
    },
  },
});
