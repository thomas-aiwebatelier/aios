---
industry: creative-services
language: nl-BE
applies_to: [photographer, fotograaf, designer, grafisch-ontwerper, illustrator, videographer, videograaf, copywriter, brand-studio, freelance-creative]
---

# Industry Style Guide: Creative Services (Fotografen, Designers & Freelance Creatieven)

Vlaanderen/België. Dekt: huwelijksfotografen, portretfotografen, commercieel/food fotografen,
grafisch ontwerpers, illustratoren, videografen, copywriters, freelance creatief directeurs en
brand-identity studio's. Sluit uitdrukkelijk web-design agencies uit — die hebben een hogere bar
en anders positionering.

---

## 1. Aesthetic Conventions

### Portfolio-LED: het werk is het design

De site van een creatieve freelancer is geen bedrijfsbrochure — het is een portfolio dat zichzelf
verkoopt. Het ontwerp moet uit de weg stappen en de beelden of projecten naar voren halen. Elke
decoratieve keuze die aandacht steelt van het werk is een fout.

**Lay-out: gallery-grid en full-bleed**

- Gallery-grid als standaard voor het werk: 2- of 3-kolom op desktop, 1-kolom op mobiel.
  `gap: var(--space-3)` voor dichte grids (gallerijstijl), `gap: var(--space-8)` voor
  luchtigere case-study lay-outs.
- Full-bleed foto's (`width: 100vw`, `max-width: none`) voor hero's en feature-shots.
  Photographer-sites: de hero IS de foto — geen overlay, geen headline erbovenop.
  Designer-sites: type-driven hero met één beeld of volledig typografisch.
- Maximale tekst-breedte voor leesbare broodtekst: `var(--max-w)` (1280 px), centred.
  Portfolio-grids mogen `var(--max-w)` overschrijden of volledig full-bleed gaan.

**Typografie: restraint, niet prescriptie**

Maximaal 2 lettertypen op de volledige site — bij voorkeur 1. De creatieve eigen
typografische keuze IS de merktaal. De AI mag geen specifiek lettertype opleggen;
wel gelden de volgende constraints:

- Display / koptekst: 1 typeface, `--text-3xl` tot `--text-5xl`, gecontroleerd gewicht
  (te vet = agressief; te licht = onleesbaar op schermen). Geen meer dan 2 regels
  in een hero-headline.
- Broodtekst: `--text-base` (1rem), regelafstand ≥ 1.5, maximale regelbreedte 65 ch.
- Navigatie en labels: `--text-sm`, letter-spacing 0.04–0.08 em, optioneel uppercase
  als dat past bij het karaktertype.
- Geen webfonts van drie of meer families.

**Kleur: restraint en per-lead brand_profile**

Dit gids schrijft geen specifiek palet voor — de creatieve eigen kleurkeuze IS
het merk. Twee absolute limieten:

1. Maximaal 2 merkkleur-stops bovenop de neutrale `--brand-bg` en `--brand-fg`.
   Concretiseer via de 4 brand-tokens: `--brand-primary`, `--brand-accent`,
   `--brand-bg`, `--brand-fg`.
2. Wees consistent: één knopakleur, één accentapplicatie. Geen vijf verschillende
   hover-tinten.

Afgeleide tinten uitsluitend via `color-mix()` (SYSTEM.md §9) — geen nieuwe
tokens aanmaken:

```css
/* Zachte sectionachtergrond */
background: color-mix(in srgb, var(--brand-primary) 5%, var(--brand-bg));

/* Hover op primaire knop */
background: color-mix(in srgb, var(--brand-primary) 80%, black);

/* Subtiele grid-separator */
border-color: color-mix(in srgb, var(--brand-fg) 12%, var(--brand-bg));
```

Contrastregel (SYSTEM.md §4): alle tekst op achtergrond ≥ 4,5:1 (AA), grote display
tekst ≥ 3:1. Valideer bij donkere hero's met lichte tekst.

**Beweging: subtiel en controleerbaar**

