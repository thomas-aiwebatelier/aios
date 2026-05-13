import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPkg = path.resolve(__dirname, "../../packages/db");

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "workers/**/*.test.ts"],
    server: {
      deps: {
        // Process @atelier/db (TypeScript source, not compiled)
        inline: ["@atelier/db"],
      },
    },
  },
  resolve: {
    alias: {
      "@": __dirname,
      // Resolve drizzle-orm from the db package's node_modules
      "drizzle-orm": path.resolve(dbPkg, "node_modules/drizzle-orm"),
      "better-sqlite3": path.resolve(dbPkg, "node_modules/better-sqlite3"),
    },
  },
});
