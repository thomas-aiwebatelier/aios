/**
 * url-guard.ts — SSRF protection for user-submitted website URLs.
 *
 * A customer submits the URL their brand kit / site is built from; the worker
 * then fetches it server-side with a real browser. Without validation a user
 * could point it at cloud metadata (169.254.169.254), localhost, or internal
 * hosts. This is the SUBMIT-TIME guard (blocks obvious targets early). The
 * worker re-validates at FETCH time after DNS resolution (see local-worker's
 * lib/url-guard.ts) to also defeat DNS rebinding / hostnames → internal IPs.
 */

export class UnsafeUrlError extends Error {}

/**
 * Sanitise a post-login `next` redirect target. Returns it only if it is a
 * same-origin relative path; otherwise falls back to "/app". Blocks open
 * redirects via absolute URLs and protocol-relative tricks ("//evil.com",
 * "/\evil.com").
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/app";
  if (!/^\/(?![/\\])/.test(next)) return "/app";
  return next;
}

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true; // malformed → block
  if (a === 0 || a === 10 || a === 127) return true; // this-host / private / loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIPv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (h === "::1" || h === "::") return true; // loopback / unspecified
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // unique-local
  if (h.startsWith("fe80")) return true; // link-local
  if (h.startsWith("::ffff:")) return isPrivateIPv4(h.split(":").pop() ?? ""); // v4-mapped
  return false;
}

/** True if `host` is a literal IP (any version), used to decide IP-vs-name. */
export function isIpLiteral(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
}

/** True if a hostname OR IP literal resolves to a non-public target. */
export function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (
    h === "localhost" ||
    h === "ip6-localhost" ||
    h === "ip6-loopback" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal")
  ) {
    return true;
  }
  return isPrivateIPv4(h) || isPrivateIPv6(h);
}

/**
 * Validate a user-submitted URL is a public http(s) URL. Throws UnsafeUrlError
 * on anything that isn't. Returns the normalised URL string.
 */
export function assertSafePublicUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UnsafeUrlError("Geef een geldige URL op (bv. https://jouwsite.be).");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new UnsafeUrlError("Alleen http(s)-adressen zijn toegestaan.");
  }
  if (u.port && u.port !== "80" && u.port !== "443") {
    throw new UnsafeUrlError("Alleen standaardpoorten (80/443) zijn toegestaan.");
  }
  if (u.username || u.password) {
    throw new UnsafeUrlError("Inloggegevens in de URL zijn niet toegestaan.");
  }
  if (isBlockedHost(u.hostname)) {
    throw new UnsafeUrlError("Interne of privé-adressen zijn niet toegestaan.");
  }
  return u.toString();
}
