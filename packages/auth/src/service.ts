import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseServiceRoleKey } from "./env.js";

/**
 * Service-role Supabase client. BYPASSES RLS — use only in the worker and in
 * admin server code. Never import into a client bundle.
 */
export function createServiceSupabase() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
