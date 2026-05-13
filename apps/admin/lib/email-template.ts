/**
 * email-template.ts — Dutch cold-email renderer for AI Web Atelier outreach.
 *
 * Pricing per project memory v2:
 *   - €499 eenmalig voor de bouw (incl. één iteratie na de eerste MVP)
 *   - €9,99/maand OPTIONEEL voor hosting + onderhoud
 * NOTE: The spec template (BUILD-PROMPT.md) shows €799 + single revision.
 * DO NOT use that figure. The structure above is the locked pricing.
 *
 * Template spec: §11.6a (updated for two-tier pricing).
 */

import { runClaudeCode } from "./claude-code.js";

// ── Input types ────────────────────────────────────────────────────────────────

export interface RenderInput {
  lead: {
    businessName: string;
    firstName?: string | null;
    city: string;
    industryKey: string;
    existingWebsiteUrl: string | null;
  };
  brandProfile: {
    toneOfVoiceSummary?: string | null;
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

// ── Main renderer ─────────────────────────────────────────────────────────────

export async function renderOutreachEmail(input: RenderInput): Promise<OutreachEmail> {
  const observation = await generatePersonalizedObservation(input);

  const subject = `Een nieuwe website voor ${input.lead.businessName} — kijk eens`;

  const greeting = input.lead.firstName
    ? `Beste ${input.lead.firstName}`
    : "Beste ondernemer";

  const perf = input.generatedSite.lighthouseScores?.["performance"] ?? "—";

  const body = `${greeting},

Ik kwam ${input.lead.businessName} tegen tijdens mijn zoektocht naar lokale ondernemers in ${input.lead.city}.

${observation}

Ik ben Thomas, AI-engineer bij Streamz in Antwerpen. In mijn vrije tijd help ik lokale ondernemers met een professionele website door AI in te zetten — zodat het betaalbaar blijft en snel kan.

Ik heb alvast een voorstel voor jullie gebouwd: ${input.generatedSite.cloudflarePreviewUrl}

Wat erin zit:
- Volledig responsive (mobiel + desktop)
- SEO-geoptimaliseerd zodat klanten jullie vinden via Google
- Snelle laadtijden (Lighthouse score: ${perf})
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

  return { subject, body };
}

// ── Claude personalized observation ───────────────────────────────────────────

async function generatePersonalizedObservation(input: RenderInput): Promise<string> {
  const prompt = `You are writing the personalized observation line for a Dutch cold email from AI Web Atelier (an AI-engineer who builds custom websites for Belgian SMBs). The lead is:
- Business: ${input.lead.businessName} (${input.lead.industryKey})
- City: ${input.lead.city}
- Existing website: ${input.lead.existingWebsiteUrl ?? "(none)"}
- Tone-of-voice of their existing brand: ${input.brandProfile?.toneOfVoiceSummary ?? "unknown"}

Write 1-2 Dutch sentences that:
- Reference the business by name OR industry (be specific, not generic)
- Mention a real observation about their current online presence (no website = mention that; outdated = mention warmth/loyalty + visual gap)
- Sound like Thomas (warm, "u" register, no marketing fluff)

Output ONLY the 1-2 sentences. No preamble, no explanation, no quotes.`;

  const out = await runClaudeCode(prompt);
  return out.trim();
}
