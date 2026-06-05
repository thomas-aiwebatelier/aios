import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Two responsibilities:
 *  1. Search-engine protection for non-production hosts (host-based noindex +
 *     Disallow-all robots.txt) — only the canonical prod hostnames are
 *     indexable. (Unchanged behaviour.)
 *  2. Supabase session refresh on every request, and gating the authenticated
 *     portal under /app (redirect to /login when signed out).
 */
const PROD_HOSTS = new Set(["aiwebatelier.com", "www.aiwebatelier.com"]);

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const isProd = PROD_HOSTS.has(host);
  const path = request.nextUrl.pathname;

  // Non-production robots.txt short-circuit (no auth work needed).
  if (!isProd && path === "/robots.txt") {
    return new NextResponse("User-agent: *\nDisallow: /\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Refresh the Supabase session (rebuilds the response with fresh cookies).
  const { response, user } = await updateSession(request);

  // Gate the authenticated portal.
  if (path.startsWith("/app") && !user) {
    const url = request.nextUrl.clone();
    const dest = path + request.nextUrl.search; // preserve ?url=… through signup
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", dest);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    if (!isProd) {
      redirect.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    return redirect;
  }

  if (!isProd) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  // Run on all routes except Next.js build assets.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
