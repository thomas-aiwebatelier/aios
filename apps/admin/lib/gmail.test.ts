import { describe, it, expect } from "vitest";
import { buildRaw } from "./gmail.js";

function decode(b64url: string) {
  return Buffer.from(b64url.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

describe("buildRaw", () => {
  it("builds multipart/alternative with text + html and From signature address", () => {
    const raw = decode(buildRaw({ to: "x@y.be", subject: "Hé", textBody: "Hallo", htmlBody: "<p>Hallo</p>" }));
    expect(raw).toContain("From: AI Web Atelier <thomas@aiwebatelier.com>");
    expect(raw).toContain("multipart/alternative");
    expect(raw).toContain("text/plain");
    expect(raw).toContain("text/html");
  });
  it("wraps in multipart/related with an inline image part when photo provided", () => {
    const raw = decode(buildRaw({ to: "x@y.be", subject: "s", textBody: "t", htmlBody: "<p>t</p>",
      inlineImage: { cid: "thomasphoto", mime: "image/jpeg", base64: "AAAA" } }));
    expect(raw).toContain("multipart/related");
    expect(raw).toContain("Content-ID: <thomasphoto>");
    expect(raw).toContain("Content-Disposition: inline");
  });
});
