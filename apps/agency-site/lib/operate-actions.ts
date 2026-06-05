"use server";

import { redirect } from "next/navigation";
import { requireUser, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Saves the Operate intake questionnaire as an operate_project for the user's
 * brand (intake-only v1 — no async job). Auth via the RLS user client; the
 * write uses the service-role client with brand ownership verified from the
 * authenticated user.
 */
export async function submitOperateIntake(formData: FormData) {
  const userClient = await createSupabaseServerClient();
  const user = await requireUser(userClient);

  const svc = createServiceSupabase();
  const { data: brand } = await svc
    .from("brands")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!brand) redirect("/app/operate");

  const split = (v: FormDataEntryValue | null) =>
    String(v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const intake = {
    toolsUsed: split(formData.get("toolsUsed")),
    tasksToAutomate: String(formData.get("tasksToAutomate") ?? ""),
    systemsToConnect: split(formData.get("systemsToConnect")),
    volume: String(formData.get("volume") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };

  await svc.from("operate_projects").insert({
    id: crypto.randomUUID(),
    brand_id: brand.id,
    status: "submitted",
    intake,
  });

  redirect("/app/operate");
}
