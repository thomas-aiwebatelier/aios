import type { SupabaseClient } from "@supabase/supabase-js";

export type Role = "customer" | "admin";

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

/** Current authenticated user, or null. */
export async function getUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Throws AuthError("UNAUTHENTICATED") if not signed in. */
export async function requireUser(supabase: SupabaseClient) {
  const user = await getUser(supabase);
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

/** Reads the role from the profiles table (defaults to customer). */
export async function getRole(supabase: SupabaseClient, userId: string): Promise<Role> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as Role) ?? "customer";
}

/** Throws if not signed in (UNAUTHENTICATED) or not an admin (FORBIDDEN). */
export async function requireAdmin(supabase: SupabaseClient) {
  const user = await requireUser(supabase);
  const role = await getRole(supabase, user.id);
  if (role !== "admin") throw new AuthError("FORBIDDEN");
  return user;
}
