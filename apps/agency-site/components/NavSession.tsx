"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * The two nav links that depend on who is asking: "Portaal" for anyone signed
 * in, and the admin-only "Consulting" tab.
 *
 * Deliberately a client component. Reading the session on the server would make
 * every marketing page dynamic — the homepage, all five service pages and the
 * blog stop being prerendered, for two links almost nobody sees. So the shell
 * stays static and this fills itself in after hydration.
 *
 * This is presentation, never protection: the Consulting pages are 404'd for
 * non-admins in middleware.ts, so faking `isAdmin` in devtools buys a dead link.
 */
export default function NavSession() {
  const [state, setState] = useState<{ signedIn: boolean; isAdmin: boolean }>({
    signedIn: false,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setState({ signedIn: true, isAdmin: data?.role === "admin" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state.signedIn) return null;
  return (
    <>
      {state.isAdmin && (
        <a href="/diensten/educate" className="nav__link--admin">
          Consulting
        </a>
      )}
      <a href="/app">Portaal</a>
    </>
  );
}
