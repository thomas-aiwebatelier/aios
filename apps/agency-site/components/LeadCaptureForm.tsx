"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  captureLeadIntent,
  attachLeadIdentity,
  type LeadService,
} from "@/lib/lead-intent-actions";

/**
 * The front-door form, shared by every service page.
 *
 * Two steps on purpose:
 *   1. ask the ONE qualifying thing (website, idea, audit, questionnaire)
 *   2. then ask who you are
 *
 * Splitting it this way converts better than one long form, and — more
 * importantly — step 1 is persisted before step 2 is shown, so someone who
 * bounces at "what's your name" still leaves us a lead.
 *
 * Four bespoke forms would drift, so there is one component and a `service`
 * prop. Keep it that way.
 */

type Props = {
  service: LeadService;
  /** Label above the step-1 field. */
  label: string;
  placeholder?: string;
  /** Free-text (video) vs single line (build) vs no field at all (market). */
  variant?: "url" | "textarea" | "cta";
  ctaLabel: string;
  /** Shown after step 2 succeeds. */
  successTitle?: string;
  successBody?: string;
  /** Send them to signup afterwards (build/video) or just confirm (market). */
  signupAfter?: boolean;
};

export default function LeadCaptureForm({
  service,
  label,
  placeholder,
  variant = "url",
  ctaLabel,
  successTitle = "Bedankt, ik heb je aanvraag.",
  successBody = "Ik neem binnen 24 uur contact op.",
  signupAfter = true,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("service", service);
    fd.set("source_path", window.location.pathname);
    const res = await captureLeadIntent(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setIntentId(res.id);
    setStep(2);
  }

  async function onStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("intent_id", intentId ?? "");
    const res = await attachLeadIdentity(fd);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (signupAfter) {
      // Carry the intent through signup so it can be claimed on the far side.
      router.push(`/login?intent=${encodeURIComponent(res.id)}&next=/app`);
      return;
    }
    setStep(3);
  }

  if (step === 3) {
    return (
      <div className="leadcap leadcap--done" role="status" aria-live="polite">
        <h3 className="leadcap__title">{successTitle}</h3>
        <p className="leadcap__body">{successBody}</p>
      </div>
    );
  }

  return (
    <div className="leadcap">
      {step === 1 ? (
        <form className="leadcap__form" onSubmit={onStep1} noValidate>
          {variant !== "cta" && (
            <label className="leadcap__label" htmlFor={`leadcap-${service}`}>
              {label}
            </label>
          )}

          {variant === "url" && (
            <input
              id={`leadcap-${service}`}
              name="url"
              // Deliberately NOT type="url": that rejects "facebook.com/mijnzaak"
              // and bare domains, which is most of who we want.
              type="text"
              inputMode="url"
              autoComplete="url"
              className="leadcap__input"
              placeholder={placeholder}
              required
            />
          )}

          {variant === "textarea" && (
            <textarea
              id={`leadcap-${service}`}
              name="idea"
              rows={4}
              className="leadcap__input leadcap__input--area"
              placeholder={placeholder}
              required
            />
          )}

          {/* Honeypot — hidden from people, irresistible to bots. */}
          <div className="leadcap__hp" aria-hidden="true">
            <label htmlFor={`company-website-${service}`}>Laat dit veld leeg</label>
            <input
              id={`company-website-${service}`}
              name="company_website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <button type="submit" className="btn btn--primary leadcap__btn" disabled={busy}>
            {busy ? "Even geduld…" : ctaLabel}
          </button>
        </form>
      ) : (
        <form className="leadcap__form leadcap__form--who" onSubmit={onStep2} noValidate>
          <p className="leadcap__step">Bijna klaar — hoe mag ik je bereiken?</p>
          <div className="leadcap__row">
            <input
              name="first_name"
              type="text"
              autoComplete="given-name"
              className="leadcap__input"
              placeholder="Voornaam"
              required
            />
            <input
              name="last_name"
              type="text"
              autoComplete="family-name"
              className="leadcap__input"
              placeholder="Achternaam"
              required
            />
          </div>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="leadcap__input"
            placeholder="E-mailadres"
            required
          />
          <button type="submit" className="btn btn--primary leadcap__btn" disabled={busy}>
            {busy ? "Even geduld…" : "Verstuur"}
          </button>
        </form>
      )}

      {error ? (
        <p className="leadcap__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
