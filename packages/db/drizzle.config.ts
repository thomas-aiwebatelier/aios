import { defineConfig } from "drizzle-kit";

// drizzle-kit runs DDL (generate, migrate, push), which the Supabase
// transaction pooler doesn't fully support. Prefer DIRECT_URL when present.
const url =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/atelier_dev";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
