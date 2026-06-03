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
            Een website op maat voor jouw zaak, gebouwd met AI.{" "}
            <strong>€499 voor de bouw</strong>, inclusief één iteratieronde na
            je eerste review. Wil je er niet meer naar omkijken? Dan host en
            onderhoud ik hem voor <strong>€9,99/maand</strong>.
          </p>
          <div className="hero__ctas">
            <a href="#contact" className="btn btn--primary">
              Vraag je site aan <span className="hero__arr">→</span>
            </a>
            <a href="#werkwijze" className="btn btn--ghost">
              Hoe het werkt
            </a>
          </div>
          <p className="hero__trust">
            Online in <strong>5 werkdagen</strong> · je bezit de volledige code
          </p>
        </div>
      </div>
    </section>
  );
}
