---
industry: automotive
language: nl-BE
applies_to:
  - garage
  - automecanicien
  - autodealer
  - occasion
  - banden
  - tire-shop
  - detailing
  - autowash
  - ev-installer
  - laadpaal
  - classic-car
---

# Industry Style Guide — Automotive (Vlaanderen)

Covers: garages (onderhoud + reparatie), autodealers (occasion + nieuw),
bandenwinkels, detailers, car-wash, mobiele mecaniciens, EV-installateurs
(laadpalen), klassiekerspecialisten. Doelgebied: België / Vlaanderen.
Doelpubliek van de gegenereerde site: eigenaars en bestuurders die een
interventiebeslissing nemen — soms kostelijk, altijd praktisch. Ze willen
duidelijkheid, vakkennis en een telefoonnummer dat ze kunnen bellen.

---

## 1. Esthetische conventies

Automotive sites stralen technische competentie uit. De bezoeker wil in
5 seconden weten: "Is dit een vakman die mijn merk kent?" en "Hoe bel of
boek ik?" Decoratieve ambiguïteit is contraproductief.

**Typografie:**

- Primaire keuze: **Inter Tight** of **Manrope** voor koppen (condensed,
  hoge x-hoogte, technisch zonder steriel te zijn). **Inter** voor
  broodtekst — breed beschikbaar, uitstekend leesbaar op kleine schermen.
- Alternatief industrieel-gespierd: **Geist** (modern, clean, no-nonsense).
- Dealer en EV-installateur: **Inter** + **Inter Tight** voor
  prominente numerieke data (km-stand, prijs, vermogen).
- Detailers met premiumpositionering: **Manrope** (iets eleganter dan
  Inter Tight zonder luxe-clichés).
- Vermijd: script-lettertypen, display-faces met lage leesbaarheid,
  condensed weights onder 400 in broodtekst.

**Kleurlogica:**

Automotive paletten zijn high-contrast, nooit pastelachtig. Donkere
hero-secties (antraciet of diepzwart als `--brand-bg` of per-hero
overlay) gecombineerd met één sterke accentkleur werken het best.

| Sub-sector              | Typisch primair         | Typisch accent          |
|-------------------------|-------------------------|-------------------------|
| Garage / onderhoud      | Antraciet `#1C1C1E`     | Rood `#C0202A` of zilver |
| Merkdealer (premium)    | Diepzwart `#0A0A0A`     | Merk-accent (zilver, blauw) |
| Occasion / multi-merk   | Marineblauw `#1A2E44`   | Oranje `#E8640A` of wit |
| Bandenspecialist        | Zwart `#111111`         | Geel `#F0C000` of rood  |
| Detailer / polish       | Diepgrijs `#1A1A1A`     | Elektrisch blauw `#0066FF` of goud |
| EV-installer / laadpaal | Diepblauw `#0A1628`     | Elektrisch groen `#00C853` of cyaan |
| Klassiekerspecialist    | Donkerbrons / kaki      | Crème `#F5ECD7` of koper |

Alle kleuren worden uitgedrukt als `--brand-primary`, `--brand-accent`,
`--brand-bg`, `--brand-fg`. Afgeleiden via `color-mix()` per SYSTEM.md §9:
- Hover-donkering knop: `color-mix(in srgb, var(--brand-primary) 80%, black)`
- Transparante overlay hero: `color-mix(in srgb, var(--brand-primary) 90%, transparent)`
- Zachte sectieachtergrond: `color-mix(in srgb, var(--brand-accent) 8%, var(--brand-bg))`

**Lay-out en sfeer:**

- Rasters: 12-koloms grid, `gap: var(--gutter)` (= `--space-6` = 24px).
  Max contenteenheid: `var(--max-w)` (1280px).
- Hero: donker, vol-breedte achtergrond (foto of kleur-overlay), witte
  tekst, CTA-knop in accentkleur. Minimale hoogte 480px op desktop.
  `padding-block: var(--space-32)` aanbevolen (128px).
- Secties wisselen af: donker hero → licht diensten → donker/accent trust
  strip → licht formulier → donker footer.
- Geen ronde hoeken op kaarten in garage/dealer-context (industrieel-
  clean vraagt scherpe rechthoeken of subtiel 2–4px radius).
- Grote, kleurrijke "bel ons"-blok boven de fold op mobiel.

---

