import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Refreshes the Supabase auth session on every request and returns the user.
 * Follows the official @supabase/ssr middleware pattern: the response is
 * rebuilt whenever auth cookies are set, so refreshed tokens propagate.
 *
 * IMPORTANT: do not run logic between createServerClient and getUser().
 */
export async function updateSession(request: NextRequest, resolveRole = false) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role costs an extra query, so it is opt-in per request. Only the hidden
  // admin-only routes need it — every public marketing page would otherwise pay
  // for a profiles lookup it never reads.
  let role: string | null = null;
  if (user && resolveRole) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (data?.role as string | undefined) ?? null;
  }

  return { response, user, role };
}
