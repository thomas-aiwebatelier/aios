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

/** Built, deployed, and invisible to everyone but an admin. See below. */
const HIDDEN_ROUTES = ["/diensten/educate/setup"];

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

  // Routes that exist in the codebase but must not exist for the public.
  // Admins get the real page; everyone else gets a genuine 404.
  //
  // A 404 and not a /login redirect: redirecting confirms the route is there
  // and worth coming back to with a session. A 404 tells a scanner nothing.
  // And not a NEXT_PUBLIC_ env flag either — those ship to the browser and
  // leave the route reachable anyway.
  const isHidden = HIDDEN_ROUTES.some((p) => path === p || path.startsWith(p + "/"));

  // Refresh the Supabase session (rebuilds the response with fresh cookies).
  // Role resolution costs a query, so ask for it only on the hidden routes.
  const { response, user, role } = await updateSession(request, isHidden);

  if (isHidden && role !== "admin") {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow, noarchive" },
    });
  }

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