## 2. Tone of voice (Nederlands, Belgisch)

**Standaard: formeel "u"** — automotive klanten nemen kostelijke
beslissingen (onderhoud, occasieaankoop, carrosserieherstel). Het formele
register is de norm voor 90% van de Vlaamse garages en dealers. Het
creëert vertrouwen en professionaliteit.

**Jij-uitzondering:** jonge detailers, car-wash-ketens met stedelijk publiek
en sommige EV-startups hanteren "jij/je". Flag dit expliciet in de brief
als de klant dit wil; de standaard blijft "u".

**Woordenschat (gebruik, niet vermijden):**

Technisch-beschrijvend:
`onderhoud`, `technische keuring`, `APK-keuring`, `diagnose`, `interventie`,
`banden wissel`, `uitlijning`, `remmen`, `vervanging onderdelen`,
`origineel onderdeel`, `OEM-onderdeel`, `erkend hersteller`,
`fabrieksgarantie`, `carrosserieherstel`, `spuitwerk`, `remschijven`,
`distributieriem`, `vloeistoffen nazien`, `bandenspanning`

Commercieel-transactioneel:
`occasion`, `tweedehands`, `km-stand`, `jaargang`, `eerste eigenaar`,
`garantie`, `inruilwaarde`, `taxivrij`, `bedrijfswagen`, `leasing`,
`opvolging`, `offerte`, `afspraak`, `beschikbaarheid`

Belgisch-specifiek:
`gekeurd`, `GOCA-erkend`, `Traxio-lid`, `erkende verdeler`,
`BTW-nummer`, `BIV-nummer`, `keuring conform`, `keuringsattest`

