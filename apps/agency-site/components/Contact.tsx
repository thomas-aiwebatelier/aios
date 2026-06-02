"use client";

import { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value.trim();
    const message = (
      form.elements.namedItem("message") as HTMLTextAreaElement
    )?.value.trim();

    if (!name || !email || !message) return;

    setBusy(true);

    const subject = encodeURIComponent("Aanvraag via aiwebatelier.com");
    const body = encodeURIComponent(
      `Naam: ${name}\nE-mail: ${email}\n\nBericht:\n${message}`
    );
    const mailtoUrl = `mailto:thomas@aiwebatelier.com?subject=${subject}&body=${body}`;

    window.location.href = mailtoUrl;

    setTimeout(() => {
      setSubmitted(true);
    }, 600);
  }

  return (
    <section className="contact" id="contact" aria-label="Neem contact op">
      <div className="container">
        <div className="contact__header">
          <span className="section-eyebrow">Contact</span>
          <h2 className="section-title">Vraag jouw voorbeeld aan</h2>
          <p className="section-subtitle">
            Vertel ons iets over uw bedrijf. We sturen u binnen 24 uur een
            gratis voorbeeld terug — geen verplichtingen.
          </p>
        </div>
        <div className="contact__wrap">
          {!submitted ? (
            <form
              className="contact__form"
              onSubmit={handleSubmit}
              noValidate
              aria-label="Contactformulier"
            >
              <div className="form__group">
                <label className="form__label" htmlFor="contact-name">
                  Uw naam
                </label>
                <input
                  className="form__input"
                  type="text"
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  placeholder="Jan Janssen"
                  required
                />
              </div>
              <div className="form__group">
                <label className="form__label" htmlFor="contact-email">
                  E-mailadres
                </label>
                <input
                  className="form__input"
                  type="email"
                  id="contact-email"
                  name="email"
                  autoComplete="email"
                  placeholder="jan@uwbedrijf.be"
                  required
                />
              </div>
              <div className="form__group">
                <label className="form__label" htmlFor="contact-message">
                  Vertel ons over uw bedrijf
                </label>
                <textarea
                  className="form__input form__textarea"
                  id="contact-message"
                  name="message"
                  rows={5}
                  placeholder="Mijn bedrijf doet... Ik zoek een website voor... Mijn doelgroep is..."
                  required
                />
              </div>
              <div className="form__footer">
                <button
                  className="btn btn--primary form__submit"
                  type="submit"
                  disabled={busy}
                >
                  <span className="submit__text">
                    {busy ? "Openen…" : "Stuur aanvraag"}
                  </span>
                  <span className="submit__icon" aria-hidden="true">
                    →
                  </span>
                </button>
                <p className="form__privacy">
                  Uw gegevens worden uitsluitend gebruikt om uw aanvraag te
                  beantwoorden. Zie onze{" "}
                  <a href="/privacy">privacyverklaring</a>.
                </p>
              </div>
            </form>
          ) : (
            <div className="contact__confirm" aria-live="polite">
              <div className="confirm__icon" aria-hidden="true">
                ✓
              </div>
              <h3 className="confirm__title">Bedankt!</h3>
              <p className="confirm__body">
                Uw e-mailprogramma is geopend met een bericht klaar voor
                verzending. Stuur het op en we antwoorden u binnen 24 uur.
              </p>
              <p className="confirm__note">
                E-mailprogramma niet geopend?{" "}
                <a
                  href="mailto:thomas@aiwebatelier.com"
                  className="confirm__link"
                >
                  Stuur direct een mail
                </a>
              </p>
            </div>
          )}
          <div className="contact__info">
            <h3 className="contact__info-title">Of schrijf ons rechtstreeks</h3>
            <a
              href="mailto:thomas@aiwebatelier.com"
              className="contact__email"
            >
              thomas@aiwebatelier.com
            </a>
            <p className="contact__location">
              <strong>AI Web Atelier</strong>
              <br />
              Antwerpen, België
            </p>
            <div className="contact__guarantee">
              <span className="contact__guarantee-icon" aria-hidden="true">
                🛡
              </span>
              <div>
                <strong>Geen betaling vooraf</strong>
                <p>U betaalt pas nadat u de preview heeft goedgekeurd.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
