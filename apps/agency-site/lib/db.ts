import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./blog-schema";

/**
 * Resolve the Supabase connection string from whichever env it's defined in.
 *
 * - On Firebase App Hosting: `DATABASE_URL` is provided as a secret bound via
 *   apphosting.yaml.
 * - On local `next dev`: looked up from a repo-root `.env` (Next.js loads
 *   workspace-root .env files automatically).
 *
 * The runtimeEnv arg is kept for symmetry with the prior Astro shape and to
 * allow explicit overrides from callers.
 */
function getConnectionString(runtimeEnv?: Record<string, unknown>): string {
  const fromRuntime =
    (runtimeEnv?.SUPABASE_DATABASE_URL as string | undefined) ??
    (runtimeEnv?.DATABASE_URL as string | undefined);
  const fromProcess =
    typeof process !== "undefined"
      ? (process.env?.SUPABASE_DATABASE_URL ?? process.env?.DATABASE_URL)
      : undefined;
  const url = fromRuntime ?? fromProcess;
  if (!url) {
    throw new Error("SUPABASE_DATABASE_URL / DATABASE_URL not configured");
  }
  return url;
}

// `prepare: false` is required when going through Supabase's pgbouncer
// pooler (port 6543).
export function getDb(runtimeEnv?: Record<string, unknown>) {
  const client = postgres(getConnectionString(runtimeEnv), { prepare: false });
  return drizzle(client, { schema });
}