**Vermijden:** marketing-clichés ("dé beste garage van…", "topkwaliteit
voor iedereen"), emotionele oproepen ("uw droomauto"), bloemrijke
bijvoeglijke naamwoorden die niets zeggen ("uitzonderlijk", "fantastisch").

**Voorbeeldzinnen (u-register, garage/onderhoud):**

> "Uw wagen verdient vakkundige handen. Boek uw onderhoudsbeurt online of
> bel ons — wij plannen u in binnen 48 uur."

> "Als erkend hersteller van [Merk] beschikken wij over de
> fabrieksdiagnostiek en originele onderdelen om uw voertuig conform de
> garantievoorwaarden te onderhouden."

> "Wij keuren elke occasion grondig voor aflevering: technische keuring,
> historiekcheck en 12 maanden garantie inbegrepen."

> "Uw banden bepalen uw veiligheid. Laat uw profieldíepte en spanning
> nakijken — het duurt 15 minuten en is gratis bij elke beurt."

**Voorbeeldzinnen (jij-register, detailer/EV):**

> "Jouw auto verdient meer dan een wasstraat. Wij beschermen elk detail
> met professionele ceramic coating — voor jaren rijplezier."

> "Klaar om emissievrij te rijden? Wij installeren jouw laadpaal thuis of
> op kantoor, van aanvraag tot indienstname."

**Structuur van technische beschrijvingen:**

1. Wat doen we (dienst in 1 zin)
2. Waarom het telt (praktisch gevolg, geen emotioneel verhaal)
3. Wat inbegrepen is (transparantie)
4. Hoe te boeken (directe actie)

---

## 3. Paginastructuur

### Garage / onderhoud (4–5 pagina's)

```
/ (Home)
/diensten          ← centrale dienstenpagina met secties per categorie
/over-ons          ← team, erkenningen, fotoreportage werkplaats
/contact           ← formulier + Google Maps + openingsuren + telefoon
```

Optioneel bij grotere garages:
```
/merken            ← per erkend merk een sectie of sub-pagina
```

### Autodealer / occasion (5–6 pagina's)

```
/ (Home)
/occasions         ← voorraadgrid met filter (merk, prijs, km, brandstof)
/nieuw             ← nieuwe modellen, configurator-link of offerte-CTA
/diensten          ← onderhoud, APK, herstellingen (service-afdeling)
/over-ons
/contact
```

De `/occasions`-pagina is de zwaarste pagina: listing-grid met miniatuur,
merk, model, km-stand, prijs, jaar. Filter linksboven (desktop) of
collapsible bovenaan (mobiel). Elke kaart heeft een duidelijke "Meer info"
of "Vraag prijs" CTA.

### Bandenspecialist / tire-shop (3–4 pagina's)

```
/ (Home)
/diensten          ← banden, uitlijning, velgen, wisselservice
/merken-banden     ← Michelin, Pirelli, Continental etc. (optioneel)
/contact
```

### Detailer / car-wash (3 pagina's)

```
/ (Home)
/behandelingen     ← pakketten (basic, premium, ceramic) met prijzen
/contact
```

Detailers tonen prijstabel openlijk — verborgen prijzen is een
vertrouwensbreuk in dit segment.

### EV-installateur / laadpalen (4 pagina's)

```
/ (Home)
/installaties      ← thuisladen, bedrijf, openbaar; Wallbox/Easee/etc.
/subsidies         ← Vlaamse premies, netbeheerder, fiscaal voordeel
/over-ons
/contact
```

### Klassiekerspecialist (4 pagina's)

```
/ (Home)
/restauraties      ← portfolio met voor/na, merken, referenties
/voorraad          ← beschikbare klassiekers (optioneel)
/over-ons
/contact
```

---

## 4. Sectiepatronen

### Hero-sectie

- Donker of vol-breedte fotografie als achtergrond.
- H1: maximaal 6–8 woorden, technisch-beschrijvend. Geen slogans.
  Goed: "Erkend hersteller Mercedes-Benz in Gent"
  Fout: "Uw vertrouwde partner voor al uw automobielnoden"
- Subkop: 1–2 zinnen met dienst + geografische ankering.
- CTA-knop: één primaire actie (bel / boek / bekijk), één secondaire
  (meer info of offerte).
- Telefoonnummer prominent zichtbaar in hero op mobiel.
- `padding-block: var(--space-32)` hero minimaal; `var(--space-48)` voor
  premium dealer.

### Dienstenraster

- 3-koloms grid (desktop), 2-koloms (tablet `--bp-md`), 1-koloms (mobiel).
- Elke kaart: icoon of kleine foto + dienstnaam (`--text-lg`) + 2-zinnen
  beschrijving + link "Meer info" of inline CTA.
- `gap: var(--gutter)` tussen kaarten.
- Sectietitel `--text-3xl`, sectieintro max. 2 zinnen.

### Voorraad/occasions-listing (dealers)

- Grid: 3 kolommen desktop, 2 tablet, 1 mobiel.
- Kaart: foto (aspect-ratio 16/9) + merk + model + jaar + km + prijs
  + brandstof-badge + CTA "Bekijk details".
- Filter sticky linksboven (desktop): merk, prijs-slider, brandstof,
  km-range, transmissie.
- Sorteren: nieuwste eerst standaard, prijs omhoog/omlaag, km laagst.
- Pagination of "Meer laden" knop — geen infinite scroll (CLS-risico).

### Trust-strip / erkenningsbalk

- Horizontale balk, donker of lichtgrijs.
- Logos: GOCA, Traxio, merklogo's (BMW, Mercedes, Audi…), Google Reviews
  sterrenscore + aantal reviews.
- `padding-block: var(--space-8)` (32px), `gap: var(--space-8)`.
- Geen beschrijvende tekst per logo — het logo spreekt voor zich.

### Contactsectie / formulier

- Twee-koloms layout: formulier links, info rechts (tel + adres + uren
  + Google Maps embed).
- Formuliervelden automotive:
  - Naam (verplicht)
  - Telefoon (verplicht, voor callback)
  - Kenteken (nummerplaat) of merk/model + km-stand
  - Probleem/aanvraag (textarea)
  - E-mail (optioneel)
- Geen overbodige velden (geboortedatum, hoe hoorde u van ons, etc.).
- Label boven elk veld (nooit alleen placeholder), zie SYSTEM.md §5.
- Submit-knop in `--brand-accent`, tekst: "Stuur uw aanvraag" of "Boek
  een afspraak".

### Openingsuren

- Tabel of gestructureerde lijst, altijd aanwezig op contact-pagina.
- Formaat: Ma–Vr 08:00–18:00 / Za 08:00–12:00 / Zo gesloten.
- Op mobiel sticky onderaan of in hero-banner als vandaag gesloten.

---

## 5. CTA-conventies

**Primaire CTA's (actieve volgorde van voorkeur):**

1. `"Bel voor een afspraak"` — met telefoonnummer zichtbaar naast knop.
   Gebruik `<a href="tel:+32...">` voor mobiele click-to-call.
2. `"Boek een onderhoudsbeurt"` — leidt naar formulier of booking-widget.
3. `"Vraag een offerte aan"` — voor onderhoud, carrosserie, laadpaal.
4. `"Bekijk onze occasions"` — dealers, leidt naar voorraadpagina.
5. `"Vraag uw gratis diagnose"` — garage, lage drempel eerste contact.

**Secondaire CTA's:**

- `"Meer info over [dienst]"` — interne link naar dienstenpagina.
- `"Bekijk ons team"` — over-ons.
- `"Ontdek onze pakketten"` — detailers.
- `"Download onze prijslijst"` — bandenwinkels (PDF, maar met webversie).

**Formulier-CTA minimumvelden (kortste pad):**

```
Nummerplaat: [          ]   Merk/model: [          ]
Km-stand:   [          ]   Uw vraag:   [                    ]
Naam:       [          ]   Tel:        [          ]
                           [ Stuur aanvraag ]
```

**Nooitdoen:**

- "Klik hier" zonder context.
- "Meer informatie" als enige CTA op een pagina.
- Verborgen prijzen achter CTA ("bel voor tarief") zonder alternatief.
- CTA in dezelfde kleur als de achtergrond (toegankelijkheidsovertreding,
  zie SYSTEM.md §5 contrasteis ≥ 3:1 voor UI-componenten).

**Telefoonnummer behandeling:**

Telefoonnummer staat op:
- Header (sticky, desktop én mobiel)
- Hero-sectie (onder de subkop op mobiel)
- Footer
- Contactpagina (groot, prominent, `--text-2xl` of groter)

Formaat: `+32 3 456 78 90` of `03 456 78 90` (lokaal formaat). Altijd
klikbaar via `<a href="tel:+32...">`.

---

## 6. Vertrouwenssignalen (Belgisch-specifiek)

### Erkenningen en lidmaatschappen

**GOCA-erkend (Garage Owners Confederation Authorisation)**
De meest herkenbare Belgische garagekeuring. Toon het GOCA-logo met
eventueel het erkenningsnummer. Plaatsen: trust-strip homepage, footer,
over-ons-pagina.

**Traxio-lidmaatschap**
Sectororganisatie voor automobielprofessionals. Logo in footer of
trust-strip. Signaleert naleving van sectorgedragscode.

**Merk-erkenning (erkend hersteller)**
- BMW Erkende Hersteller
- Mercedes-Benz Erkend Servicepunt
- Audi Erkende Service Partner
- Volkswagen Erkend Servicepunt
- (overige merken analoog)

Toon merklogo's in trust-strip. In de H1 of subkop vernoemen:
"Erkend servicepunt [Merk] in [Stad]" is een sterke SEO-ankering.
Technici zijn opgeleid door het merk → vermeld dit in de over-ons-sectie.

**BIV (Beroepsinstituut voor Vastgoed — let op: fout genre)**
Niet van toepassing op automotive. Correcte automotive equivalent:
**BIV als autodealer** verwijst naar het BTW-plichtig ingeschreven zijn
als voertuigenhandelaar. Toon BTW-nummer in footer: `BTW BE 0xxx.xxx.xxx`.

**IDA (Independent Dealer Association)**
Voor onafhankelijke occasiondealers die niet merkgebonden zijn. IDA-logo
in trust-strip bewijst lidmaatschap van erkende brancheorganisatie.

**Tweedehandsvehicles garantie / Tweedehandsverenigde garantie**
Wettelijk verplichte garantie op occasions (12 maanden minimum voor
particulieren). Expliciet vermelden op occasionfiche en overzichtspagina.

**KMO-portefeuille (voor dealers met opleidingsaanbod)**
Relevant als de dealer ook rijopleidingen of EV-rijlessen aanbiedt.
Minder relevant voor pure garages.

**Oprichtingsjaar**
"Garage [naam] — opgericht in [jaar]" in footer of over-ons. Autoriteit
via ancienniteit. Vlaamse klanten waarderen stabiliteit.

**Google Reviews**
- Sterrenscore + aantal reviews prominent in hero of trust-strip.
- Gebruik structured data (`AggregateRating` in `LocalBusiness` JSON-LD,
  zie SYSTEM.md §8).
- Autoreview.be als alternatief of aanvulling voor automotive-specifieke
  reviews — citeer scores indien beschikbaar.

**Fotoreportage werkplaats en team**
Foto's van de echte werkplaats, echte mecaniciens in werkkledij, echte
voertuigen in servicebay. Dit is een vertrouwenssignaal op zichzelf.
Zie ook §7 Beeldtaal.

**Plaatsing-hiërarchie:**

| Signaal              | Header | Hero | Trust-strip | Over-ons | Footer |
|----------------------|--------|------|-------------|----------|--------|
| GOCA-logo            | –      | –    | ✓           | ✓        | ✓      |
| Traxio-logo          | –      | –    | ✓           | –        | ✓      |
| Merklogo's erkend    | –      | –    | ✓           | ✓        | –      |
| Google Reviews score | –      | ✓    | ✓           | –        | –      |
| BTW-nummer           | –      | –    | –           | –        | ✓      |
| Oprichtingsjaar      | –      | –    | –           | ✓        | ✓      |
| IDA-logo (dealers)   | –      | –    | ✓           | –        | ✓      |

---

## 7. Beeldtaal

### Correct

**Werkplaatsfotografie:**
- Mecanicien actief aan voertuig (onder motorkap, onder de lift, aan
  remmen).
- Werkplaats met zichtbare liften, gereedschap, diagnostiekcomputer.
- Technicus in branded werkkleding (overalls met logo).
- Hands-on detail: sleutel op moer, sonde in connector, banden op
  stapelrek.

**Voertuigfotografie:**
- Klant-voertuigen in werkplaats, niet op witte infinity-achtergrond.
- Voor/na detailing-shots: vuile vs gewassen lak, matte vs glanzende
  beschermlaag.
- Occasion-foto's: 3/4-aanzicht voor, achter, interieur, dashboard,
  kilometer-teller (authenticiteit).
- Elektrische laadpaal in thuissituatie (oprit, garage) of bedrijf.

**Teamfotografie:**
- Teamfoto in of voor de werkplaats (niet in pak voor witte muur).
- Individuele portretten: technicus bij zijn specialisatiestation.
- Eigenaar met duidelijke autoriteitsuitstraling (werkkleding of nette
  casual — geen stropdas, geen showroompose).

**Klassiekers:**
- Authentieke restauratiefoto's: voor-tijden, carrosserie in behandeling,
  motor open, eindresultaat.
- Geen glamour-studioshots met nep-achtergrond.

### Verboden beeldtaal

- Stockfoto's van lachende mecanicien in vlekkeloze witte overall —
  ongeloofwaardig voor elke Vlaamse klant.
- AI-gegenereerde voertuigen (foute proporties, nep-badges, fantasie-
  verlichtingselementen).
- Generieke "hand op stuur" stockfoto in hero (cliché #1 in automotive).
- Showroom-glansplaatjes die niet overeenkomen met de werkelijke locatie.
- Vrouwen in decoratieve rol naast auto zonder vakinhoudelijke context
  (verouderd, misleidend).
- Marmertextuur of luxe-achtergronden die niet passen bij een
  werkgarage (verkeerd luxury-signaal).

### Aspect-ratio's en technische vereisten

- Hero-foto: 16/9 of 21/9 (cinematic), altijd met donkere overlay voor
  tekstleesbaarheid (`color-mix(in srgb, #000 55%, transparent)`).
- Occasion-kaartfoto: 16/9, `object-fit: cover`.
- Dienstenkaart-icoon: 48×48px of SVG, enkelvoudig `--brand-accent` kleur.
- Portfolio/restauratie-foto: 4/3 of vrij formaat in masonry-grid.
- Alle afbeeldingen: WebP-formaat, `loading="lazy"` behalve LCP-afbeelding,
  `width` en `height` attributen aanwezig (CLS-preventie, SYSTEM.md §6).

---

## 8. Referentie-URL's (geverifieerd)

De volgende drie Belgische sites zijn geverifieerd geladen tijdens de
samenstelling van deze gids (2026-05-07):

### 1. Garage Vandenberghe Vincent BV — www.garagevandenberghe.be
**Type:** onafhankelijke garage, onderhoud & herstelling
**Observatie:** draaiend fotogalerij van werkplaats en voertuigen als
hero, duidelijke dienstenpagina, Vlaamse regionale positionering.
Telefoon in header. Geen merkgebonden afleiding — puur vakgarage-aanbod.

### 2. Cardoen Autosupermarkt — www.cardoen.be
**Type:** grootschalige multimerk-occasiondealer + service center
**Observatie:** sterke value proposition ("Goedkoper dan nieuw,
betrouwbaarder dan tweedehands"), zichtbare voorraadgrootte (+1000
auto's, 25+ merken), geïntegreerd service center voor onderhoud en
herstellingen ook voor niet-Cardoen-klanten. Duidelijke filtering.

### 3. Garage Decock — www.garagedecock.be
**Type:** erkend servicepunt Mercedes-Benz, onderhoud & carrosserie
**Observatie:** merkgebonden positionering in H1 ("Erkend Servicepunt
Mercedes-Benz"), expliciete vermelding van fabrieksopgeleide technici en
originele onderdelen. Mobilo pechbijstand als extra vertrouwenssignaal.
Trust-hiërarchie door merkbinding sterk uitgespeeld.

---

## 9. Negatieve voorbeelden

De onderstaande patronen zijn antipatronen voor automotive sites in
Vlaanderen. Vermijd ze zonder uitzondering.

### Hero-clichés

**"Welkom bij ons garage!" + stockfoto hand op stuur**
De generiekste fout. "Welkom bij" zegt niets. De foto bewijst niets.
Een bezoeker die een garage zoekt voor zijn Mercedes wil weten of u
Mercedes kent — niet dat u hem "welkom heet".

**Autocrosser of raceauto in hero voor een gewone wijkgarage**
Aspirationeel beeld zonder relevantie. Creëert foute verwachtingen.

**Marmertextuur of gouden ornamenten**
Luxury-clichés die niet passen bij een werkplaats. Signaleren verkeerde
positionering en ondermijnen de technische geloofwaardigheid.

### Navigatie en structuur

**Autoplay-carrousel met elke ooit verkochte occasion**
Trage laadtijd, CLS-schendingen, onbeheerbaar voor mobiel. Vervang door
een statische voorraadpagina met filter.

**Hamburger-menu op desktop**
Automotive klanten zijn ouder gemiddeld en verwachten zichtbare navigatie
op desktop. Hamburger op desktop verbergt cruciale diensten.

**Pagina "Diensten" met enkel: "Wij herstellen alle merken"**
Geen detail, geen vertrouwen. Elke dienst verdient een eigen sectie met
wat inbegrepen is en hoe te boeken.

### Prijstransparantie

**"Bel voor info" als enige prijsindicatie voor elke dienst**
Ontmoedigt kwaliteitsklanten. Concurrenten die transparanter zijn winnen
de klik. Geef minstens een startprijs of formule aan.

**PDF-prijslijst in Comic Sans of verouderd Word-ontwerp**
Ondergraaft het vakmanschap dat de rest van de site uitstraalt. Integreer
prijstabellen als echte HTML-tabel (doorzoekbaar, toegankelijk,
responsiever).

**Verborgen BTW-info**
Belgische B2C-klanten verwachten BTW-inclusieve prijzen. Vermeld altijd
"incl. BTW" of "excl. BTW" expliciet.

### Vertrouwenssignalen mist

**Geen GOCA-logo, geen erkenningsnummer, geen merklogo**
Een pagina zonder enige professionele erkenning verliest de vergelijking
met concurrenten die deze badges wel tonen.

**Mechanieker-mascotte cartoon**
Infantiliseert het aanbod. Automotive klanten zoeken een vakman, geen
mascotte. Vervang door een echte teamfoto.

**Google Reviews-widget met 3 reviews en 4,3 sterren verborgen**
Ofwel toon je reviews prominent (als je score goed is), ofwel werk je
eerst aan reviews voor je ze toont. Een verstopt, laag-scorend widget
is erger dan geen widget.

### Technische antipatronen

**Autoplay video in hero zonder `prefers-reduced-motion`-check**
Schending SYSTEM.md §4 (motion) én §5 (toegankelijkheid). Gebruik
statische foto als fallback.

**Occasions-listing zonder pagination**
Laden van 200+ voertuigen op één pagina verbreekt Lighthouse-drempels
(SYSTEM.md §6: LCP < 2.5s, TBT < 200ms).

**`color-mix()` vervangen door hardcoded hex-afgeleiden**
Schending SYSTEM.md §9. Gebruik altijd `color-mix()` voor afgeleiden
van brand-tokens, nooit hardcoded tussenwaarden.
