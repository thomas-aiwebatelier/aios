/**
 * email-template.ts — Dutch cold-email renderer for AI Web Atelier outreach.
 *
 * Personalization without an LLM:
 *   The opening "observation" line is built DETERMINISTICALLY from data gathered
 *   during the research phase (website presence, staleness score, industry,
 *   city, brand tone, social links). This means it runs anywhere — including
 *   Cloud Run, which has no `claude` CLI. (The previous implementation shelled
 *   out to `claude`, which crashed the composer in production — there is no
 *   claude binary in the container.)
 *
 *   The subject + body come from an admin-editable template stored in the
 *   email_templates table (edited in Settings). If no template row exists we
 *   fall back to the built-in DEFAULT_* templates below, so the composer always
 *   works — even before a template has ever been saved.
 *
 * Pricing per project memory v2:
 *   - €499 eenmalig voor de bouw (incl. één iteratie na de eerste MVP)
 *   - €9,99/maand OPTIONEEL voor hosting + onderhoud
 * NOTE: The spec template (BUILD-PROMPT.md) shows €799 + single revision.
 * DO NOT use that figure. The structure above is the locked pricing.
 *
 * Template spec: §11.6a (updated for two-tier pricing + admin-editable templates).
 */

import { getDb } from "./db.js";
import { emailTemplates } from "@atelier/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

// ── Input types ────────────────────────────────────────────────────────────────

export interface RenderInput {
  lead: {
    businessName: string;
    firstName?: string | null;
    city: string;
    industryKey: string;
    existingWebsiteUrl: string | null;
    /** 0-100, higher = more outdated. Null if not scored. */
    websiteStalenessScore?: number | null;
  };
  brandProfile: {
    toneOfVoiceSummary?: string | null;
    socialLinks?: Record<string, string> | null;
  } | null;
  generatedSite: {
    cloudflarePreviewUrl: string;
    lighthouseScores: Record<string, number> | null;
  };
}

export interface OutreachEmail {
  subject: string;
  body: string;
}

// ── Placeholders (also surfaced in the Settings template editor) ────────────────

export const TEMPLATE_PLACEHOLDERS: ReadonlyArray<{ token: string; description: string }> = [
  { token: "{{greeting}}", description: 'Aanhef — "Beste {voornaam}" of "Beste ondernemer"' },
  { token: "{{businessName}}", description: "Naam van de zaak" },
  { token: "{{city}}", description: "Gemeente / stad" },
  { token: "{{industry}}", description: "Sector in mensentaal (bv. bakkerij of horecazaak)" },
  { token: "{{observation}}", description: "Automatische, gepersonaliseerde observatie uit de research" },
  { token: "{{previewUrl}}", description: "Link naar de gegenereerde voorbeeldsite" },
  { token: "{{performance}}", description: "Lighthouse performance-score van de voorbeeldsite" },
];

// ── Built-in default template ──────────────────────────────────────────────────

export const DEFAULT_SUBJECT_TEMPLATE = `Een nieuwe website voor {{businessName}} — kijk eens`;

export const DEFAULT_BODY_TEMPLATE = `{{greeting}},

Ik kwam {{businessName}} tegen tijdens mijn zoektocht naar lokale ondernemers in {{city}}.

{{observation}}

Ik ben Thomas, AI-engineer bij Streamz in Antwerpen. In mijn vrije tijd help ik lokale ondernemers met een professionele website door AI in te zetten — zodat het betaalbaar blijft en snel kan.

Ik heb alvast een voorstel voor jullie gebouwd: {{previewUrl}}

Wat erin zit:
- Volledig responsive (mobiel + desktop)
- SEO-geoptimaliseerd zodat klanten jullie vinden via Google
- Snelle laadtijden (Lighthouse score: {{performance}})
- Jullie branding, jullie tekst, modern uitgevoerd

Mijn prijs is opgebouwd in twee delen, eerlijk en zonder verrassingen:

  €499 eenmalig voor de bouw — inclusief één iteratie nadat jullie de eerste versie bekeken hebben. Daarna is de site af, jullie krijgen de volledige code, eigendom is jullie.

  €9,99 per maand (optioneel) voor hosting + onderhoud — wij houden de site snel en veilig online, één kleine wijziging per maand inbegrepen. Opzegbaar per maand, of jullie hosten zelf.

Laat me weten wat jullie ervan vinden. Geen druk — gewoon antwoorden op deze mail volstaat.

Vriendelijke groet,
Thomas

—
AI Web Atelier — vakwerk websites, gebouwd met AI
https://aiwebatelier.com

Wenst u geen ongevraagde mails meer te ontvangen? Antwoord met "uitschrijven" en wij verwijderen uw gegevens binnen 24 uur.`;

// ── Industry → Dutch label ──────────────────────────────────────────────────────

