export default function Hero() {
  return (
    <section className="hero" aria-label="Introductie">
      <div className="hero__mesh" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__eyebrow">AI Web Atelier</p>
          <h1 className="hero__title">
            Vakwerk websites,
            <br />
            <span className="hero__title--accent">gebouwd met AI</span>
          </h1>
          <p className="hero__tagline">
            Custom websites voor Belgische ondernemers.{" "}
            <strong>€499 voor de bouw</strong> — inclusief één iteratieronde na
            uw eerste review. Optioneel <strong>€9,99/maand</strong> voor
            zorgeloos hosting en onderhoud.
          </p>
          <div className="hero__ctas">
            <a href="#contact" className="btn btn--primary">
              Vraag jouw voorbeeld aan
            </a>
            <a href="#wat-we-doen" className="btn btn--ghost">
              Hoe het werkt
            </a>
          </div>
        </div>
        <div className="hero__visual" aria-hidden="true">
          <div className="hero__card">
            <div className="hero__card-row">
              <div className="hero__card-amount">
                <span className="hero__card-currency">€</span>
                <span className="hero__card-price">499</span>
              </div>
              <span className="hero__card-period">eenmalig</span>
            </div>
            <div className="hero__card-divider" />
            <div className="hero__card-row hero__card-row--sub">
              <div className="hero__card-amount hero__card-amount--sub">
                <span className="hero__card-currency hero__card-currency--sub">
                  €
                </span>
                <span className="hero__card-price hero__card-price--sub">
                  9,99
                </span>
              </div>
              <span className="hero__card-period">/maand · optioneel</span>
            </div>
            <div className="hero__card-lines">
              <span />
              <span />
              <span />
            </div>
            <div className="hero__card-footer">Online binnen 7 dagen</div>
          </div>
        </div>
      </div>
      <div className="hero__scroll-hint" aria-hidden="true">
        <span className="hero__scroll-line" />
        <span className="hero__scroll-label">scroll</span>
      </div>
    </section>
  );
}
