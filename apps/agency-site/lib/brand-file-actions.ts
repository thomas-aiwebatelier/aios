"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Updates one brand-kit markdown file.
 *
 * ADMIN ONLY — the portal is read-only for customers.
 *
 * Note the client swap: this used to write through the RLS user client and let
 * Postgres enforce ownership. That path is now closed for everyone, admins
 * included, because UPDATE has been revoked from the `authenticated` role
 * outright (see packages/db/sql/rls-and-auth.sql). Admin writes go through the
 * service-role client, which bypasses RLS — so the requireAdmin() above is the
 * only thing standing between this and the database.
 */
export async function updateBrandFile(id: string, content: string) {
  const supabase = await createSupabaseServerClient();
  await requireAdmin(supabase);

  const { error } = await createServiceSupabase()
    .from("brand_kit_files")
    .update({ content })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/market/brand");
}