- Afbeeldingentransities in gallery: `opacity 0 → 1`, `var(--dur-standard)` (200 ms),
  `var(--ease)`. Geen schaal of translate die het oog afleidt van het werk.
- Page-in animaties: één keer, `var(--dur-hero)` (400 ms) maximum. Geen
  scroll-jank-triggerende parallax op portfolio-beelden.
- Hover op gallery-items: lichte dimming (`opacity: 0.88`) of caption fade-in —
  nooit een zware transform.
- Respecteer `prefers-reduced-motion: reduce` — alle animaties uitzetten.

**Witruimte: royaal maar doelgericht**

- Sectie-padding verticaal: `var(--space-24)` tot `var(--space-32)`.
- Ruimte tussen gallery-secties of portfolio-blokken: `var(--space-16)`.
- Hero bottom-padding: minimaal `var(--space-32)`.
- Alinea-doorloop in over-pagina en diensten: `var(--space-4)`.
- Zijmarges mobiel: `var(--space-6)`.

---

## 2. Tone of Voice in Dutch

### Register: standaard "jij", positioneringsafhankelijke uitzondering

De default voor Vlaamse creatieve freelancers is **"jij/je/jouw"** — toegankelijk,
direct, persoonlijk. Creatieven verkopen zichzelf, niet een institutie. Uitzonderingen:

| Positionering | Register | Rationale |
|---|---|---|
| Luxury wedding / fine-art fotografie | **"u"** | Trouwendparen in hogere segmenten verwachten gepast respect |
| Premium brand-identity studio | **"u"** | B2B-klant (merkmanager, founder) verwacht professionele afstand |
| Commercieel fotograaf (food, product) | **"u"** of **"jij"** | Afhankelijk van klantprofiel — agency vs. kleine ondernemer |
| Illustrator, jonge grafisch ontwerper | **"jij"** | Persoonlijk, communities-gericht |
| Videograaf (events, huwelijk) | **"jij"** | Tenzij premium-segment |
| Copywriter | **"jij"** | Toon moet bewijzen wat hij verkoopt: toegankelijk vakmanschap |

**De keuze zit in het `brand_profile`, niet in dit gids.**
Dit gids levert de standaard-teksten in "jij" — overschrijf consequent naar "u"
als het profiel dat vereist.

### Woordkeuze: vakjargon dat werkt, geen marketingkopieer

Gebruik de woorden die creatieven zelf gebruiken in het veld:

- *werk* / *project* — niet "creative output"
- *opdracht* / *samenwerking* — niet "traject op maat" (leeg)
- *briefing* / *moodboard* — vakjargon, geeft vertrouwen
- *eigen stijl* / *handschrift* — kernwoord voor fotograaf en illustrator
- *traject* — voor meerdere-sessie of langdurige samenwerking
- *kennismaking* / *kennismakingsgesprek* — de eerste call, laagdrempelig
- *atelier* / *studio* — locatiebeschrijving, authentiek
- *beschikbaar voor nieuwe projecten* — directe statusuiting

Vermijd:
- "Wij zijn gepassioneerd door creativiteit" — generiek en leeg
- "Uw dromen tot leven brengen" — trouwfotograaf-cliché
- "Full-service creatief bureau" — positioneert als agency, niet als freelancer
- "Out-of-the-box" / "creatieve oplossingen" — marketingkopieer, geen bewijs
- "Welkom in mijn creatieve ruimte" — hero-tekst die niemand overtuigt

### Voorbeeldzinnen — woordelijk te gebruiken of als model

**Hero (fotograaf, jij-register):**
> "Ik fotografeer het werk dat jij jaar na jaar wil kunnen bekijken."

**Hero (designer, u-register):**
> "Visuele identiteiten die uw merk onderscheidbaar maken — niet alleen herkenbaar."

**Over-pagina (illustrator, jij-register):**
> "Ik teken al twaalf jaar met inkt op papier. Geen stockbeelden, geen templates —
> elke illustratie is een origineel."

