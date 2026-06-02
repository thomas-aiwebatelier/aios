export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer" aria-label="Paginavoettekst">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__col footer__col--brand">
            <a href="/" className="footer__logo" aria-label="AI Web Atelier — homepage">
              <span className="footer__logo-text">AI Web Atelier</span>
            </a>
            <p className="footer__tagline">Vakwerk websites, gebouwd met AI</p>
            <p className="footer__location">Antwerpen, België</p>
          </div>

          <nav className="footer__col" aria-label="Navigatielinks">
            <h3 className="footer__col-title">Informatie</h3>
            <ul className="footer__links">
              <li><a href="/#wat-we-doen" className="footer__link">Wat we doen</a></li>
              <li><a href="/#werkwijze" className="footer__link">Werkwijze</a></li>
              <li><a href="/#prijzen" className="footer__link">Prijzen</a></li>
              <li><a href="/#over-ons" className="footer__link">Over ons</a></li>
              <li><a href="/#contact" className="footer__link">Contact</a></li>
              <li><a href="/privacy" className="footer__link">Privacyverklaring</a></li>
              <li><a href="/terms" className="footer__link">Gebruiksvoorwaarden</a></li>
              <li>
                <a
                  href="mailto:thomas@aiwebatelier.com"
                  className="footer__link footer__link--email"
                >
                  thomas@aiwebatelier.com
                </a>
              </li>
            </ul>
          </nav>

          <div className="footer__col">
            <h3 className="footer__col-title">Volg ons</h3>
            <ul className="footer__socials">
              <li>
                <a
                  href="https://linkedin.com/in/thomas-cortebeeck"
                  className="footer__social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn profiel van Thomas Cortebeeck"
                >
                  <svg
                    className="footer__social-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
                  </svg>
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/thomas-cortebeeck"
                  className="footer__social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub profiel van Thomas Cortebeeck"
                >
                  <svg
                    className="footer__social-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  GitHub
                </a>
              </li>
            </ul>
            <div className="footer__imprint">
              <p>
                <strong>AI Web Atelier</strong>
                <br />
                Eenmanszaak — Thomas Cortebeeck
                <br />
                Antwerpen, België
              </p>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <div className="footer__copyright">
            <p>
              © {year} AI Web Atelier — vakwerk websites, gebouwd met AI —
              Antwerpen, België
            </p>
          </div>
          <div className="footer__gdpr">
            <p>
              Wenst u uw gegevens te laten verwijderen? Antwoord met{" "}
              <em>&apos;uitschrijven&apos;</em> op een van onze mails of stuur
              een verzoek naar{" "}
              <a href="mailto:thomas@aiwebatelier.com">
                thomas@aiwebatelier.com
              </a>
              . Meer info in onze <a href="/privacy">privacyverklaring</a>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
