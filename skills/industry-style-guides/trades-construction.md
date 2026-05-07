---
industry: trades-construction
language: nl-BE
applies_to:
  - plumber
  - electrician
  - roofer
  - contractor
  - hvac
  - mason
  - painter
  - loodgieter
  - elektricien
  - dakwerker
  - schilder
  - metselaar
  - aannemer
  - verwarmingstechnicus
---

# Industry Style Guide — Vakmannen & Bouw (Vlaanderen)

Covers: loodgieters, elektriciens, dakwerkers, aannemers, HVAC-technici,
metselaars, schilders. Doelgebied: België / Vlaanderen / Antwerpen.
Doelpubliek van de gegenereerde site: eigenaars of beheerders die een
vakman willen inhuren — zij willen snelheid, vertrouwen en duidelijke
prijzen.

Raadpleeg het `plumber-example/` referentiesite in
`skills/atelier-design-system/reference-sites/` als primaire visuele
referentie voor deze industrie (zie generation-prompt.md §5).

---

## 1. Esthetische conventies

Vakmannensites moeten competentie en betrouwbaarheid uitstralen. De
bezoeker beslist binnen 5 seconden of hij belt of vertrekt. Geen ruimte
voor decoratieve ambiguïteit.

**Kernprincipes:**

- **Fotografie is het zwaarste visuele gewicht.** Actiebeelden domineren:
  technicus aan het werk, voor/na-vergelijkingen, bedrijfsvoertuig met
  logo. Geen generieke stockfoto's van lachende mannen in veiligheidsvest.
- **Typografie: strak, leesbaar, zonder fratsen.** Aanbevolen lettertypen:
  - Koppen: **Roboto Slab** (autoriteit, leesbaarheid op mobiel) of
    **Geist** (modern, technisch).
  - Broodtekst: **Inter** of **Roboto** — beide laden snel via Google
    Fonts, hoge x-hoogte, uitstekend leesbaar op kleine schermen.
  - Alternatief voor elektriciens en HVAC: **DM Sans** (clean, tech-
    adjacent zonder koude uitstraling).
  - Absoluut vermijden: display-lettertypen, scripts, Comic Sans,
    lettertypen met lage x-hoogte.
