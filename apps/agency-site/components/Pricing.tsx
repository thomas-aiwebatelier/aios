const buildIncludes = [
  "Volledig op maat, geen sjabloon",
  "Online in 5 werkdagen: 5 stappen, elke dag één",
  "Code en inhoud volledig van jou",
  "Snel, mobielvriendelijk en met je SEO-basis correct",
  "Wil je bijsturen? Een herzieningsronde kost €100",
];

const maintenanceIncludes = [
  "Hosting op Cloudflare (snel, wereldwijd CDN)",
  "SSL-certificaat automatisch verlengd",
  "Beveiligings- en software-updates",
  "Uptime monitoring 24/7",
  "Tot 1 kleine inhoudswijziging per maand",
  "E-mailsupport binnen 24 uur",
];

export default function Pricing() {
  return (
    <section className="pricing" id="prijzen" aria-label="Prijzen">
      <div className="container">
        <div className="pricing__header">
          <span className="section-eyebrow">Prijzen</span>
          <h2 className="section-title">
            Eén keer bouwen.
            <br />
            <span className="pricing__title-accent">
              Voor altijd zorgeloos.
            </span>
          </h2>
          <p className="section-subtitle">
            Je betaalt eenmalig voor het ontwerp. Wil je bijsturen, dan reken ik
            één vast bedrag per herzieningsronde. Onderhoud is optioneel en
            opzegbaar per maand. Alle prijzen zijn exclusief btw.
          </p>
        </div>

        <div className="pricing__cards">
          <article
            className="pricing__card pricing__card--build"
            aria-label="Eenmalige bouw"
          >
            <div className="pricing__badge">Stap 1 · het ontwerp</div>
            <div className="pricing__amount">
              <span className="pricing__currency">€</span>
              <span className="pricing__price">249</span>
              <span className="pricing__period">eenmalig · excl. btw</span>
            </div>
            <p className="pricing__tagline">
              Ik bouw een eerste versie op basis van research en je merk. Jij
              geeft feedback. Wil je die verwerkt zien, dan kost een
              herzieningsronde <strong>€100</strong>.
            </p>
            <ul
              className="pricing__list"
              aria-label="Inbegrepen bij de bouw"
            >
              {buildIncludes.map((item) => (
                <li key={item} className="pricing__item">
                  <span className="pricing__check" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="btn btn--primary pricing__cta">
              Vraag je site aan
            </a>
            <p className="pricing__note">
              Je betaalt pas wanneer je de eerste versie hebt goedgekeurd.
            </p>
          </article>

          <article
            className="pricing__card pricing__card--maintain"
            aria-label="Onderhoud en hosting (optioneel)"
          >
            <div className="pricing__badge pricing__badge--secondary">
              Stap 2 · zorgeloos online blijven
            </div>
            <div className="pricing__amount">
              <span className="pricing__currency">€</span>
              <span className="pricing__price">9,99</span>
              <span className="pricing__period">
                /maand · of €99,99/jaar · excl. btw
              </span>
            </div>
            <p className="pricing__tagline">
              Ik hou je site snel, veilig en bereikbaar, zodat jij je op je
              zaak kan focussen. Liever zelf hosten? Ook goed. De code is van
              jou.
            </p>
            <ul
              className="pricing__list"
              aria-label="Inbegrepen in onderhoud en hosting"
            >
              {maintenanceIncludes.map((item) => (
                <li key={item} className="pricing__item">
                  <span className="pricing__check" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a href="#contact" className="btn btn--ghost pricing__cta">
              Meer info
            </a>
            <p className="pricing__note">
              Opzegbaar per maand. De code blijft altijd van jou.
            </p>
          </article>
        </div>

        <div className="pricing__total">
          <div className="pricing__total-line">
            <span className="pricing__total-label">
              Ontwerp plus één herzieningsronde:
            </span>
            <span className="pricing__total-value">
              €249 + €100 = <strong>€349</strong> excl. btw
            </span>
          </div>
          <p className="pricing__total-note">
            Of enkel het ontwerp: €249 excl. btw, en je host het zelf. Onderhoud
            en hosting komen daar los bij.
          </p>
        </div>

        <div className="pricing__compare">
          <h3 className="pricing__compare-title">
            Wat anderen vragen voor een vergelijkbare website
          </h3>
          <div className="pricing__compare-grid">
            <div className="pricing__compare-item">
              <span className="pricing__compare-label">
                Webbureau (op maat)
              </span>
              <span className="pricing__compare-price">
                €2.000–€8.000 + €40–€100/mnd
              </span>
            </div>
            <div className="pricing__compare-item">
              <span className="pricing__compare-label">Freelancer</span>
              <span className="pricing__compare-price">
                €1.000–€3.000 + losse facturen
              </span>
            </div>
            <div className="pricing__compare-item pricing__compare-item--ours">
              <span className="pricing__compare-label">AI Web Atelier</span>
              <span className="pricing__compare-price">€349 + €9,99/mnd</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
