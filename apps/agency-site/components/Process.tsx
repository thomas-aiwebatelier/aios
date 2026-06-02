import type { CSSProperties } from "react";

const steps = [
  {
    phase: "01",
    label: "Research",
    title: "We luisteren eerst",
    body: "U vertelt ons over uw bedrijf, uw doelgroep en uw concurrenten. We stellen gerichte vragen en analyseren uw markt. Dit duurt één gesprek van 30 minuten — u hoeft niets voor te bereiden.",
    duration: "Dag 1",
  },
  {
    phase: "02",
    label: "Generate",
    title: "AI doet het zware werk",
    body: "Ons AI-systeem genereert op basis van uw input de volledige websitestructuur, teksten en opmaak. We sturen meerdere varianten en kiezen samen de beste richting.",
    duration: "Dag 2–3",
  },
  {
    phase: "03",
    label: "Review",
    title: "U bekijkt de eerste versie",
    body: "U krijgt een live preview op een tijdelijke URL. Klik door, deel met uw team, noteer wat u anders wilt. Geen druk, geen factuur — dit is uw MVP-moment.",
    duration: "Dag 4",
  },
  {
    phase: "04",
    label: "Iteratie",
    title: "Eén ronde aanpassingen",
    body: "U stuurt uw feedback in één keer. Wij verwerken alle aanpassingen aan inhoud, stijl of structuur in één iteratie. Daarna is de website af.",
    duration: "Dag 5–6",
  },
  {
    phase: "05",
    label: "Launch",
    title: "Live op uw domein",
    body: "We publiceren uw website op uw eigen domein. Inclusief beveiligde verbinding (HTTPS), correcte SEO-instellingen en snelle laadtijden. U lanceert met vertrouwen.",
    duration: "Dag 7",
  },
];

export default function Process() {
  return (
    <section className="process" id="werkwijze" aria-label="Onze werkwijze">
      <div className="container">
        <div className="process__header">
          <span className="section-eyebrow">Onze werkwijze</span>
          <h2 className="section-title">
            Van gesprek tot live
            <br />
            in 7 dagen
          </h2>
        </div>
        <div className="process__timeline" role="list">
          {steps.map((step, i) => (
            <div
              key={step.phase}
              className="process__item"
              role="listitem"
              style={{ "--i": i } as CSSProperties}
            >
              <div className="process__left">
                <div className="process__phase">{step.phase}</div>
                <div className="process__connector" aria-hidden="true" />
              </div>
              <div className="process__right">
                <div className="process__meta">
                  <span className="process__label">{step.label}</span>
                  <span className="process__duration">{step.duration}</span>
                </div>
                <h3 className="process__title">{step.title}</h3>
                <p className="process__body">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
