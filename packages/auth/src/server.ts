import { createServerClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnonKey } from "./env.js";

/**
 * Framework-neutral cookie adapter. Next.js apps pass an adapter backed by
 * `next/headers` cookies(); this keeps @atelier/auth usable by both the
 * agency-site portal and the admin app without importing Next here.
 */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

/** Server-side Supabase client bound to the request's cookies (RLS-scoped). */
export function createServerSupabase(cookies: CookieAdapter) {
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) =>
        cookies.setAll(toSet),
    },
  });
}
