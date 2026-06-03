const cards = [
  {
    number: "01",
    title: "Onderzoek en design",
    body: "Ik begin met een gesprek over je zaak, je klanten en wat je wil bereiken. Daarna bekijk ik je sector en zet ik een visuele richting klaar: kleuren, typografie, structuur. Je ziet de aanpak voor er iets gebouwd wordt.",
    icon: "🔍",
  },
  {
    number: "02",
    title: "AI doet de bouw",
    body: "Op basis van die input bouwt mijn AI-systeem de volledige website: teksten, opmaak en code. Wat vroeger weken kostte, staat nu in enkele dagen klaar. Op maat, geen sjabloon, netjes afgewerkt.",
    icon: "⚡",
  },
  {
    number: "03",
    title: "Live en bijgestuurd",
    body: "Ik zet je site online op je eigen domein. Daarna krijg je één iteratieronde: aanpassingen aan teksten, kleuren of structuur, alles in één keer. Ik stuur bij tot het klopt. Klaar voor je klanten.",
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
            Een website waar je trots op bent
            <br />
            in drie stappen
          </h2>
          <p className="section-subtitle">
            Geen technische kennis nodig. Jij levert de info, ik bouw de rest.
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