**Diensten-intro (videograaf, jij-register):**
> "Van briefing tot eindmontage werk ik samen met jou aan één ding: beelden die
> blijven hangen."

**Beschikbaarheid-badge:**
> "Beschikbaar voor nieuwe opdrachten vanaf september 2026."

**Kennismaking-CTA:**
> "Plan een vrijblijvend kennismakingsgesprek."

**Portfolio-sectie-label:**
> "Geselecteerd werk" / "Recent werk" / "Projecten"

**Wat absoluut niet mag:**
- "Neem gerust contact op!" — exclamatiemerk + "gerust" = onzekerheid
- "Hire me!" — Engels, schreeuwt
- "Ik help jou groeien" — te generiek voor een creatieve positionering
- CTAs in de tweede persoon zonder context: "Boek nu!" zonder uitleg wat er geboekt wordt

---

## 3. Page Structure Patterns

### Standaard set: 4–6 pagina's

```
/                → Home (portfolio-teaser + wie + beschikbaarheid-badge + CTA)
/werk            → Portfolio / work (gallery-grid, optioneel gefilterd per categorie)
  /werk/huwelijken        ← fotograaf: sub-categorie
  /werk/portretten
  /werk/commercieel
  /werk/[case-study-slug] ← designer/videograaf: case-study diepte
/over            → Over mij (zelfportret + verhaal + werkproces + waarden)
/diensten        → Diensten & pakketten (of tarieven, indien vermeld)
/contact         → Contactformulier + directe e-mail + kalender-link
/journal         → (optioneel) Blog, projectverhalen, behind-the-scenes
```

Fotografen voegen sub-pagina's toe per categorie als ze meerdere genres
bedienen (huwelijken / portretten / commercieel / food). Designers en
illustratoren werken vaker met case-study deep-dives als subpagina's van `/werk`.

Minder is meer: een fotograaf met twee genres hoeft geen menu met acht items.
Vier pagina's met diepe inhoud klopt beter dan zes dunne.

### Navigatiestructuur

```
[logo / naam]  .  werk  .  over  .  diensten  .  contact
```

- Logo of naam links, menulinks rechts — standaard verwachting.
- Geen dropdown-menu's op de home- of werk-pagina.
- Sticky nav: ja, maar transparant boven full-bleed hero's; overgaat naar opake
  achtergrond bij scroll (`background: var(--brand-bg)`, shadow toevoegen).
- Mobiel: hamburger-menu, geen bodemnavigatie (te app-achtig voor creatieve sites).

### Footer

Minimalistisch. Verplicht: naam of studio-naam, e-mailadres, KBO-nummer (of BTW-nr.
als BTW-plichtig), links naar relevante sociale platforms (Instagram boven LinkedIn
voor visuele creatieven). Optioneel: beschikbaarheids-badge, korte privacyvermelding.
Geen uitgebreide footer met drie kolommen en nieuwsbriefinschrijving.

---

## 4. Section Patterns

### Hero (home)

**Fotograaf — beeld-LED:**
- Full-bleed foto, `min-height: 100vh`. Één alom aanwezige afbeelding — geen slider.
- Naam of studio-naam als enige tekst, `--text-3xl` à `--text-5xl`, lichte weight.
  Optioneel: één regel tagline, `--text-lg`.
- Geen CTA in de hero zelf; de gebruiker scrollt. Als er toch een CTA is: één ghost-knop.
- Oog loodst de bezoeker het beeld in — geen overlay die de foto dekt.

**Designer / illustrator — type-LED:**
- Koptekst die positioneert, `--text-4xl` à `--text-5xl`. Eén beeld rechts of als
  achtergrond, teruggedrongen (`opacity: 0.15–0.25`) als het type te dragen heeft.
- Padding: `var(--space-32)` top/bottom.
- Één primaire CTA.

### Portfolio / werk-sectie (op de home)

Teaser-grid: maximaal 4–6 uitgelichte werken. Aspect ratio consistent (bijv. 4:3 of
1:1 voor fotograaf; wisselende verhoudingen voor designer als dat past bij het werk).

