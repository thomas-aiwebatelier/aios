"use server";

import { createServiceSupabase } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normaliseLeadUrl } from "@/lib/url-guard";
import {
  LEAD_SERVICES,
  type LeadService,
  type LeadIntentResult,
} from "@/lib/lead-services";

/**
 * The front door.
 *
 * Every service page asks one thing before it asks who you are — your website,
 * your video idea, an audit request, questionnaire answers. This writes that
 * answer down IMMEDIATELY, before the signup screen, and returns an id.
 *
 * Why it matters: the build page used to pass the URL through a redirect
 * querystring, so anyone who hesitated at signup vanished without a trace. At
 * the top of four service pages that is the most valuable signal on the site.
 * Now an abandoned signup still leaves a row worth a follow-up.
 *
 * `lead_intents` is the only table a non-admin may write to, and it is
 * insert-only — no select, no update (see packages/db/sql/rls-and-auth.sql).
 * We still go through the service-role client so the shape is ours to control.
 */

/** Max characters we keep from a free-text answer. */
const MAX_TEXT = 2000;

function clean(v: FormDataEntryValue | null, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

/**
 * Step 1 — capture the answer. No identity required, no account, no email.
 */
export async function captureLeadIntent(formData: FormData): Promise<LeadIntentResult> {
  const service = clean(formData.get("service")) as LeadService;
  if (!LEAD_SERVICES.includes(service)) {
    return { ok: false, error: "Onbekende dienst." };
  }

  // Honeypot: a real person never fills a field they cannot see. Return a
  // plausible success so a bot learns nothing from the difference.
  if (clean(formData.get("company_website"))) {
    return { ok: true, id: "ignored" };
  }

  const sourcePath = clean(formData.get("source_path"), 300) || `/diensten/${service}`;
  const payload: Record<string, unknown> = {};

  if (service === "build") {
    const raw = clean(formData.get("url"), 500);
    if (!raw) {
      return { ok: false, error: "Vul je website of je social media-pagina in." };
    }
    // Accepts "mijnzaak.be", "facebook.com/mijnzaak", "@mijnzaak" — see
    // normaliseLeadUrl. This is a lead, not a fetch target: it is stored, not
    // requested. assertSafePublicUrl still guards the pipeline that consumes it.
    const normalised = normaliseLeadUrl(raw);
    if (!normalised) {
      return { ok: false, error: "Dat lijkt geen geldige link. Probeer bijvoorbeeld mijnzaak.be." };
    }
    payload.url = normalised;
    payload.rawInput = raw;
  } else if (service === "video") {
    const idea = clean(formData.get("idea"), MAX_TEXT);
    if (!idea) return { ok: false, error: "Vertel kort wat je video moet tonen." };
    payload.idea = idea;
  } else if (service === "market") {
    // One click, no field — the ask IS the signal.
    payload.auditRequested = true;
    const site = clean(formData.get("url"), 500);
    if (site) payload.url = normaliseLeadUrl(site) ?? site;
  } else if (service === "educate") {
    const answers = clean(formData.get("answers"), 8000);
    if (!answers) return { ok: false, error: "Vul de vragenlijst in." };
    try {
      payload.answers = JSON.parse(answers) as unknown;
    } catch {
      return { ok: false, error: "De antwoorden konden niet gelezen worden." };
    }
  }

  const id = crypto.randomUUID();
  const { error } = await createServiceSupabase().from("lead_intents").insert({
    id,
    service,
    payload,
    source_path: sourcePath,
    status: "new",
  });

  if (error) return { ok: false, error: "Er liep iets mis. Probeer het opnieuw." };
  return { ok: true, id };
}

/**
 * Step 2 — attach identity to the intent from step 1.
 *
 * Split from step 1 on purpose: research is consistent that each extra field
 * costs roughly 5–10% conversion, and that splitting the same questions across
 * steps converts better than one long form. Asking the qualifying question
 * first also means a bounce here still leaves us step 1's answer.
 */
export async function attachLeadIdentity(formData: FormData): Promise<LeadIntentResult> {
  const id = clean(formData.get("intent_id"), 64);
  const firstName = clean(formData.get("first_name"), 100);
  const lastName = clean(formData.get("last_name"), 100);
  const email = clean(formData.get("email"), 200).toLowerCase();

  if (!id) return { ok: false, error: "Sessie verlopen. Probeer opnieuw." };
  if (!firstName || !lastName) return { ok: false, error: "Vul je voor- en achternaam in." };
  // Deliberately permissive: the only thing worth rejecting here is an obvious
  // typo. Real validation is whether the address accepts mail, which we cannot
  // know from a regex.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  const { error } = await createServiceSupabase()
    .from("lead_intents")
    .update({ first_name: firstName, last_name: lastName, email })
    .eq("id", id);

  if (error) return { ok: false, error: "Er liep iets mis. Probeer het opnieuw." };
  return { ok: true, id };
}

/**
 * Step 3 — link the intent to the account it became.
 *
 * Called after signup. Matches on the intent id when we still have it, and
 * otherwise falls back to the email, so intents captured in an earlier session
 * still find their account.
 */
export async function claimLeadIntents(intentId?: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const svc = createServiceSupabase();
  const patch = { user_id: user.id, status: "claimed" as const };

  if (intentId) {
    await svc.from("lead_intents").update(patch).eq("id", intentId);
  }
  if (user.email) {
    await svc
      .from("lead_intents")
      .update(patch)
      .eq("email", user.email.toLowerCase())
      .is("user_id", null);
  }
}
