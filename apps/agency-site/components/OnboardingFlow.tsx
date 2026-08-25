"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { attachLeadIdentity, claimLeadIntents } from "@/lib/lead-intent-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Step two of the front door, on its own route.
 *
 * The service page took the one qualifying answer and wrote it to
 * `lead_intents`; this asks who you are and turns you into an account, which is
 * what unlocks the portal.
 *
 * Two screens, not one form: name + e-mail first (that alone is a lead we can
 * act on), then the password. Someone who stops after screen one has still told
 * us how to reach them, and the intent row is already updated.
 */

const HEADLINE: Record<string, string> = {
  build: "Je site-aanvraag staat klaar",
  video: "Je video-aanvraag staat klaar",
  market: "Je audit-aanvraag staat klaar",
  educate: "Je aanvraag staat klaar",
};

export default function OnboardingFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent") ?? "";
  const service = params.get("service") ?? "build";

  const [screen, setScreen] = useState<"who" | "account">("who");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Where Supabase sends the browser back after e-mail confirm or OAuth. */
  function callbackUrl(): string {
    const qs = new URLSearchParams({ next: "/app" });
    if (intent) qs.set("intent", intent);
    return `${location.origin}/auth/callback?${qs.toString()}`;
  }

  async function onWho(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("intent_id", intent);
    const res = await attachLeadIdentity(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEmail(String(fd.get("email") ?? ""));
    setScreen("account");
  }

  async function onAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      // E-mail confirmation is off → already signed in.
      await claimLeadIntents(intent || undefined);
      router.push("/app");
      return;
    }
    setNotice("Bijna klaar — check je mailbox om je account te bevestigen.");
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    // On success the browser navigates away, so this only runs on failure.
    if (err) {
      setBusy(false);
      setError(err.message);
    }
  }

  if (notice) {
    return (
      <div className="onb" role="status" aria-live="polite">
        <h1 className="onb__title">{notice}</h1>
        <p className="onb__lead">
          Zodra je bevestigt, kom je in je portaal en zie je daar de voortgang.
        </p>
      </div>
    );
  }

  return (
    <div className="onb">
      <p className="section-eyebrow">{HEADLINE[service] ?? HEADLINE.build}</p>

      {screen === "who" ? (
        <>
          <h1 className="onb__title">Hoe mag ik je bereiken?</h1>
          <p className="onb__lead">
            Ik neem binnen 24 uur contact op met je eerste ontwerp.
          </p>
          <form className="onb__form" onSubmit={onWho} noValidate>
            <div className="onb__row">
              <input
                name="first_name"
                type="text"
                autoComplete="given-name"
                className="onb__input"
                placeholder="Voornaam"
                aria-label="Voornaam"
                required
              />
              <input
                name="last_name"
                type="text"
                autoComplete="family-name"
                className="onb__input"
                placeholder="Achternaam"
                aria-label="Achternaam"
                required
              />
            </div>
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="onb__input"
              placeholder="E-mailadres"
              aria-label="E-mailadres"
              required
            />
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Even geduld…" : "Verder"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h1 className="onb__title">Kies een wachtwoord</h1>
          <p className="onb__lead">
            Daarmee kom je in je portaal, waar je de voortgang van je aanvraag
            volgt en je opgeleverde werk terugvindt.
          </p>
          <form className="onb__form" onSubmit={onAccount} noValidate>
            <input
              type="email"
              className="onb__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              aria-label="E-mailadres"
              required
            />
            <input
              type="password"
              className="onb__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wachtwoord (min. 6 tekens)"
              aria-label="Wachtwoord"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Even geduld…" : "Maak mijn account"}
            </button>
          </form>

          <div className="onb__divider" role="separator">
            <span>of</span>
          </div>
          <button
            type="button"
            className="btn btn--ghost onb__google"
            onClick={onGoogle}
            disabled={busy}
          >
            Verder met Google
          </button>
        </>
      )}

      {error ? (
        <p className="onb__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
