const cards = [
  {
    number: "01",
    title: "Onderzoek + design",
    body: "We starten met een gesprek over uw bedrijf, uw klanten en uw doelen. Daarna analyseren we uw sector en maken we een visuele richting klaar — kleurenpalet, typografie, structuur. U krijgt een preview vóór we iets bouwen.",
    icon: "🔍",
  },
  {
    number: "02",
    title: "AI-generatie",
    body: "Op basis van uw feedback genereert ons AI-systeem de volledige website: teksten, opmaak en code. Wat vroeger weken duurde, is nu klaar op enkele dagen. Het resultaat is uniek, op maat en professioneel afgewerkt.",
    icon: "⚡",
  },
  {
    number: "03",
    title: "Lancering + bijsturing",
    body: "We publiceren uw site op uw eigen domein. Daarna mag u één herzieningsronde aanvragen: aanpassingen aan teksten, kleuren of structuur. We sturen bij tot u tevreden bent. Online, klaar voor klanten.",
    icon: "🚀",
  },
];

export default function WhatWeDo() {
  return (
    <section className="what" id="wat-we-doen" aria-label="Wat we doen">
      <div className="container what__inner">
        <div className="what__header">
          <span className="section-eyebrow">Wat we doen</span>
          <h2 className="section-title">
            Uw professionele website
            <br />
            in drie stappen
          </h2>
          <p className="section-subtitle">
            Geen technische kennis nodig. U levert de informatie — wij bouwen de
            rest.
          </p>
        </div>
        <div className="what__cards">
          {cards.map((card) => (
            <article key={card.number} className="card">
              <div className="card__number">{card.number}</div>
              <div className="card__icon" aria-hidden="true">
                {card.icon}
              </div>
              <h3 className="card__title">{card.title}</h3>
              <p className="card__body">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
