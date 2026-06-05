"use server";

import { redirect } from "next/navigation";
import { requireUser, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID = new Set(["build", "market", "operate"]);

function newId(): string {
  return crypto.randomUUID();
}

function nameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Mijn zaak";
  }
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "site"
  );
}

/**
 * Ensure the signed-in user has a brand (one per account, from their URL) and
 * kick off the product's flow:
 *  - market  → enqueue the `brand-kit` job (brand-scoped)
 *  - build   → create/link a minimal `lead` + enqueue `research` (reuses the
 *              existing pipeline; admin approves before generation/deploy)
 *  - operate → no job; the intake form on /app/operate handles it
 *
 * Auth uses the RLS user client; all writes use the service-role client with
 * ownership set from the verified user. `leads`/`pipeline_jobs` are shared
 * operational tables, so they must never be touched by the user role.
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
    .select("id, source_url, lead_id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  let brandId = existing?.id as string | undefined;
  if (!brandId) {
    brandId = newId();
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

  if (product === "market") {
    await svc.from("pipeline_jobs").insert({
      id: newId(),
      brand_id: brandId,
      pipeline_step: "brand-kit",
      status: "queued",
      payload: { product, url, brandId },
    });
  } else if (product === "build") {
    // Reuse the existing lead pipeline. Create one lead, enqueue research;
    // admin approves before generation + Cloudflare deploy.
    let leadId = existing?.lead_id as string | null | undefined;
    if (!leadId) {
      leadId = newId();
      const name = nameFromUrl(url);
      const slug = `${slugify(name)}-${newId().slice(0, 6)}`;
      const { error } = await svc.from("leads").insert({
        id: leadId,
        slug,
        status: "discovered",
        business_name: name,
        city: "België",
        industry_key: "professional-services", // valid guide; admin can adjust
        existing_website_url: url,
        language: "nl",
      });
      if (error) throw new Error(error.message);
      await svc.from("brands").update({ lead_id: leadId }).eq("id", brandId);
      await svc.from("pipeline_jobs").insert({
        id: newId(),
        lead_id: leadId,
        pipeline_step: "research",
        status: "queued",
        payload: { leadId },
      });
    }
  }
  // operate: intake-only — handled on /app/operate.

  redirect(`/app/${product}`);
}
