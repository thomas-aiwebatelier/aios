import { describe, it, expect } from "vitest";
import { renderSignatureHtml, composeEmailParts, SIGNATURE_TEXT, SIGNATURE_PHOTO } from "./email-signature.js";

describe("signature", () => {
  it("renders HTML with the photo CID when photo present", () => {
    const html = renderSignatureHtml({ withPhoto: true });
    expect(html).toContain(`cid:${SIGNATURE_PHOTO.cid}`);
    expect(html).toContain("Thomas Cortebeeck");
    expect(html).toContain("+32 476 38 92 42");
  });
  it("omits the img tag when no photo", () => {
    const html = renderSignatureHtml({ withPhoto: false });
    expect(html).not.toContain("<img");
    expect(html).toContain("Thomas Cortebeeck");
  });
  it("text signature has name + contacts", () => {
    expect(SIGNATURE_TEXT).toContain("Thomas Cortebeeck");
    expect(SIGNATURE_TEXT).toContain("aiwebatelier.com");
  });
  it("composeEmailParts wraps plain body to html (nl->br, linkify) + appends signature", () => {
    const { textBody, htmlBody } = composeEmailParts("Hallo\nzie https://x.be", { withPhoto: true });
    expect(textBody).toContain("Hallo");
    expect(textBody).toContain("Thomas Cortebeeck");
    expect(htmlBody).toContain("<br");
    expect(htmlBody).toContain('href="https://x.be"');
    expect(htmlBody).toContain(`cid:${SIGNATURE_PHOTO.cid}`);
  });
});
