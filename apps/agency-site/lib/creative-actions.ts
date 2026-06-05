"use server";

import { revalidatePath } from "next/cache";
import { requireUser, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Enqueue an ad-creative generation. Inserts a draft ad_assets row (status
 * queued) + a `creative` pipeline job. Auth via the RLS user client; writes via
 * the service-role client (shared queue), ownership from the verified user.
 */
export async function createCreative(formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "").trim();
  const placement = String(formData.get("placement") ?? "feed");
  const format = String(formData.get("format") ?? "image");
  if (!prompt) return;

  const userClient = await createSupabaseServerClient();
  const user = await requireUser(userClient);

  const svc = createServiceSupabase();
  const { data: brand } = await svc
    .from("brands")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!brand) return;

  const adAssetId = newId();
  await svc.from("ad_assets").insert({
    id: adAssetId,
    brand_id: brand.id,
    prompt,
    placement,
    format,
    status: "queued",
    state: "draft",
  });
  await svc.from("pipeline_jobs").insert({
    id: newId(),
    brand_id: brand.id,
    pipeline_step: "creative",
    status: "queued",
    payload: { adAssetId, brandId: brand.id },
  });

  revalidatePath("/app/market");
}