- **Kleur: vertrouwen of veiligheid, nooit pastel.**
  - Primaire kleuropties per sub-sector:
    - Loodgieter / sanitair: diepblauw (#1A3A5C of vergelijkbaar),
      accenten in wit of lichtgrijs.
    - Elektricien: veiligheidsgeel (#F5C400) met antraciet (#2B2B2B) of
      marineblauw. Geel als accent, nooit als achtergrond voor grote
      tekstvlakken (contrast-risico, zie SYSTEM.md §5 Accessibility
      Baseline).
    - Dakwerker / aannemer / metselaar: terracotta oranje (#D4571E) of
      baksteen (#B5451B), gecombineerd met warmgrijs (#4A4A4A) en wit.
    - Schilder: neutraal palet (wit, lichtgrijs, één krachtige accentkleur
      die de vakman zelf kiest — zijn verfpalet is zijn visitekaartje).
    - HVAC: koelblauw (#0A6EBD) of industrieel groen (#2D6A4F).
  - Implementeer via `--color-brand-primary` en
    `--color-brand-secondary` in de site-specifieke `global.css`, na de
    import van `tokens.css` (zie SYSTEM.md §9 Brand-Token Override
    System).
- **Layout: kort, direct, geen scrollen vereist voor de kernboodschap.**
  - Telefoonnummer zichtbaar zonder scrollen op elke schermgrootte.
  - Korte alinea's: max. 3 zinnen. Bullet lists voor diensten.
  - Grote CTA-knoppen: minimaal `--space-4` padding verticaal,
    `--space-8` horizontaal (zie tokens.css).
  - De operator moet in 10 minuten, van zijn gsm, begrijpen wat op zijn
    site staat. Schrijf voor hem, niet voor een marketingdirecteur.

---

## 2. Tone of voice in het Nederlands

**Register:** formeel-toegankelijk. Gebruik **"u"** als aanspreekvorm —
de typische klant in Vlaanderen is een huiseigenaar van 35–65 jaar die
"u" verwacht van een professional. "Jij/je" is aanvaardbaar voor jonge
starters of sterk op renovatie gerichte bedrijven, maar altijd consistent
doorvoeren.

**Toon:** direct, actiegericht, geen poespas. De bezoeker heeft een
probleem; de site lost het op. Elke zin moet een doel dienen.

**Concrete voorbeeldfrases (letterlijk bruikbaar als toon-referentie):**

- *"Uw loodgieter in Antwerpen — 24 uur per dag, 7 dagen per week
  bereikbaar."*
- *"Nood aan een spoedinterventie? Bel direct: wij zijn er binnen het
  uur."*
- *"Gratis offerte, zonder verplichtingen. Wij bellen u terug binnen de
  dag."*
- *"Erkend installateur — CERGA-gecertificeerd voor gas en sanitair."*
- *"Al 18 jaar uw vakman in de regio Antwerpen en omstreken."*
- *"Prijzen met BTW, altijd transparant. Geen verrassingen achteraf."*
- *"Wij herstellen, installeren en onderhouden — één aannemer voor alles."*
- *"Uw dak lekt? Bel ons — wij komen langs voor een gratis inspectie."*
- *"Kleine klus of grote renovatie: wij maken tijd voor u."*

**Vermijd:**

- Derde persoon over zichzelf: ~~"Onze klanten waarderen onze
  professionaliteit."~~ → schrijf in de eerste persoon meervoud of
  rechtstreeks tot de klant.
- Marketingjargon: ~~"totaaloplossingen", "innovatieve aanpak",
  "state-of-the-art"~~ — klinkt niet als een vakman.
- Vaag tijdsbestek: ~~"zo snel mogelijk"~~ → geef concrete beloften
  ("binnen 24 uur", "nog deze week").
- Engels in koppen of CTA's tenzij het bedrijf expliciet internationaal
  positioneert.

---

## 3. Paginastructuur

Standaard 4–5 pagina's. Houd het eenvoudig — vakmannen updaten hun site
niet wekelijks; minder pagina's = minder onderhoud.

```
index.astro          — Homepagina (alles boven de vouw is conversiemachine)
diensten.astro       — Dienstenpagina (of meerdere subpagina's per dienst)
over-ons.astro       — Over het bedrijf / de vakman
contact.astro        — Contact + offerte-aanvraagformulier
spoed.astro          — (optioneel) Spoedinterventie — eigen pagina voor
                       urgente klanten; betere SEO voor "spoed loodgieter
                       Antwerpen" zoekopdrachten
```

**Wanneer een aparte spoedpagina:**
Altijd voor loodgieters en HVAC met 24/7-service. Optioneel voor
elektriciens en dakwerkers. Niet van toepassing voor schilders en
metselaars (geen spoedinterventies verwacht).

**SEO-logica:** elke pagina target één primaire zoekterm. Homepagina
target "{stad} {beroep}", diensten target specifieke werkzaamheden,
contact target "offerte {beroep} {stad}".

---

## 4. Sectiepatronen per pagina

### Homepagina (`index.astro`)

**Sectievolgorde (strikt):**

1. **Hero** — max. `--space-24` padding top/bottom (zie tokens.css).
   Bevat: krachtige kop (H1, `--text-4xl` of `--text-5xl`), ondertitel
   met servicebeschrijving + werkgebied, primaire CTA (telefoon), secundaire
   CTA (offerte). Achtergrond: actie-foto of donkere overlay op een
   bouwfoto. Telefoonnummer in de hero is verplicht.

2. **USP-balk** — 3 à 4 iconen met één-regel beschrijving:
   *"Erkend installateur"*, *"24/7 bereikbaar"*, *"Gratis offerte"*,
   *"X jaar ervaring"*. `--space-4` padding, lichte achtergrond of
   accentkleur. Spacing: `--space-6` gap tussen items.

3. **Dienstenblok** — 3 kaarten (of max. 4). Elk kaart: icoon of foto,
   dienstnaam (H3, `--text-xl`), 2-regel beschrijving, link naar de
   dienstenpagina. Grid: `repeat(3, 1fr)` op desktop, `1fr` op mobiel
   (breakpoint 768px, SYSTEM.md §7).

4. **Projectgalerij** — 4 à 6 recente werkfoto's. Masonry of gelijkmatig
   grid. Geen lightbox vereist maar aanbevolen voor UX. Alt-tekst: "[type
   werk] uitgevoerd in [gemeente]" (Dutch, descriptief).

5. **Getuigenis** — 1 à 2 klantreacties met naam, gemeente en
   beoordelingsscore (Google-ster of numeriek). Geen anonieme quotes.

6. **Offerte-aanvraagblok** — formulier (zie §5 CTA-conventies) + korte
   geruststelling ("Wij antwoor den binnen de dag / Geen verplichtingen").

### Dienstenpagina (`diensten.astro`)

- Intro-kop + 1 alinea over het dienstenaanbod.
- Per dienst: H2-kop, 3–5 regels beschrijving, (optioneel) foto.
- Sluit af met CTA naar contact of offerte-formulier.
- Voor loodgieters: onderverdeel in sanitair, verwarmingsinstallatie,
  ontstopping, spoedinterventie.
- Voor elektriciens: keuring, installatie, domotica, renovatie.

### Over ons (`over-ons.astro`)

- Oprichter/eigenaar naam en gezicht (echte foto, geen avatar).
- Jaren ervaring, werkgebied, eventueel familiebedrijf-verhaal.
- Certificeringen en erkenningen (zie §6 Trust signals).
- Teamfoto indien van toepassing (klein familiebedrijf = vaak 1–3
  personen).
- Eindig met CTA: "Vraag een offerte aan" of telefoonnummer.

### Contact (`contact.astro`)

- Telefoonnummer groot en klikbaar (tel:-link).
- E-mailadres.
- Werkgebied: opsomming van postcodes of gemeenten die worden bediend
  (conversie-kritisch — bezoekers willen weten of u bij hen komt).
- Kaart of postcodenlijst van het werkgebied.
- Offerte-aanvraagformulier (zie §5).
- Geen openingsuren verbergen — ook als u 24/7 beschikbaar bent,
  vermeld dit expliciet.

---

## 5. CTA-conventies

**Prioriteit 1 — telefoon.** De meeste vakmanklanten bellen liever dan
dat ze een formulier invullen. Telefoonnummer is altijd de primaire CTA.

```
Bel direct: 03 XXX XX XX
```

Implementeer als `<a href="tel:+32XXXXXXXXX">` — nooit als platte tekst.
Op mobiel triggert dit een directe oproep. Gebruik `--text-2xl` of groter
voor het nummer in de hero.

**Prioriteit 2 — offerteformulier.** Kort en laagdrempelig:

| Veld | Type | Verplicht |
|---|---|---|
| Naam | text | ja |
| Telefoonnummer | tel | ja |
| Postcode | text | ja |
| Type werk (keuzemenu of vrij veld) | select / textarea | ja |
| Bericht (extra details) | textarea | nee |

Geen e-mailadres verplicht stellen — verhoogt uitval. Naam + telefoon +
postcode is voldoende om terug te bellen.

**CTA-knopteksten (Dutch, direct):**

- Primair: *"Bel direct"* / *"Bel nu"*
- Secundair: *"Vraag gratis offerte"* / *"Offerte aanvragen"*
- Spoed: *"Spoedinterventie — bel altijd"*
- Formulier submit: *"Verstuur aanvraag"* (geen "Submit" of "Verzenden")

**Sticky header op mobiel:** telefoonnummer + belknop altijd zichtbaar.
Implementeer als `position: sticky; top: 0` op de header. Padding:
`--space-3` verticaal (zie tokens.css).

**Voor 24/7-diensten:** voeg een urgentie-indicator toe in de hero:

```
Spoedgeval? Wij zijn dag en nacht bereikbaar.
```

---

## 6. Vertrouwenssignalen

Vertrouwen wordt visueel opgebouwd — zeg het niet, toon het.

**Primaire signalen (altijd tonen):**

- **BTW-nummer** — wettelijk verplicht te vermelden en een vertrouwenssignaal.
  Formaat: `BTW BE 0XXX.XXX.XXX`. Plaats in de footer of het contactblok.
- **Jaren ervaring** — numeriek, prominent: *"18 jaar ervaring"*, niet
  *"jarenlange ervaring"*.
- **Aantal afgewerkte projecten** — optioneel maar effectief: *"Meer dan
  500 tevreden klanten in de regio Antwerpen"*.

**Sector-specifieke certificeringen:**

| Beroep | Te vermelden erkenning |
|---|---|
| Loodgieter / HVAC | CERGA-erkenning (gas), Synergrid (elektriciteitsaansluiting) |
| Elektricien | NAVB / BeSa keuring, erkend door VREG |
| Aannemer | Confederatie Bouw lidmaatschap, VCA-certificaat |
| Dakwerker | BDA (Belgian Dak Associatie), constructief attest |
| Schilder | BVSA (Belgische Vereniging Schilders en Afwerkers) |

Toon logo's van certificerende instanties waar beschikbaar — niet als
tekst-URL maar als afbeelding met alt-tekst.

**Galerij en reputatie:**

- Google Reviews-score (haal live op of toon statisch screenshot met
  datum). Minimumdrempel voor vermelding: ≥ 4,2 / 5.
- Werkenmetbouwen.be beoordelingen indien van toepassing.
- Foto van het bedrijfsvoertuig met logo — signaleert professionele
  organisatie.
- Garantie-informatie: *"10 jaar garantie op alle installaties"* of
  sectorspecifiek.

**Wat NIET te doen:**

- Geen niet-geverifieerde claims ("beste loodgieter van Antwerpen").
- Geen anonieme getuigenissen ("Een tevreden klant").
- BTW-nummer niet verstoppen in een voetnoot — zet het zichtbaar.

---

## 7. Beeldgebruik

**Doel van beelden op vakmannensites:** bewijs leveren dat het werk
bestaat, goed uitgevoerd is en professioneel aanpakt.

**Wat werkt:**

- **Actiefoto's tijdens het werk** — de technicus met zijn handen aan
  het werk: installateur die een ketel monteert, elektricien aan het
  schakelbord, dakwerker die pannen legt. Camera-hoek iets van onder of
  zij, zodat het vakmanschap zichtbaar is.
- **Voor/na-vergelijkingen** — twee foto's naast elkaar of geschoven
  slider. Concrete ruimtes, herkenbaar voor de bezoeker (badkamer,
  zolder, gevel). Geen fake "studio"-aanzichten.
- **Teamfoto of portretfoto van de eigenaar** — humaniseert het bedrijf.
  Geen pak nodig; werkkleding is beter.
- **Bedrijfsvoertuig** — wagen/bestelwagen met logo op het bedrijfsterrein
  of voor een woning. Laat zien dat het serieus is.
- **Projectdetails** — close-up van afgewerkt werk: nette koperleiding,
  strakke voegen, egale verflaag.

**Wat te vermijden:**

- Generieke stockfoto's van lachende arbeiders in branded shirts —
  iedereen herkent ze als stock.
- Beelden van perfect gestaged interieurs die er te goed uitzien (ongelofwaardig).
- Foto's zonder context (wie? wat? waar?).
- Beelden die niet van de klant zelf zijn zonder attributie.

**Technische vereisten (SYSTEM.md §6 Performance Baseline):**

- Alle afbeeldingen in WebP of AVIF. Gebruik Astro's `<Image>`-component
  voor automatische conversie en dimensie-inferentie.
- LCP-afbeelding (doorgaans de hero-foto) mag NIET `loading="lazy"` hebben.
- Geef altijd expliciete `width` en `height` om CLS te vermijden
  (SYSTEM.md §6).
- Alt-tekst in het Nederlands, beschrijvend en locatiespecifiek:
  *"Loodgieter installeert een nieuwe condensatieketel in Mortsel"*.

**Als de klant geen eigen foto's aanlevert:**

Gebruik Unsplash-foto's in het genre (bouw, sanitair, elektrisch werk)
met vermelding van de fotograaf in de HTML-comments. Geef voorkeur aan
foto's met Europees / Belgisch interieur-gevoel (niet Amerikaans).
Zet een aantekening in het site-dossier dat echte foto's de conversie
verbeteren en aanbevolen zijn.

---

## 8. Referentiesites

Drie geverifieerde en bereikbare Belgische/Vlaamse vakmannensites per
mei 2026. Sterktes en beperkingen worden eerlijk vermeld.

### 1. Santech BV — Loodgieter Antwerpen
**URL:** `https://santech.be`

Professioneel opgezette site voor een Antwerpse loodgieter. Sterke
punten: telefoonnummer prominent in de hero, duidelijke dienstenindeling
(sanitair / centrale verwarming / ontstopping), spoedservice expliciet
benoemd. WordPress-basis met aangepast thema — niet de meest performante
stack, maar de inhoud en structuur zijn een solide referentie. Bruikbaar
als inhoudelijke referentie voor hero-structuur, dienstblok en
vertrouwenssignalen.

### 2. STEVIN — Elektricien Antwerpen
**URL:** `https://www.elektricien-antwerpen.be`

Compacte site voor een Antwerpse elektricien. Sterke punten: directe
toon (*"Nood aan een elektricien? Wij staan voor u klaar."*), telefoon
en offerteknop onmiddellijk zichtbaar, "Waarom STEVIN?"-blok als
vertrouwenssignaal. Beperkingen: visueel eenvoudig, beperkte fotogalerij.
Bruikbaar als referentie voor minimale maar effectieve vakmannen-site met
sterke CTA-hiërarchie.

### 3. Haachtse Dakwerken
**URL:** `https://www.haachtsedakwerken.be`

Dakwerkerbedrijf in Haacht (Vlaams-Brabant). Wix-gebouwde site —
lagere technische kwaliteit (render-blocking scripts, geen WebP-optimalisatie)
maar goede inhoudelijke referentie voor een kleine familiebedrijf:
realisatiegalerij met echte projectfoto's, duidelijk contactblok met
telefoonnummer en e-mail, postcode + gemeente vermeld. Bruikbaar als
voorbeeld van hoe een kleine aannemer zijn werk in beeld brengt; niet
als technisch voorbeeld.

---

## 9. Anti-patronen — wat te vermijden

Dit zijn de meest voorkomende fouten op Vlaamse vakmannensites. Genereer
nooit een site die één van deze patronen bevat.

**Visuele anti-patronen:**

- **Stockfoto-held** — een grote headerafbeelding van een lachende
  aannemer in een generiek veiligheidsvest, duidelijk niet van het
  bedrijf zelf. Vernietigt onmiddellijk het vertrouwen.
- **Wix/Bootstrap-slider met generieke teksten** — roterend
  diashow-formaat met zinnen als *"Kwaliteit • Service • Expertise"*
  zonder enige concreetheid. Gebruikt door zoveel sites dat het
  onzichtbaar is geworden.
- **Pastelkleuren of lifestyle-fotografie** — past bij een spa of
  boetiek, niet bij een loodgieter. Signaleert verkeerd register.
- **Ontbrekende of verborgen telefoon** — het telefoonnummer staat alleen
  op de contactpagina, niet in de navigatie of de hero. Dit is de
  grootste conversiefout op vakmannensites.
- **Comic Sans of decoratieve handschrift-lettertypen** — komen nog voor
  op oudere Vlaamse kmo-sites. Onherroepelijk unprofessioneel.

**Copy-anti-patronen:**

- **Derde persoon over het eigen bedrijf:** *"Onze klanten waarderen de
  professionaliteit van ons team."* — schrijf in eerste persoon of
  rechtstreeks tot de bezoeker.
- **Geen werkgebied vermeld** — de bezoeker weet niet of u bij hem komt.
  Een ontbrekende postcodenlijst of gemeenteopgave = verloren lead.
- **Vage garanties** — *"wij garanderen kwaliteit"* zonder specificatie.
  Schrijf: *"5 jaar garantie op alle installaties"*.
- **Ontbrekend BTW-nummer** — wettelijk vereist en een vertrouwenssignaal.
  Ontbreekt op verrassend veel kleine vakmannensites.
- **Engels in koppen op een Vlaamse B2C-site** — *"Our Services"*,
  *"Contact Us"* — dit is een Wix/template-erfenis en geeft een
  amateuristische indruk.

**Structurele anti-patronen:**

- **Te veel pagina's** — vakmannensites met 12+ pagina's die elk
  nauwelijks 100 woorden bevatten. Beter: 4–5 rijke pagina's.
- **Formulier als enige contactoptie** — geen telefoon, alleen een
  contactformulier. Vakmanklanten bellen; een formulier-only site is
  een conversiemoordenaar.
- **Ontbrekende mobiele versie** — meer dan 60% van het zoekverkeer
  voor vakmannen komt van mobiel. Niet-responsieve sites zijn niet
  acceptabel (SYSTEM.md §7 Responsive Baseline).
- **Trage laadtijd door ongeoptimaliseerde foto's** — grote JPEG's
  zonder compressie zijn het vaakst voorkomende prestatieprobleem op
  vakmannensites. Alle afbeeldingen moeten WebP zijn en `width`/`height`
  hebben (SYSTEM.md §6 Performance Baseline).
