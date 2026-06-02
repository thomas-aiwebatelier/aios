// TEMP DEBUG ENDPOINT — remove before merging to main.
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const runtimeEnv = (locals as any)?.runtime?.env ?? {};
  const keys = Object.keys(runtimeEnv);
  const dbUrl = runtimeEnv.SUPABASE_DATABASE_URL;
  const procDbUrl =
    typeof process !== "undefined" ? process.env?.SUPABASE_DATABASE_URL : undefined;
  return new Response(
    JSON.stringify({
      runtimeKeys: keys,
      hasRuntimeDbUrl: typeof dbUrl === "string",
      runtimeDbUrlLen: typeof dbUrl === "string" ? dbUrl.length : null,
      runtimeDbUrlType: typeof dbUrl,
      runtimeDbUrlSample:
        typeof dbUrl === "string"
          ? dbUrl.slice(0, 14) + "..." + dbUrl.slice(-12)
          : null,
      hasProcDbUrl: typeof procDbUrl === "string",
      procDbUrlLen: typeof procDbUrl === "string" ? procDbUrl.length : null,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
};
