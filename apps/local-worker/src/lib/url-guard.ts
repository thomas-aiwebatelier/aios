/**
 * url-guard.ts — fetch-time SSRF protection for the worker.
 *
 * The brand-kit / research steps fetch a user-submitted URL with a real
 * browser. The agency-site submit guard blocks obvious internal targets, but
 * a hostname can still resolve to an internal IP (or rebind after submit).
 * This guard resolves DNS and verifies EVERY resolved address is public before
 * we fetch. Call it immediately before page.goto / fetch.
 */
import { lookup } from "node:dns/promises";

export class UnsafeUrlError extends Error {}

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local incl. metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const h = ip.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true;
  if (h.startsWith("fe80")) return true;
  if (h.startsWith("::ffff:")) return isPrivateIPv4(h.split(":").pop() ?? "");
  return false;
}

function isPrivateAddr(ip: string): boolean {
  return ip.includes(":") ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

/**
 * Throw UnsafeUrlError unless `raw` is a public http(s) URL whose host resolves
 * only to public IP addresses.
 */
export async function assertPublicUrl(raw: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new UnsafeUrlError(`invalid url: ${raw}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new UnsafeUrlError(`blocked protocol: ${u.protocol}`);
  }
  if (u.port && u.port !== "80" && u.port !== "443") {
    throw new UnsafeUrlError(`blocked port: ${u.port}`);
  }
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new UnsafeUrlError(`blocked host: ${host}`);
  }
  // If it's already an IP literal, check directly; otherwise resolve DNS.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) {
    if (isPrivateAddr(host)) throw new UnsafeUrlError(`private ip: ${host}`);
    return;
  }
  const records = await lookup(host, { all: true });
  if (records.length === 0) throw new UnsafeUrlError(`no DNS records: ${host}`);
  for (const r of records) {
    if (isPrivateAddr(r.address)) {
      throw new UnsafeUrlError(`host ${host} resolves to private ip ${r.address}`);
    }
  }
}
