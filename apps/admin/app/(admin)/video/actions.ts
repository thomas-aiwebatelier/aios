"use server";

import { revalidatePath } from "next/cache";
import { createServiceSupabase } from "@atelier/auth";
import { auth } from "@/lib/auth";

/**
 * Publish a finished video to a client's portal.
 *
 * This is the bridge between the two clouds. The studio
 * (services/video-studio) produces into FIRESTORE + Firebase Storage; the
 * client portal reads POSTGRES + Supabase Storage. Rather than have the portal
 * reach across on a customer request — two auth systems, two failure modes, on
 * the critical path of a page load — the handoff happens once, here, when a
 * video is actually done.
 *
 * Two ways in, because both happen in practice:
 *   · paste the studio's download URL — Firebase's getDownloadURL tokens are
 *     durable, so this works straight from the studio UI;
 *   · upload the file you already downloaded.
 *
 * Either way the MP4 ends up in Supabase Storage. We deliberately do NOT store
 * the Firebase URL directly: ModelArk and fal result URLs expire (24h and ~1h),
 * and even a durable Firebase token dies if the studio project is cleaned up.
 * A client's video should not depend on any of that.
 */

const BUCKET = "deliverables";
/** Seedance caps a generation at 30s; 200 MB is far above any real 15s clip. */
const MAX_BYTES = 200 * 1024 * 1024;

export type PublishResult = { ok: true; id: string } | { ok: false; error: string };

function fail(error: string): PublishResult {
  return { ok: false, error };
}

/**
 * `auth()` RETURNS NULL for non-admins rather than throwing, so awaiting it
 * alone guards nothing. Server actions are their own HTTP endpoints — the
 * middleware that protects the pages does not protect these — so every action
 * below starts here.
 */
async function requireAdminSession() {
  const session = await auth();
  if (!session) throw new Error("forbidden");
  return session;
}

export async function publishVideo(formData: FormData): Promise<PublishResult> {
  await requireAdminSession();

  const ownerUserId = String(formData.get("owner_user_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || "Je commercial";
  const sourceUrl = String(formData.get("source_url") ?? "").trim();
  const studioProjectId = String(formData.get("studio_project_id") ?? "").trim();
  const durationRaw = String(formData.get("duration_seconds") ?? "").trim();
  const file = formData.get("file");

  if (!ownerUserId) return fail("Kies een klant.");

  const svc = createServiceSupabase();

  // Guard against a typo silently creating an orphan row nobody can see.
  const { data: profile } = await svc
    .from("profiles")
    .select("id")
    .eq("id", ownerUserId)
    .maybeSingle();
  if (!profile) return fail("Onbekende klant — die gebruiker bestaat niet.");

  const id = crypto.randomUUID();
  let bytes: ArrayBuffer;
  let contentType = "video/mp4";

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return fail("Bestand is te groot (max 200 MB).");
    if (!file.type.startsWith("video/")) return fail("Dat is geen videobestand.");
    contentType = file.type;
    bytes = await file.arrayBuffer();
  } else if (sourceUrl) {
    let res: Response;
    try {
      res = await fetch(sourceUrl, { signal: AbortSignal.timeout(120_000) });
    } catch {
      return fail("Kon de video niet ophalen van die URL.");
    }
    if (!res.ok) return fail(`Ophalen mislukt (HTTP ${res.status}).`);

    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return fail("Bestand is te groot (max 200 MB).");
    contentType = res.headers.get("content-type") ?? "video/mp4";
    bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return fail("Bestand is te groot (max 200 MB).");
  } else {
    return fail("Geef een download-URL of upload een bestand.");
  }

  const path = `${ownerUserId}/${id}.mp4`;
  const { error: upErr } = await svc.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (upErr) return fail(`Upload mislukt: ${upErr.message}`);

  const videoUrl = svc.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { error: insErr } = await svc.from("video_deliverables").insert({
    id,
    owner_user_id: ownerUserId,
    title,
    status: "delivered",
    duration_seconds: durationRaw ? Number(durationRaw) : null,
    video_url: videoUrl,
    studio_project_id: studioProjectId || null,
  });
  if (insErr) return fail(`Opslaan mislukt: ${insErr.message}`);

  revalidatePath("/video");
  return { ok: true, id };
}

/**
 * Move a deliverable along without a file — so the client sees "ik schrijf het
 * scenario" instead of an empty tab for four days. The portal's status labels
 * are in apps/agency-site/lib/portal-status.ts.
 */
export async function setVideoStatus(id: string, status: string): Promise<void> {
  await requireAdminSession();
  await createServiceSupabase()
    .from("video_deliverables")
    .update({ status })
    .eq("id", id);
  revalidatePath("/video");
}

/**
 * Open a slot for a client the moment their request is accepted, so the Video
 * tab shows progress from day one rather than nothing until delivery.
 */
export async function createVideoSlot(formData: FormData): Promise<PublishResult> {
  await requireAdminSession();
  const ownerUserId = String(formData.get("owner_user_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || "Je commercial";
  if (!ownerUserId) return fail("Kies een klant.");

  const id = crypto.randomUUID();
  const { error } = await createServiceSupabase().from("video_deliverables").insert({
    id,
    owner_user_id: ownerUserId,
    title,
    status: "requested",
  });
  if (error) return fail(error.message);

  revalidatePath("/video");
  return { ok: true, id };
}
