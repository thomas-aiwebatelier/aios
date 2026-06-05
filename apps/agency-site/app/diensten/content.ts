export type FaqItem = { q: string; a: string };
export type ProcessStep = { label: string; title: string; body: string };

export type ServiceContent = {
  slug: "build" | "market" | "operate" | "educate";
  icon: "websites" | "consultancy" | "marketing" | "os";
  navTitle: string;
  title: string;
  eyebrow: string;
  heroLead: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  intro: string;
  problemTitle: string;
  problemBody: string;
  solutionTitle: string;
  solutionBody: string;
  includesTitle: string;
  includes: string[];
  process: ProcessStep[];
  faq: FaqItem[];
  ctaTitle: string;
  ctaBody: string;
  ctaLabel: string;
  ctaHref: string;
  seoTitle: string;
  seoDescription: string;
};

export const services: ServiceContent[] = [
  {
    slug: "build",
    icon: "websites",
    navTitle: "Build",
    title: "Een website op maat, gebouwd met AI",
    eyebrow: "Build",
    heroLead:
      "Ik bouw je site met AI: op maat, geen sjabloon, online in 5 werkdagen. Eén vaste prijs van €499 en je weet vooraf precies wat je krijgt.",
    heroCtaLabel: "Vraag je site aan",
    heroCtaHref: "/#contact",
    intro:
      "Een website op maat, met AI gebouwd, online in 5 werkdagen voor €499.",
    problemTitle: "Waarom je nog geen deftige site hebt",
    problemBody:
      "Je bent zelfstandig of runt een kleine zaak en je site is al jaren een losse eindje. Een bureau vraagt €3.000 en drie maanden, een sjabloonbouwer levert iets dat eruitziet als duizend andere. Ondertussen sturen klanten je naar je Instagram omdat ze online niets degelijks vinden. Je weet dat het beter kan, maar de drempel blijft te hoog.",
    solutionTitle: "Hoe ik het oplos",
    solutionBody:
      "Ik gebruik AI om je site écht op maat te bouwen, niet om een template in te vullen. Jij levert je verhaal en je foto’s aan, ik genereer en verfijn elke pagina tot ze klopt voor jouw zaak. Vijf werkdagen, vijf stappen, elke dag één. Na de eerste oplevering krijg je één iteratieronde om alles bij te sturen. De code is van jou en je betaalt één vaste prijs.",
    includesTitle: "Wat je krijgt",
    includes: [
      "Een website op maat, geen sjabloon, in jouw huisstijl",
      "Vaste prijs van €499 eenmalig voor de bouw",
      "Online in 5 werkdagen, één stap per dag",
      "Eén iteratieronde na de eerste oplevering",
      "De volledige code is van jou, geen lock-in",
      "Optioneel onderhoud en hosting voor €9,99/maand of €99/jaar",
    ],
    process: [
      {
        label: "Stap 1",
        title: "Intake",
        body: "Je stuurt me je verhaal, je foto’s en wat je site moet doen, en ik zet de structuur op.",
      },
      {
        label: "Stap 2",
        title: "Ontwerp",
        body: "Ik genereer het ontwerp en de huisstijl met AI en stem ze af op jouw zaak.",
      },
      {
        label: "Stap 3",
        title: "Tekst",
        body: "Ik schrijf en verfijn de teksten zodat bezoekers meteen snappen wat je doet.",
      },
      {
        label: "Stap 4",
        title: "Bouwen",
        body: "Ik zet alle pagina’s in elkaar, koppel je formulieren en maak alles mobielklaar.",
      },
      {
        label: "Stap 5",
        title: "Online",
        body: "Je site gaat live en je krijgt één iteratieronde om de laatste dingen bij te sturen.",
      },
    ],
    faq: [
      {
        q: "Wat kost het precies?",
        a: "€499 eenmalig voor de bouw op maat. Onderhoud en hosting zijn optioneel: €9,99 per maand of €99 per jaar. Wil je zelf hosten, dan betaal je enkel die €499.",
      },
      {
        q: "Is 5 werkdagen niet te snel?",
        a: "Het werkt omdat het in vijf duidelijke stappen zit, één per dag. Jij levert op tijd je input en ik bouw met AI veel sneller dan een klassiek bureau.",
      },
      {
        q: "Is dit een sjabloon?",
        a: "Nee. Ik bouw op maat met AI, in jouw huisstijl en op jouw verhaal. Geen template die er bij honderd anderen net zo uitziet.",
      },
      {
        q: "Van wie is de code?",
        a: "Van jou. Je bent eigenaar van de volledige code en het onderhoudscontract is per maand opzegbaar. Geen lock-in.",
      },
    ],
    ctaTitle: "Klaar voor een site die wél klopt?",
    ctaBody:
      "Eén vaste prijs, online in 5 werkdagen. Vertel me kort wat je nodig hebt en ik ga aan de slag.",
    ctaLabel: "Vraag je site aan",
    ctaHref: "/#contact",
    seoTitle: "AI-website op maat in 5 dagen — AI Web Atelier",
    seoDescription:
      "Een website op maat, met AI gebouwd, online in 5 werkdagen voor €499 eenmalig. Geen sjabloon, jij bezit de code. Vraag vandaag nog je site aan.",
  },
  {
    slug: "market",
    icon: "marketing",
    navTitle: "Market",
    title: "AI-marketing die ook echt converteert",
    eyebrow: "Market",
    heroLead:
      "Advertenties, content en landingspagina’s, met AI gemaakt en op cijfers gestuurd. Meer dan mooie posts: campagnes die klanten opleveren.",
    heroCtaLabel: "Vraag een voorbeeld",
    heroCtaHref: "/#contact",
    intro:
      "AI-gestuurde advertenties, content en landingspagina’s die klanten opleveren.",
    problemTitle: "Mooie posts, weinig klanten",
    problemBody:
      "Je post braaf op Instagram en Facebook, maar het levert vooral likes op en geen klanten. Adverteren probeerde je een keer, maar je zag niet wat je geld deed. Content schrijven kost je elke week tijd die je niet hebt. Je weet dat marketing moet renderen, alleen niet hoe je dat als eenmanszaak voor elkaar krijgt.",
    solutionTitle: "Hoe ik het aanpak",
    solutionBody:
      "Ik kom uit performance marketing en stuur alles op cijfers, niet op gevoel. Met AI maak ik snel meerdere versies van je advertenties, content en landingspagina’s, en ik laat de markt bepalen wat werkt. Wat aanslaat schaal ik op, de rest gaat eruit. Zo krijg je marketing die je klanten oplevert in plaats van likes.",
    includesTitle: "Wat je krijgt",
    includes: [
      "AI-gegenereerde advertenties in meerdere versies",
      "Content die past bij je merk en je publiek",
      "Landingspagina’s die bezoekers tot actie aanzetten",
      "Campagnes op Meta en Google, gestuurd op resultaat",
      "Heldere rapportage: wat werkt, wat het kost en wat het oplevert",
    ],
    process: [
      {
        label: "Stap 1",
        title: "Doel",
        body: "We bepalen wat je echt wil: meer aanvragen, meer verkoop of meer bekendheid.",
      },
      {
        label: "Stap 2",
        title: "Creatie",
        body: "Ik genereer met AI meerdere versies van je advertenties en landingspagina’s.",
      },
      {
        label: "Stap 3",
        title: "Testen",
        body: "Ik laat de versies tegen elkaar lopen en kijk welke echt converteert.",
      },
      {
        label: "Stap 4",
        title: "Schalen",
        body: "Wat werkt schaal ik op, de rest schrap ik, en ik blijf bijsturen op de cijfers.",
      },
    ],
    faq: [
      {
        q: "Op welke kanalen werk je?",
        a: "Vooral Meta (Facebook en Instagram) en Google, want daar zit het gros van de Belgische kmo-doelgroep. Welk kanaal het wordt, hangt af van je doel.",
      },
      {
        q: "Hoeveel advertentiebudget heb ik nodig?",
        a: "Dat hangt af van je doel en je markt. Ik begin liever klein, meet wat werkt en schaal pas op wat rendeert. Geen budget verbranden op gevoel.",
      },
      {
        q: "Is AI-content niet te generiek?",
        a: "Niet zoals ik het inzet. AI levert de snelheid en de varianten, ik zorg voor de richting, je merk en de stem. De cijfers bepalen wat blijft.",
      },
    ],
    ctaTitle: "Marketing die klanten oplevert?",
    ctaBody:
      "Vertel me wat je verkoopt en wie je wil bereiken. Ik laat je zien hoe AI-marketing er bij jou uitziet.",
    ctaLabel: "Vraag een voorbeeld",
    ctaHref: "/#contact",
    seoTitle: "AI-marketing die converteert — AI Web Atelier",
    seoDescription:
      "AI-gestuurde advertenties, content en landingspagina’s, op cijfers gestuurd. Marketing die klanten oplevert in plaats van likes. Vraag een voorbeeld aan.",
  },
  {
    slug: "operate",
    icon: "os",
    navTitle: "Operate",
    title: "Een AI-besturingssysteem voor je zaak",
    eyebrow: "Operate",
    heroLead:
      "Laat je tools met elkaar praten en je terugkerende taken zichzelf doen. Eén AI-laag bovenop je software die het saaie werk overneemt.",
    heroCtaLabel: "Stel je vraag",
    heroCtaHref: "/#contact",
    intro:
      "Eén AI-laag die je tools verbindt en je terugkerende taken automatiseert.",
    problemTitle: "Je verliest uren aan overtypen",
    problemBody:
      "Elke week ben je bezig met hetzelfde: offertes overtypen, facturen kopiëren, mails sorteren, gegevens van het ene systeem naar het andere overzetten. Je tools praten niet met elkaar, dus jij bent de lijm ertussen. Dat werk levert niets op en kost je net de tijd die je in je echte werk wil steken.",
    solutionTitle: "Hoe ik dat oplos",
    solutionBody:
      "Ik bouw een AI-laag bovenop je bestaande tools die ze met elkaar verbindt en het herhaalwerk overneemt. Een nieuwe aanvraag belandt automatisch in je systeem, je offertes vertrekken zonder overtypen, je mails worden gesorteerd. AI-agents nemen de stappen over die altijd hetzelfde verlopen, zodat jij bezig bent met het werk dat wél telt.",
    includesTitle: "Wat je krijgt",
    includes: [
      "Koppelingen tussen je bestaande tools en software",
      "Automatische workflows voor je terugkerende taken",
      "AI-agents die het herhaalwerk voor je afhandelen",
      "Minder overtypen en minder fouten",
      "Een opzet die meegroeit als je zaak verandert",
    ],
    process: [
      {
        label: "Stap 1",
        title: "In kaart",
        body: "We brengen samen je terugkerende taken en je huidige tools in kaart.",
      },
      {
        label: "Stap 2",
        title: "Ontwerp",
        body: "Ik bedenk de workflows en kies waar AI-agents het werk overnemen.",
      },
      {
        label: "Stap 3",
        title: "Bouwen",
        body: "Ik koppel je tools en zet de automatiseringen op zodat ze betrouwbaar draaien.",
      },
      {
        label: "Stap 4",
        title: "Bijsturen",
        body: "We testen alles in je echte werk en ik stuur bij tot het zonder zorgen loopt.",
      },
    ],
    faq: [
      {
        q: "Moet ik mijn huidige tools vervangen?",
        a: "Meestal niet. Ik bouw de AI-laag bovenop wat je al gebruikt en verbind die tools, zodat je niet alles hoeft om te gooien.",
      },
      {
        q: "Wat kan ik zoal automatiseren?",
        a: "Denk aan aanvragen verwerken, offertes en facturen klaarzetten, mails sorteren en gegevens tussen systemen overzetten. Alles wat elke week hetzelfde verloopt.",
      },
      {
        q: "Is dit niet veel te complex voor een kleine zaak?",
        a: "Juist niet. Hoe kleiner je team, hoe meer een uur minder overtypen telt. We beginnen bij de taak die je nu het meeste tijd kost.",
      },
    ],
    ctaTitle: "Je tools voor je laten werken?",
    ctaBody:
      "Vertel me welk herhaalwerk je elke week tijd kost. Ik laat je zien wat AI ervan kan overnemen.",
    ctaLabel: "Stel je vraag",
    ctaHref: "/#contact",
    seoTitle: "AI-besturingssysteem voor je zaak — AI Web Atelier",
    seoDescription:
      "Eén AI-laag die je tools verbindt en je terugkerende taken automatiseert. Minder overtypen, meer tijd voor je echte werk. Stel vandaag je vraag.",
  },
  {
    slug: "educate",
    icon: "consultancy",
    navTitle: "Educate",
    title: "Concreet advies over waar AI je zaak echt helpt",
    eyebrow: "Educate",
    heroLead:
      "Geen hype, geen vaag toekomstpraat. Ik kijk naar jouw zaak en zeg je waar AI nu al tijd of geld oplevert en wat je beter laat liggen.",
    heroCtaLabel: "Stel je vraag",
    heroCtaHref: "/#contact",
    intro:
      "Concreet advies over waar AI je zaak echt vooruithelpt, zonder de hype.",
    problemTitle: "Het probleem met alle AI-praat",
    problemBody:
      "Iedereen roept dat je iets met AI moet doen, maar niemand zegt je wat. Je leest over agents en automatisering en je krijgt vooral het gevoel achter te lopen. Je hebt geen tijd om vijftien tools te testen die je daarna toch laat liggen. Wat je wil is iemand die je zaak bekijkt en zegt waar je moet beginnen.",
    solutionTitle: "Hoe ik je verder help",
    solutionBody:
      "Ik werk al jaren dagelijks met AI in analytics, marketing en development, dus ik weet wat werkt en wat een demo blijft. Ik bekijk je processen, je tools en je klanten, en ik geef je een korte lijst met wat AI bij jou echt verandert. Geen lijst van vijftig mogelijkheden, maar de twee of drie die het verschil maken, in volgorde van impact.",
    includesTitle: "Wat je krijgt",
    includes: [
      "Een doorlichting van je processen en huidige tools",
      "Een korte prioriteitenlijst, gerangschikt op impact en werk",
      "Concrete toolkeuzes in plaats van een lijst opties",
      "Een eerste automatisering om mee te starten",
      "Eerlijk advies over wat je beter níét met AI doet",
    ],
    process: [
      {
        label: "Stap 1",
        title: "Situatie",
        body: "Je vertelt me hoe je zaak draait en waar je nu tijd verliest.",
      },
      {
        label: "Stap 2",
        title: "Analyse",
        body: "Ik leg je processen en tools naast elkaar en zoek waar AI het meeste oplevert.",
      },
      {
        label: "Stap 3",
        title: "Prioriteiten",
        body: "Ik geef je twee of drie stappen in volgorde van impact, niet vijftig opties.",
      },
      {
        label: "Stap 4",
        title: "Aanpak",
        body: "We bekijken samen hoe je de eerste stap concreet aanpakt of laat bouwen.",
      },
    ],
    faq: [
      {
        q: "Voor wie is dit?",
        a: "Voor Belgische zelfstandigen en kmo’s die voelen dat ze iets met AI moeten maar niet weten waar te beginnen. Je hoeft geen technische achtergrond te hebben.",
      },
      {
        q: "Verkoop je me dan een hoop tools?",
        a: "Nee. Ik adviseer net zo vaak om iets niet te doen. Het doel is dat je begint met wat echt rendeert, niet dat je abonnementen stapelt.",
      },
      {
        q: "Wat heb ik na dit advies in handen?",
        a: "Een korte, concrete prioriteitenlijst en een duidelijke eerste stap. Je weet waar je begint en waarom.",
      },
    ],
    ctaTitle: "Wil je weten waar AI bij jou loont?",
    ctaBody:
      "Vertel me kort wat je doet en waar je tijd verliest. Ik laat je weten waar AI bij jou het verschil maakt.",
    ctaLabel: "Stel je vraag",
    ctaHref: "/#contact",
    seoTitle: "AI-consultancy voor kmo’s — AI Web Atelier",
    seoDescription:
      "Concreet AI-advies voor Belgische zelfstandigen en kmo’s. Ik zeg je waar AI nu al tijd en geld oplevert en wat je beter laat liggen. Stel je vraag.",
  },
];

export function getService(slug: string): ServiceContent | undefined {
  return services.find((s) => s.slug === slug);
}

export const serviceSlugs = services.map((s) => s.slug);
