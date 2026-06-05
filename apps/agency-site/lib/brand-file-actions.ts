"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Updates one brand-kit markdown file. Uses the RLS user client so Postgres
 * enforces that the file belongs to the caller's brand — no manual ownership
 * check needed.
 */
export async function updateBrandFile(id: string, content: string) {
  const supabase = await createSupabaseServerClient();
  await requireUser(supabase);

  const { error } = await supabase
    .from("brand_kit_files")
    .update({ content })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/brand");
}
