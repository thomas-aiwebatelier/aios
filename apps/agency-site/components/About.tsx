export default function About() {
  return (
    <section className="about" id="over-ons" aria-label="Over AI Web Atelier">
      <div className="container about__inner">
        <div className="about__photo-wrap" aria-hidden="true">
          <div className="about__photo-bg">
            <div className="about__photo-placeholder">
              {/* Thomas can replace this with a real photo at public/images/thomas.jpg */}
              <svg
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="100" cy="78" r="42" fill="rgba(201,169,110,0.3)" />
                <ellipse
                  cx="100"
                  cy="175"
                  rx="68"
                  ry="45"
                  fill="rgba(201,169,110,0.2)"
                />
              </svg>
              <span className="about__photo-initials">TC</span>
            </div>
          </div>
          <div className="about__photo-accent" aria-hidden="true">
            <span>Antwerpen</span>
            <span>AI Engineer</span>
          </div>
        </div>
        <div className="about__content">
          <span className="section-eyebrow">Over de maker</span>
          <h2 className="section-title about__title">Hallo, ik ben Thomas</h2>
          <p className="about__lead">
            Als AI-engineer bij <strong>Streamz</strong> in Antwerpen werk ik
            dagelijks met de nieuwste AI-technologie. In mijn vrije tijd help
            ik Belgische ondernemers met een professionele website — zonder het
            prijskaartje van een groot bureau.
          </p>
          <p className="about__body">
            Ik zag te veel lokale zelfstandigen die werkten met een verouderde
            of geen website, simpelweg omdat een professionele oplossing
            onbetaalbaar leek. Met de juiste AI-tools kan ik vandaag een
            website bouwen die vroeger €3.000 zou hebben gekost — en dat voor
            €499.
          </p>
          <p className="about__body">
            Het resultaat is kwalitatief hoog: unieke teksten, een eigen
            ontwerp, correct SEO-ingesteld en snel. Geen standaard template.
            Geen automatisch gegenereerde rommel. Vakwerk, versneld door
            technologie.
          </p>
          <div className="about__tags" aria-label="Expertises">
            <span className="about__tag">AI Engineering</span>
            <span className="about__tag">Webontwikkeling</span>
            <span className="about__tag">UX Design</span>
            <span className="about__tag">Antwerpen</span>
          </div>
        </div>
      </div>
    </section>
  );
}
