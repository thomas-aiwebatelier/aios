import { getUser, getRole } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminSession {
  user: { id: string; email: string };
}

/**
 * Returns the current session ONLY if the signed-in user is an admin
 * (profiles.role = 'admin'); otherwise null.
 *
 * Migrated from next-auth → Supabase Auth. The contract is deliberately kept
 * identical to the old next-auth `auth()` (truthy = allowed) so existing call
 * sites — the (admin) layout and /api/blog handlers — work unchanged.
 */
export async function auth(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) return null;
  const role = await getRole(supabase, user.id);
  if (role !== "admin") return null;
  return { user: { id: user.id, email: user.email ?? "" } };
}
