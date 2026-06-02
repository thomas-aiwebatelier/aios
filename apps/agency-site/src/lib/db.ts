import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "@atelier/db";

/**
 * Resolve the Supabase connection string from whichever environment we're
 * running in.
 *
 * - Cloudflare Workers / Pages Functions: bindings are passed in via the
 *   `runtimeEnv` arg (`Astro.locals.runtime.env`). `process.env` and
 *   `import.meta.env` do NOT contain Pages env vars at runtime.
 * - Local `astro dev` / Node build: `process.env` is populated, and the
 *   slice-1 docs use `DATABASE_URL` in the repo root `.env`.
 */
function getConnectionString(runtimeEnv?: Record<string, unknown>): string {
  const fromRuntime =
    (runtimeEnv?.SUPABASE_DATABASE_URL as string | undefined) ??
    (runtimeEnv?.DATABASE_URL as string | undefined);
  const fromImportMeta = (import.meta as any).env?.SUPABASE_DATABASE_URL as
    | string
    | undefined;
  const fromProcess =
    typeof process !== "undefined"
      ? (process.env?.SUPABASE_DATABASE_URL ?? process.env?.DATABASE_URL)
      : undefined;
  const fromGlobal = (globalThis as any).SUPABASE_DATABASE_URL as
    | string
    | undefined;
  const url = fromRuntime ?? fromImportMeta ?? fromProcess ?? fromGlobal;
  if (!url) {
    throw new Error("SUPABASE_DATABASE_URL not configured");
  }
  return url;
}

// `prepare: false` is required when going through Supabase's pgbouncer
// pooler (port 6543), which is what we use from Workers / Pages.
export function getDb(runtimeEnv?: Record<string, unknown>) {
  const client = postgres(getConnectionString(runtimeEnv), { prepare: false });
  return drizzle(client, { schema });
}