```css
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);       /* dicht grid = gallerijstijl */
}

/* Of luchtiger voor case-study-kaarten */
.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: var(--space-8);
}
```

Caption bij hover: projectnaam + categorie, `--text-sm`, fade-in
`var(--dur-standard)`. Geen permanente captions die het beeld vervuilen.

CTA onder de grid: "Bekijk al het werk →" of "Bekijk het volledige portfolio."

### Over-sectie (als component op home, volledig op /over)

- Zelfportret van de creatieve links (of recht), tekst rechts.
- Tekst: 100–200 woorden. Wie, werkwijze, wat maakt hen anders. Geen CV.
- `--text-base` voor de tekst, `var(--space-16)` sectie-padding.
- Op de /over-pagina: langere bio + werkproces (3–5 stappen) + waarden/benadering.
  Werkproces als genummerde lijst of horizontale timeline, `--text-sm` labels.

### Diensten / pakketten

- Kaartblokken: 2 à 3 kolom op desktop. Iedere kaart: naam, korte omschrijving
  (max. 3 zinnen), prijsindicatie of "op aanvraag", CTA.
- Fotografen: pakketbenaming liefst inhoudsgericht ("Volledige dag", "Halve dag +
  nabewerking") i.p.v. "Basic / Plus / Premium".
- Designers: diensten eerder als proces-stappen dan als pakketten, tenzij
  vaste prijzen van toepassing zijn.
- `var(--space-8)` gap tussen kaarten, `var(--space-24)` sectie-padding.

### Testimonials / referenties

- Maximaal 3 op de home. Volledig op een aparte sectie of op de diensten-pagina.
- Échte klanten: naam + context (bijv. "Anke — huwelijk Gent, 2024").
  Geen stockfoto's van "tevreden klanten". Bij geen toestemming voor naam: naam
  weglaten, context laten staan.
- Opmaak: grote aanhalingstekens in `--brand-primary`, `--text-lg`, cursief of
  regular (afhankelijk van typografische keuze van de creatieve).

### Contactsectie

- Kort: 2–4 formuliervelden (naam, e-mail, type project, bericht). Geen vragenlijst
  van tien items bij eerste contact.
- Directe e-maillink als alternatief: `mailto:` — niet elke creatieve wil een
  formulier beheren.
- Calendly / Cal.com embed voor kennismakingsgesprek: optioneel maar effectief
  voor fotografen en designers.
- Beschikbaarheidsstatus: zichtbaar in de contactsectie of als badge naast de CTA.

---

## 5. CTA Conventions

### Toegestane CTA-formuleringen (woordelijk)

| Situatie | CTA-tekst (jij-register) | CTA-tekst (u-register) |
|---|---|---|
| Portfolio bekijken | "Bekijk het werk" / "Bekijk portfolio" | idem |
| Offerte aanvragen | "Vraag een offerte aan" | "Vraag een offerte aan" |
| Kennismaking plannen | "Plan een kennismakingsgesprek" | "Plan een kennismakingsgesprek" |
| Direct contact | "Stuur een bericht" / "Mail me" | "Stuur een bericht" |
| Agenda-link | "Kies een moment" / "Boek een kennismaking" | idem |
| Portfolio-doorklik | "Bekijk dit project" | idem |
| Beschikbaarheid | "Bekijk beschikbare data" | idem |

### Knopstijl

```css
/* Primaire CTA */
.btn-primary {
  background: var(--brand-primary);
  color: var(--brand-bg);
  padding: var(--space-3) var(--space-8);
  font-size: var(--text-sm);
  letter-spacing: 0.06em;
  text-transform: none;          /* keuze afhankelijk van typografisch concept */
  border: none;
  transition: background var(--dur-standard) var(--ease);
}
.btn-primary:hover {
  background: color-mix(in srgb, var(--brand-primary) 80%, black);
}

/* Secundaire / ghost CTA */
.btn-secondary {
  background: transparent;
  color: var(--brand-primary);
  border: 1px solid currentColor;
  padding: var(--space-3) var(--space-8);
  font-size: var(--text-sm);
  letter-spacing: 0.06em;
  transition: background var(--dur-standard) var(--ease),
              color var(--dur-standard) var(--ease);
}
.btn-secondary:hover {
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--brand-bg));
}

/* Tekstlink-CTA (gallery, "Bekijk meer werk") */
.link-cta {
  color: var(--brand-primary);
  font-size: var(--text-sm);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: opacity var(--dur-micro) var(--ease);
}
.link-cta:hover { opacity: 0.7; }
```

### Wat nooit mag

- "Hire me!" / "Hire us!" — schreeuwt wanhoop, te anglofoon
- "Ontdek de mogelijkheden" — leeg, geen actie
- Twee primaire knoppen naast elkaar in dezelfde sectie
- Knoppen met `!` in de tekst — urgentie past niet bij creatieve positionering
- "Gratis kennismaking" — verlaagt de waarde van de tijd van de creatieve;
  gebruik "vrijblijvend" als je de drempel wil verlagen

---

## 6. Trust Signals

### Portfolio als primaire trust-signal — geef het real estate

Het portfolio IS de overtuiging. Geen testimonial, logo of award compenseert een
slecht of slecht gepresenteerd portfolio. Rangvolgorde:

1. **Portfolio / geselecteerd werk** — boven de vouw op de home, groot en sterk.
2. **Klantlogo's** — logo's van merken of bedrijven waarmee gewerkt werd.
   Grijs tonen voor uniformiteit (`filter: grayscale(100%) opacity(0.5)`), tenzij
   kleur bewust onderdeel van het design is.
3. **Testimonials** — échte quotes van echte klanten (zie §4).
4. **Pers- en publicatievermelding** — "Verschenen in [tijdschrift]", "Winnaar [award]".
5. **Ervaringsjaren** — "Actief als freelance fotograaf sinds 2016."
6. **Beschikbaarheidsbadge** — urgentie zonder druk.

### Beschikbaarheidsbadge

```html
<!-- Klein, zichtbaar op hero of contactsectie -->
<p class="availability-badge">
  Beschikbaar voor nieuwe projecten vanaf september 2026
</p>
```

```css
.availability-badge {
  display: inline-block;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--brand-primary);
  border: 1px solid color-mix(in srgb, var(--brand-primary) 30%, var(--brand-bg));
  padding: var(--space-1) var(--space-3);
}
```

### Klantlogo's

Grids van 4–8 logo's, één rij op desktop. Geen carrousel — statisch is sneller
en eerlijker. Vergroot op hover tot `scale(1.05)`, `var(--dur-micro)`.

### Pers en awards

Inline vermelding in de over-sectie of als eigen blok: "[Tijdschrift] · [Award naam]
[jaar]". Geen grote badge-iconen die het design domineren — tekst volstaat.

### Jaren freelance + projectcount

"12 jaar · 340+ projecten" als subtekst op de over-pagina of in de hero,
`--text-sm`, gedempte kleur via
`color: color-mix(in srgb, var(--brand-fg) 55%, var(--brand-bg))`.

### Wat trust kost

- Portfolio-watermerken op elke afbeelding: signaleert wantrouwen, niet kwaliteit.
- Anonieme testimonials met stockfoto: geloofwaardigheid nul.
- "Beschikbaar voor ALLE opdrachten!" — gebrek aan focus.
- KBO-nummer weglaten: ondernemers die B2B werken controleren dit.

---

## 7. Imagery Guidance

### Hun eigen werk — altijd

De afbeeldingen op de site zijn het bewijs. Geen uitzondering:

- **Fotograaf:** eigen foto's in elk blok — van hero tot footer. Eén zwak beeld
  trekt de rest omlaag; curateer meedogenloos.
- **Grafisch ontwerper / illustrator:** eigen projecten, volledig afgewerkt.
  Mock-ups zijn toegestaan (T-shirt, boek, scherm) mits realistisch en
  niet overgestralen.
- **Videograaf:** still-frames uit eigen werk als thumbnails voor embed-video's.
  Geen autoplay.
- **Copywriter / brand studio:** schermopnames van uitgewerkte copy in context
  (website, campagne) of case-study tekst met resultaten.

### Zelfportret op de over-pagina

Klanten kopen mensen, niet logo's. Een professionele portretfoto van de creatieve
zelf is verplicht op de over-pagina. Eisen:

- Hoge resolutie, goede belichting — niet een Instagram-crop.
- Authentiek: werkplek, studio, of op locatie — niet voor een
  willekeurige witte muur.
- Niet oudere dan 3 jaar: verouderde foto's ondermijnen vertrouwen.

### Behind-the-scenes en werkproces

- Foto's van atelier, werkplek, materialen: menselijk, echt.
- Fotograaf: BTS-shots tijdens shoots (portret met camera, lightroom-scherm).
- Illustrator: close-up van inkt op papier, sketchbook, werkproces.
- Designer: mood-board, typografie-proeven, printproeven.
- Videograaf: set-up, apparatuur in context — bewust gekozen, niet toevallig.

### Technische vereisten (SYSTEM.md §5)

- Alle afbeeldingen: `<img alt="...">` met beschrijvende alt-tekst.
- Decoratieve achtergrondfoto's: `role="presentation" alt=""`.
- LCP-afbeelding (hero): `loading="eager" fetchpriority="high"`.
- Overige portfolio-beelden: `loading="lazy"`.
- Formaat: WebP met JPEG/PNG fallback. Hero's maximaal 1600 px breed.
- Portfolio-grid: consistente aspect-ratio per categorie zodat de grid
  niet springt bij lazy-load. Gebruik `aspect-ratio` in CSS, niet alleen
  `height` in HTML.

### Wat verboden is

- Stockfoto's van "creativiteit" — gloeilampen, sticky notes, brainstormende mensen
  in een vergaderzaal, koffiemokken op een MacBook.
- AI-gegenereerde werksamples voorstellen als eigen werk.
- Lage-resolutie Instagram-crops in de portfolio-grid.
- Watermerken op elk portfoliobeeld — werkt contraproductief.
- Werk van klanten zonder toestemming tonen.
- Showreel-video met autoplay en geluid bij binnenkomst.

---

## 8. Reference URLs

De volgende drie sites zijn geverifieerd toegankelijk (geladen op 7 mei 2026) en
illustreren sterke designkeuzes voor de sector in België/Vlaanderen.

### 1. https://noirdesign.be

**Type:** Freelance fotografe (newborn, portret, maternity) — Julie Van Brabant, West-Vlaanderen

**Observatie:** Consequent wit als achtergrond — `--brand-bg` is letterlijk wit, als
bewuste esthetische keuze die het werk centraal zet. Navigationstructuur erg
direct: categorie-subpagina's per genre (newborn / babies / maternity). Calendly-integratie
voor rechtstreekse sessie-booking per categorie — lagere wrijving dan een contactformulier.
Beschikbaarheidslogica zit verwerkt in de boekingsflow. Demonstrates: portfolio-grid
boven de vouw, geen hero-tekst die aandacht trekt van de beelden, bescheiden
typografische keuzes die nooit concurreren met de foto's.

### 2. https://www.skinn.agency

**Type:** Multidisciplinaire brand-identity studio (strategie, branding, imagery, spatial, digital) — Gent/Brussel

**Observatie:** "Creative Intelligence" als positioneringswoord — toont dat een studio
een eigen taal kan bezitten. Werk-filterfunctie (All / Strategy / Branding / Spatial
/ Digital / Imagery) zonder page-reload: snelle portfoliobrowse. Hero volledig
typografisch, geen afbeelding in de hero zelf — de identiteit van de studio bewijst
zichzelf via type en witruimte. GIF-elementen als subtiele merkexpressie (iconen).
Demonstrates: type-driven hero, portfolio als kern, studio-taal als trust-signal.

### 3. https://doublebill.design

**Type:** Grafisch ontwerp studio gespecialiseerd in boekvormgeving en publicaties — Sarah Schrauwen & Mathieu, Antwerpen

**Observatie:** Case-study structuur als primaire portfoliovorm — elk project krijgt
eigen diepte (context, aanpak, resultaat) i.p.v. enkel een thumbnail-grid.
Navigatie: "Work / Case Studies / Portfolio / Archive / Info / Contact" — laat zien
hoe een designer meerdere portfolio-lagen kan aanbieden (geselecteerd werk vs.
volledig archief). Cargo-gebaseerde site met typografisch minimaal design — bewijst
dat het platform geen excuus is voor generiek. Demonstrates: case-study depth,
archief-logica, editorial tone voor een creatief duo.

---

## 9. Negative Examples

De onderstaande patronen zijn anti-patronen voor creatieve freelancers.
Genereer ze niet.

### Inhoud en copy

| Anti-patroon | Waarom fout |
|---|---|
| Hero: "Welkom in mijn creatieve ruimte" | Zegt niets, positioneert niets |
| Hero-achtergrond: abstract verfspat of kleurexplosie | Trekt aandacht van het werk, communiceert "hobby" |
| "Wij zijn gepassioneerd door creativiteit" | Generieke boilerplate — elk creatief bedrijf ter wereld zegt dit |
| "Full-service creatief bureau" als headline | Positioneert als agency, ondermijnt de freelancer-authenticiteit |
| "Hire me!" als CTA | Engels, schreeuwt wanhoop |
| Prijslijst verbergen achter een contactformulier als enige optie | Drempelverhoging; geef minstens een indicatie of "op aanvraag" |
| "Elke klant is uniek, elk project is een avontuur" | Betekenisloos; bewijs het met het werk |

### Visueel en technisch

| Anti-patroon | Waarom fout |
|---|---|
| Autoplay showreel met geluid bij binnenkomst | Grote UX-overtreding; gebruiker sluit tab |
| Carrousel van elk foto ooit gemaakt | Pagina te zwaar; curateer tot 20–30 sterke beelden |
| Parallax-effect op portfolio-foto's | Vervormt het werk, trager op mobiel |
| Watermark-stempel op elk portfoliobeeld | Signaleert wantrouwen; geeft een amateuristisch signaal |
| Stockfoto's van "creativiteit" (laptops + koffie, lightbulbs, brainstorms) | Ongeloofwaardig bij een creatieve die eigen werk moet tonen |
| Instagram-embeds als enige portfolio | Lage resolutie, algoritmeafhankelijk, geen curatie |
| Drie of meer lettertypen door de site | Ondermijnt elk typografisch merk-signaal |
| `--color-*` tokens of `--brand-secondary` gebruiken | Niet-bestaande tokens — gebruik uitsluitend `--brand-primary`, `--brand-accent`, `--brand-bg`, `--brand-fg` en `color-mix()` |

### Structurele fouten

- Over-pagina zonder zelfportret: klanten kopen mensen — het gezicht ontbreekt.
- Portfolio zonder curateer-logica: 200 foto's in één grid zonder structuur
  signaleert "ik kan niet kiezen" — het slechtste signaal voor een visueel creatieve.
- Contactpagina zonder directe e-mail of telefoonnummer: een formulier als enige
  optie werkt drempelophoging.
- Geen beschikbaarheidsstatus: geïnteresseerde klant weet niet of je vrij bent —
  ze mailen iemand die wel zichtbaar beschikbaar is.
- Blog / journal zonder datum op berichten: BTS-content zonder temporele context
  is onbetrouwbaar en onvindbaar.
- KBO-nummer weglaten in de footer: B2B-klanten (merken, agency's) controleren
  dit standaard voor ze een opdracht plaatsen.
- Diensten-pagina zonder enige prijsindicatie én zonder "op aanvraag": laat de
  bezoeker in het ongewisse — hogere uitvalratio.
