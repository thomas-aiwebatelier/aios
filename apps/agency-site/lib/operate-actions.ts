"use server";

import { redirect } from "next/navigation";
import { requireAdmin, createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Saves the Operate intake questionnaire as an operate_project for a brand.
 *
 * ADMIN ONLY. Customers reach the questionnaire through the hidden consulting
 * route (/diensten/educate/setup), which we walk them through — their answers
 * land in lead_intents, not here. This action is how an admin turns one of
 * those into a real project.
 */
export async function submitOperateIntake(formData: FormData) {
  const userClient = await createSupabaseServerClient();
  const user = await requireAdmin(userClient);

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
