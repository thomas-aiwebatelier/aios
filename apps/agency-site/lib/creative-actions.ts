"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Enqueue an ad-creative generation. Inserts a draft ad_assets row (status
 * queued) + a `creative` pipeline job. Writes via the service-role client.
 *
 * ADMIN ONLY. This spends real money per call, and the portal is read-only:
 * we generate, customers look. Server actions are HTTP endpoints, so removing
 * the button is not a control — this check is.
 */
export async function createCreative(formData: FormData) {
  const prompt = String(formData.get("prompt") ?? "").trim();
  const placement = String(formData.get("placement") ?? "feed");
  const format = String(formData.get("format") ?? "image");
  if (!prompt) return;

  const userClient = await createSupabaseServerClient();
  const user = await requireAdmin(userClient);

  const svc = createServiceSupabase();
  const { data: brand } = await svc
    .from("brands")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!brand) return;

  const adAssetId = newId();

  // Optional reference image → store in the public `ad-media` bucket and pass
  // its URL to the worker (which hands it to the image model as guidance).
  let referenceUrl: string | undefined;
  const ref = formData.get("reference");
  if (ref instanceof File && ref.size > 0) {
    if (ref.type.startsWith("image/") && ref.size <= 10 * 1024 * 1024) {
      const ext = (ref.type.split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
      const path = `references/${adAssetId}.${ext}`;
      const { error: upErr } = await svc.storage
        .from("ad-media")
        .upload(path, ref, { contentType: ref.type, upsert: true });
      if (!upErr) {
        referenceUrl = svc.storage.from("ad-media").getPublicUrl(path).data.publicUrl;
      }
    }
  }

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
    payload: { adAssetId, brandId: brand.id, referenceUrl },
  });

  revalidatePath("/app/market");
}
