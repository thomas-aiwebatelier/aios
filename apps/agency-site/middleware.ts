import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Search-engine protection for non-production environments.
 *
 * Only the canonical production hostnames may be indexed. Every other host the
 * app can be reached on — dev.aiwebatelier.com, the raw Firebase App Hosting
 * URLs (*.hosted.app), Cloud Run URLs (*.run.app), preview channels, bare IPs —
 * gets a hard `noindex` and a Disallow-all robots.txt.
 *
 * Host-based (not env-based) on purpose: the dev and prod App Hosting backends
 * share one apphosting.yaml with no distinguishing env var, so the Host header
 * is the only reliable signal. This also shields the backend URLs that get
 * generated automatically and would otherwise be crawlable.
 */
const PROD_HOSTS = new Set(["aiwebatelier.com", "www.aiwebatelier.com"]);

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Production hosts behave normally (indexable).
  if (PROD_HOSTS.has(host)) {
    return NextResponse.next();
  }

  // Non-production: serve a Disallow-all robots.txt...
  if (request.nextUrl.pathname === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // ...and tag every other response noindex so it can never enter the index,
  // even if a URL is discovered through a link.
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  // Run on all routes except Next.js build assets (they don't need the header).
  matcher: ["/((?!_next/static|_next/image).*)"],
};
