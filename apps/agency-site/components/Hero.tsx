export default function Hero() {
  return (
    <section className="hero" aria-label="Introductie">
      <div className="hero__glow" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="hero__content">
          <p className="hero__eyebrow">
            <span className="hero__dot" aria-hidden="true" />
            Atelier · Antwerpen
          </p>
          <h1 className="hero__title">
            <span className="hw hw--1 hero__title-accent">
              Vakwerk
              <svg
                className="hero__underline"
                viewBox="0 0 200 14"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="hero__underline-path"
                  d="M2 9 C50 2 150 2 198 8"
                  stroke="#C97B4A"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </span>{" "}
            <span className="hw hw--2">websites,</span>{" "}
            <span className="hw hw--3">gebouwd</span>{" "}
            <span className="hw hw--4">met</span>{" "}
            <span className="hw hw--5">AI.</span>
          </h1>
          <p className="hero__tagline">
            Custom websites voor Belgische ondernemers.{" "}
            <strong>€499 voor de bouw</strong> — inclusief één iteratieronde na
            uw eerste review. Optioneel <strong>€9,99/maand</strong> voor
            zorgeloos hosting en onderhoud.
          </p>
          <div className="hero__ctas">
            <a href="#contact" className="btn btn--primary">
              Vraag jouw voorbeeld aan <span className="hero__arr">→</span>
            </a>
            <a href="#wat-we-doen" className="btn btn--ghost">
              Hoe het werkt
            </a>
          </div>
          <p className="hero__trust">
            Online binnen <strong>7 werkdagen</strong> · u bezit de volledige code
          </p>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__media">
            <video
              className="hero__video"
              autoPlay
              muted
              loop
              playsInline
              poster="/video-poster.png"
            >
              <source src="/video_logo.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="hero__badge">
            <span className="hero__badge-dot" /> Online binnen 7 dagen
          </div>
        </div>
      </div>
    </section>
  );
}
