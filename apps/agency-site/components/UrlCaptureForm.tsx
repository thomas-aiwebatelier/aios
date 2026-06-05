"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Public self-serve entry: capture the visitor's website URL and route to the
 * product module. If they're not signed in, middleware bounces them to /login
 * with `next` pointing back here (signup-first) — no compute runs until auth.
 */
export default function UrlCaptureForm({
  product,
  cta,
}: {
  product: "build" | "market" | "operate";
  cta: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    router.push(`/app/${product}?url=${encodeURIComponent(url.trim())}`);
  }

  return (
    <form className="urlcap" onSubmit={onSubmit}>
      <input
        type="url"
        required
        placeholder="https://jouwwebsite.be"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        aria-label="Je website-URL"
        className="urlcap__input"
      />
      <button type="submit" className="btn btn--primary urlcap__btn" disabled={busy}>
        {busy ? "Even geduld…" : cta}
      </button>
    </form>
  );
}
