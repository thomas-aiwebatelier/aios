/** Personal email signature (style C) + inline photo metadata. */
export const SIGNATURE_PHOTO = {
  /** repo-relative file read at send time */
  path: "apps/admin/public/thomas.jpg",
  cid: "thomasphoto",
  mime: "image/jpeg",
} as const;

const NAME = "Thomas Cortebeeck";
const TITLE = "AI-engineer & oprichter";
const COMPANY = "AI Web Atelier";
const EMAIL = "thomas@aiwebatelier.com";
const PHONE = "+32 476 38 92 42";
const SITE = "aiwebatelier.com";
const TAGLINE = "vakwerk websites, gebouwd met AI";

export const SIGNATURE_TEXT = `—
${NAME} · ${TITLE}
${COMPANY}
${EMAIL} · ${PHONE}
https://${SITE}
${TAGLINE}`;

export function renderSignatureHtml(opts: { withPhoto: boolean }): string {
  const photo = opts.withPhoto
    ? `<td style="vertical-align:top;padding-right:16px;">
         <img src="cid:${SIGNATURE_PHOTO.cid}" width="72" height="72" alt="${NAME}"
              style="width:72px;height:72px;border-radius:9999px;border:3px solid #fde68a;object-fit:cover;display:block;" />
       </td>`
    : "";
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1917;font-size:14px;">
  <tr>
    ${photo}
    <td style="vertical-align:top;">
      <div style="font-weight:700;font-size:16px;">${NAME}</div>
      <div style="color:#b45309;font-weight:600;">${TITLE}</div>
      <div style="color:#57534e;margin-top:6px;">✉︎ <a href="mailto:${EMAIL}" style="color:#0e7490;text-decoration:none;">${EMAIL}</a></div>
      <div style="color:#57534e;">☎ ${PHONE} &nbsp; 🌐 <a href="https://${SITE}" style="color:#0e7490;text-decoration:none;">${SITE}</a></div>
      <div style="color:#a8a29e;font-style:italic;margin-top:6px;">${TAGLINE}</div>
    </td>
  </tr>
</table>`;
}

const FOOTER_TEXT = `Je ontvangt deze mail omdat ik je zaak online tegenkwam. Geen interesse? Antwoord met "stop" en je hoort niets meer van me.`;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Turn a plain-text body into matching text + HTML parts, each with the signature. */
export function composeEmailParts(plainBody: string, opts: { withPhoto: boolean }): {
  textBody: string; htmlBody: string;
} {
  const textBody = `${plainBody}\n\n${SIGNATURE_TEXT}\n\n—\n${FOOTER_TEXT}`;
  const htmlEscaped = escapeHtml(plainBody)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0e7490;">$1</a>')
    .replace(/\n/g, "<br>\n");
  const htmlBody =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1917;font-size:14px;line-height:1.5;">` +
    `${htmlEscaped}${renderSignatureHtml({ withPhoto: opts.withPhoto })}` +
    `<div style="margin-top:14px;color:#a8a29e;font-size:12px;">${FOOTER_TEXT}</div></div>`;
  return { textBody, htmlBody };
}
