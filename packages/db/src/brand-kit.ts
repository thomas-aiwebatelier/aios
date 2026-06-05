import type { BrandSignals, BrandKitFileType } from "./schema.js";

export interface BrandKitMeta {
  brandName?: string;
  sourceUrl?: string;
}

export interface RenderedBrandFile {
  type: BrandKitFileType;
  content: string;
}

const TBD = "_Nog niet gedetecteerd — vul aan in je merkkit._";

function colorLine(label: string, token: string, value?: string): string {
  return value ? `- **${label}:** \`${value}\` (\`${token}\`)` : `- **${label}:** ${TBD}`;
}

function renderVisualIdentity(s: BrandSignals): string {
  const palette =
    s.palette && s.palette.length
      ? s.palette.map((c) => `\`${c}\``).join(" · ")
      : TBD;
  const heading = s.fonts?.heading;
  const body = s.fonts?.body;
  return [
    "# Visuele identiteit",
    "",
    "## Kleuren",
    colorLine("Primair", "--brand-primary", s.primaryColor),
    colorLine("Secundair", "--brand-secondary", s.secondaryColor),
    colorLine("Accent", "--brand-accent", s.accentColor),
    "",
    `**Volledig palet:** ${palette}`,
    "",
    "## Typografie",
    `- **Koppen:** ${heading ? `\`${heading}\`` : TBD}`,
    `- **Tekst:** ${body ? `\`${body}\`` : TBD}`,
    "",
    "## Logo",
    "Logobestanden staan onder _Assets_. Gebruik voldoende witruimte rondom het logo en plaats het nooit op een drukke achtergrond.",
    "",
  ].join("\n");
}

function renderVoice(s: BrandSignals): string {
  const lines = ["# Tone of voice & boodschap", ""];
  lines.push("## Tone of voice");
  lines.push(s.toneOfVoiceSummary?.trim() || TBD);
  lines.push("");
  lines.push("## Positionering");
  lines.push(s.positioning?.trim() || TBD);
  lines.push("");
  lines.push("## Doelgroep");
  lines.push(s.audience?.trim() || TBD);
  lines.push("");
  return lines.join("\n");
}

function renderBusiness(s: BrandSignals, meta: BrandKitMeta): string {
  const lines = ["# Business & aanbod", ""];
  lines.push(`**Naam:** ${meta.brandName?.trim() || TBD}`);
  if (meta.sourceUrl) lines.push(`**Website:** ${meta.sourceUrl}`);
  lines.push("");
  lines.push("## Wat je doet");
  lines.push(s.positioning?.trim() || TBD);
  lines.push("");
  lines.push("## Producten & diensten");
  if (s.products && s.products.length) {
    for (const p of s.products) {
      const price = p.price ? ` — ${p.price}` : "";
      const desc = p.description ? `: ${p.description}` : "";
      lines.push(`- **${p.name}**${price}${desc}`);
    }
  } else {
    lines.push(TBD);
  }
  lines.push("");
  if (s.socialLinks && Object.keys(s.socialLinks).length) {
    lines.push("## Social");
    for (const [k, v] of Object.entries(s.socialLinks)) lines.push(`- ${k}: ${v}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Pure renderer: turn extracted brand signals into the three editable brand-kit
 * markdown files. Deterministic, dependency-free, with graceful fallbacks for
 * missing data — so it never throws on a partial scrape.
 */
export function renderBrandKit(
  signals: BrandSignals,
  meta: BrandKitMeta = {},
): RenderedBrandFile[] {
  return [
    { type: "visual-identity", content: renderVisualIdentity(signals) },
    { type: "voice-and-messaging", content: renderVoice(signals) },
    { type: "business", content: renderBusiness(signals, meta) },
  ];
}
