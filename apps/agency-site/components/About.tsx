import HandWritingText from "@/components/HandWritingText";

export default function About() {
  return (
    <section className="about" id="over-ons" aria-label="Over AI Web Atelier">
      <div className="container about__inner">
        <div className="about__photo-wrap">
          <div className="about__photo-bg">
            <img
              className="about__photo-img"
              src="/images/thomas.png"
              alt="Thomas Cortebeeck, oprichter van AI Web Atelier"
              width={600}
              height={800}
            />
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
            Overdag werk ik als AI-engineer bij <strong>Streamz</strong> in
            Antwerpen, dagelijks met de nieuwste AI-technologie. Daarbuiten help
            ik Belgische ondernemers aan een degelijke website, zonder het
            prijskaartje van een groot bureau.
          </p>
          <p className="about__body">
            Ik zag te veel zelfstandigen vastzitten met een verouderde site of
            helemaal geen, gewoon omdat een fatsoenlijke oplossing onbetaalbaar
            leek. Met de juiste AI-tools bouw ik vandaag een website die vroeger
            €3.000 kostte. Bij mij betaal je €249.
          </p>
          <p className="about__body">
            En dat zonder in te boeten op kwaliteit: eigen teksten, een eigen
            ontwerp, je SEO goed gezet en snel. Geen sjabloon, geen
            AI-rommel die je zo herkent. Vakwerk, versneld door technologie.
          </p>
          <div className="about__tags" aria-label="Expertises">
            <span className="about__tag">AI Engineering</span>
            <span className="about__tag">Webontwikkeling</span>
            <span className="about__tag">UX Design</span>
            <span className="about__tag">Antwerpen</span>
          </div>
          <HandWritingText as="p" text="— Thomas" className="about__signature" />
        </div>
      </div>
    </section>
  );
}
