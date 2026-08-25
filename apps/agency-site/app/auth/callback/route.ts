import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/url-guard";
import { claimLeadIntents } from "@/lib/lead-intent-actions";

/**
 * Email-confirmation / OAuth code exchange. Supabase redirects here with a
 * `code`; we exchange it for a session and forward to `next` (default /app).
 *
 * Google sign-in lands here too — @supabase/ssr handles PKCE by keeping the
 * code verifier in an HTTP-only cookie, so the same exchange covers both.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next")); // open-redirect guard
  const intent = searchParams.get("intent");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Attach whatever they filled in at the front door to the account it
      // just became. Never block the redirect on this — a failed claim is a
      // reporting gap, not a broken login.
      try {
        await claimLeadIntents(intent ?? undefined);
      } catch {
        /* non-fatal */
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
