import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Refreshes the Supabase session and gates the admin app at the edge:
 *  - unauthenticated (outside /login) → redirect to login;
 *  - authenticated but NOT admin → 403 (API) or login redirect (pages).
 *
 * This is the single enforcement point for admin-role access. Previously role
 * was only checked in `auth()` (the (admin) layout + a few API routes), leaving
 * most /api/* routes unguarded — a non-admin Supabase session could call them.
 * `/api/workers/*` is exempt: it has its own bearer-token auth (WORKER_AUTH_SECRET)
 * and is called by the worker without a user session.
 */
export async function middleware(request: NextRequest) {
  const { response, user, role } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Worker endpoints authenticate via WORKER_AUTH_SECRET in their own handlers.
  if (path.startsWith("/api/workers")) return response;

  if (path.startsWith("/login")) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", path);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (role !== "admin") {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "forbidden");
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
