"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { captureLeadIntent } from "@/lib/lead-intent-actions";
import type { LeadService } from "@/lib/lead-services";

/**
 * The front door, at the top of every service page.
 *
 * It asks ONE thing — your link, your idea, "audit me" — writes it down, and
 * hands off to /onboarding for name, e-mail and an account.
 *
 * The write happens BEFORE the handoff on purpose. The build page used to pass
 * the URL along in a querystring, so anyone who hesitated at signup vanished
 * without a trace. Now an abandoned onboarding still leaves a row worth a
 * follow-up.
 *
 * Four bespoke forms would drift, so there is one component and a `service`
 * prop. Keep it that way.
 */

type Props = {
  service: LeadService;
  /** Label above the field. */
  label: string;
  placeholder?: string;
  /** Free-text (video) vs single line (build) vs no field at all (market). */
  variant?: "url" | "textarea" | "cta";
  ctaLabel: string;
};

export default function LeadCaptureForm({
  service,
  label,
  placeholder,
  variant = "url",
  ctaLabel,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("service", service);
    fd.set("source_path", window.location.pathname);
    const res = await captureLeadIntent(fd);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      return;
    }
    // Stay busy through the navigation — re-enabling the button here just
    // invites a second submit while the router is still moving.
    const qs = new URLSearchParams({ intent: res.id, service });
    router.push(`/onboarding?${qs.toString()}`);
  }

  return (
    <div className="leadcap">
      <form className="leadcap__form" onSubmit={onSubmit} noValidate>
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

      {error ? (
        <p className="leadcap__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
