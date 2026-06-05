"use server";

import { redirect } from "next/navigation";
import { requireUser, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID = new Set(["build", "market", "operate"]);

// Async job step enqueued per product (operate is intake-only — no job in v1).
const PRODUCT_STEP: Record<string, string | null> = {
  build: "site-request",
  market: "brand-kit",
  operate: null,
};

/**
 * Server action: ensure the signed-in user has a brand (one per account,
 * created from their URL) and enqueue the product's job. Auth is checked with
 * the RLS user client; the brand + queue writes use the service-role client so
 * the shared operational `pipeline_jobs` table is never exposed to the user
 * role — ownership is set explicitly from the verified user id.
 */
export async function startFromUrl(formData: FormData) {
  const product = String(formData.get("product") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  if (!VALID.has(product)) redirect("/app");

  const userClient = await createSupabaseServerClient();
  const user = await requireUser(userClient);

  const svc = createServiceSupabase();

  // One brand per account.
  const { data: existing } = await svc
    .from("brands")
    .select("id, source_url")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  let brandId = existing?.id as string | undefined;
  if (!brandId) {
    brandId = crypto.randomUUID();
    const { error } = await svc.from("brands").insert({
      id: brandId,
      owner_user_id: user.id,
      source_url: url,
      status: "queued",
    });
    if (error) throw new Error(error.message);
  } else if (url && existing?.source_url !== url) {
    await svc.from("brands").update({ source_url: url }).eq("id", brandId);
  }

  const step = PRODUCT_STEP[product];
  if (step) {
    await svc.from("pipeline_jobs").insert({
      id: crypto.randomUUID(),
      brand_id: brandId,
      pipeline_step: step,
      status: "queued",
      // brandId in the payload too: the worker's Processor type only exposes
      // { id, payload, leadId }, so brand-scoped jobs read brandId from here.
      payload: { product, url, brandId },
    });
  }

  redirect(`/app/${product}`);
}
