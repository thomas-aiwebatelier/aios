"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/url-guard";

export default function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next")); // open-redirect guard

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
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setBusy(false);
      if (error) {
        setMsg(error.message);
      } else if (data.session) {
        // Email confirmation is off → already signed in; go straight in.
        router.push(next);
      } else {
        // Confirmation required → no session yet.
        setMsg("Bijna klaar — check je mailbox om je account te bevestigen.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setMsg(error.message);
      else router.push(next);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
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
