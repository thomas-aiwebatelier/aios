"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/url-guard";
import { claimLeadIntents } from "@/lib/lead-intent-actions";

export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next")); // open-redirect guard
  // Set when the visitor arrived from a front-door capture form. Carried
  // through the OAuth round-trip so the intent can be claimed on the far side.
  const intent = params.get("intent") ?? "";

  /** Where Supabase sends the browser back after email confirm or OAuth. */
  function callbackUrl(): string {
    const qs = new URLSearchParams({ next });
    if (intent) qs.set("intent", intent);
    return `${location.origin}/auth/callback?${qs.toString()}`;
  }

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl(),
        },
      });
      setBusy(false);
      if (error) {
        setMsg(error.message);
      } else if (data.session) {
        // Email confirmation is off → already signed in; go straight in.
        await claimLeadIntents(intent || undefined);
        router.push(next);
      } else {
        // Confirmation required → no session yet.
        setMsg("Bijna klaar — check je mailbox om je account te bevestigen.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        setMsg(error.message);
      } else {
        await claimLeadIntents(intent || undefined);
        router.push(next);
      }
    }
  }

  /**
   * Google sign-in. @supabase/ssr runs the PKCE flow and stashes the code
   * verifier in an HTTP-only cookie; /auth/callback already exchanges the code
   * for a session, so there is nothing else to wire up here.
   */
  async function onGoogle() {
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser navigates away, so this only runs on failure.
    if (error) {
      setBusy(false);
      setMsg(error.message);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <button
        type="button"
        className="btn btn--ghost auth-google"
        onClick={onGoogle}
        disabled={busy}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
          <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
          <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
        </svg>
        Verder met Google
      </button>

      <div className="auth-divider" role="separator">
        <span>of met e-mail</span>
      </div>

      <label className="auth-field">
        <span>E-mail</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="auth-field">
        <span>Wachtwoord</span>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>

      <button type="submit" className="btn btn--primary" disabled={busy}>
        {busy ? "Even geduld…" : mode === "signin" ? "Inloggen" : "Account aanmaken"}
      </button>

      {msg && <p className="auth-msg">{msg}</p>}

      <p className="auth-switch">
        {mode === "signin" ? (
          <>
            Nog geen account?{" "}
            <button type="button" onClick={() => setMode("signup")}>
              Maak er een aan
            </button>
          </>
        ) : (
          <>
            Heb je al een account?{" "}
            <button type="button" onClick={() => setMode("signin")}>
              Inloggen
            </button>
          </>
        )}
      </p>
    </form>
  );
}
