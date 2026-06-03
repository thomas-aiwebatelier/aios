import type { CSSProperties } from "react";

const steps = [
  {
    phase: "01",
    label: "Research",
    title: "Ik luister eerst",
    body: "Jij vertelt over je zaak, je klanten en je concurrenten. Ik stel gerichte vragen en bekijk je markt. Eén gesprek van een halfuur volstaat. Voorbereiden hoef je niets.",
    duration: "Dag 1",
  },
  {
    phase: "02",
    label: "Generate",
    title: "AI doet het zware werk",
    body: "Mijn AI-systeem bouwt op basis van je input de structuur, teksten en opmaak van je site. Ik kies de sterkste richting en werk die uit tot een echte eerste versie.",
    duration: "Dag 2",
  },
  {
    phase: "03",
    label: "Review",
    title: "Jij bekijkt de eerste versie",
    body: "Je krijgt een live preview op een tijdelijke link. Klik erdoor, deel met je team, noteer wat je anders wil. Geen druk, geen factuur. Dit is jouw moment.",
    duration: "Dag 3",
  },
  {
    phase: "04",
    label: "Iteratie",
    title: "Eén ronde aanpassingen",
    body: "Je bundelt je feedback en stuurt alles in één keer door. Ik verwerk je aanpassingen aan tekst, stijl of structuur in één iteratie. Daarna is je site af.",
    duration: "Dag 4",
  },
  {
    phase: "05",
    label: "Launch",
    title: "Live op je eigen domein",
    body: "Ik zet je site online op je eigen domein. Met beveiligde verbinding (HTTPS), je SEO correct ingesteld en snelle laadtijden. Klaar voor je eerste bezoekers.",
    duration: "Dag 5",
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
            in 5 werkdagen
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