const INDUSTRY_LABELS_NL: Record<string, string> = {
  automotive: "garage- of autozaak",
  "bakery-restaurant": "bakkerij of horecazaak",
  "beauty-personal-care": "schoonheids- of verzorgingszaak",
  "creative-services": "creatieve dienstverlener",
  "fitness-sport": "fitness- of sportzaak",
  "health-wellness": "gezondheids- of wellnesspraktijk",
  "professional-services": "professionele dienstverlener",
  "real-estate-property": "vastgoedkantoor",
  "retail-boutique": "winkel of boetiek",
  "trades-construction": "vakman of bouwbedrijf",
};

function humanizeIndustry(industryKey: string): string {
  return INDUSTRY_LABELS_NL[industryKey] ?? industryKey.replace(/[-_]+/g, " ").trim();
}

// ── Deterministic personalized observation ──────────────────────────────────────

const STALE_THRESHOLD = 50; // websiteStalenessScore >= this ⇒ treat as outdated

/**
 * Build the 1-2 sentence Dutch observation line from research data.
 * Pure + deterministic — never calls an LLM, never throws.
 */
export function buildObservation(input: RenderInput): string {
  const { businessName, city, industryKey, existingWebsiteUrl, websiteStalenessScore } = input.lead;
  const industry = humanizeIndustry(industryKey);
  const hasSocial = Boolean(
    input.brandProfile?.socialLinks && Object.keys(input.brandProfile.socialLinks).length > 0,
  );

  // No website at all → strongest angle.
  if (!existingWebsiteUrl) {
    if (hasSocial) {
      return `Het viel me op dat ${businessName} nog geen eigen website heeft — jullie zijn wel actief op social media, maar een eigen site geeft jullie een vaste, professionele thuisbasis die je zelf in handen houdt en waarmee klanten je via Google vinden.`;
    }
    return `Het viel me op dat ${businessName} nog geen eigen website heeft. Vandaag zoeken klanten een lokale ${industry} in ${city} vaak eerst online, en dan maakt een vindbare site het verschil tussen gevonden of gemist worden.`;
  }

  // Has a website that looks outdated.
  if (typeof websiteStalenessScore === "number" && websiteStalenessScore >= STALE_THRESHOLD) {
    return `Jullie huidige website straalt de warmte en het vakmanschap van ${businessName} nog niet helemaal uit — de inhoud is sterk, maar visueel oogt ze wat verouderd tegenover wat vandaag mogelijk is.`;
  }

  // Has a website; no strong staleness signal.
  return `Ik bekeek de huidige website van ${businessName} en zag meteen waar een frissere, modernere uitvoering jullie als ${industry} in ${city} online nog sterker kan neerzetten.`;
}

// ── Template interpolation ───────────────────────────────────────────────────────

/**
 * Replace {{token}} placeholders with values. Unknown tokens are left intact so
 * typos in an admin-edited template are visible rather than silently dropped.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match,
  );
}

/** Build the interpolation variable map from a render input + observation. */
export function buildTemplateVars(input: RenderInput, observation: string): Record<string, string> {
  return {
    greeting: input.lead.firstName ? `Beste ${input.lead.firstName}` : "Beste ondernemer",
    businessName: input.lead.businessName,
    city: input.lead.city,
    industry: humanizeIndustry(input.lead.industryKey),
    observation,
    previewUrl: input.generatedSite.cloudflarePreviewUrl,
    performance: String(input.generatedSite.lighthouseScores?.["performance"] ?? "—"),
  };
}

// ── Active template loading (DB → built-in default) ──────────────────────────────

/**
 * Load the active email template from the DB. Falls back to the built-in
 * default on any error or if no row exists. Never throws.
 */
export async function loadActiveEmailTemplate(): Promise<{ subject: string; body: string }> {
  try {
    const db = getDb();
    const row = (
      await db.select().from(emailTemplates).where(eq(emailTemplates.isActive, true)).limit(1)
    )[0];
    if (row?.subject && row?.body) {
      return { subject: row.subject, body: row.body };
    }
  } catch (err) {
    logger.warn("[email-template] failed to load active template, using default", {
      error: String(err),
    });
  }
  return { subject: DEFAULT_SUBJECT_TEMPLATE, body: DEFAULT_BODY_TEMPLATE };
}

// ── Main renderer ─────────────────────────────────────────────────────────────

/**
 * Render the outreach email: deterministic observation + admin-editable
 * template. Designed to never throw — the composer page depends on it always
 * returning a usable draft.
 */
export async function renderOutreachEmail(input: RenderInput): Promise<OutreachEmail> {
  const observation = buildObservation(input);
  const { subject, body } = await loadActiveEmailTemplate();
  const vars = buildTemplateVars(input, observation);
  return {
    subject: interpolate(subject, vars),
    body: interpolate(body, vars),
  };
}
