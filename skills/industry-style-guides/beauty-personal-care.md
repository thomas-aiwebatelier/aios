---
industry: beauty-personal-care
language: nl-BE
applies_to: [kapper, salon, barbershop, beauty-salon, nagelstudio, lash-studio, brow-bar, day-spa, esthetic-clinic]
---

## Esthetische conventies

Deze sector kent twee dominante visuele archetypes. Veel salons kiezen één archetype consequent; sommige high-end gemengde salons combineren elementen van beide.

### Archetype A — Luxe-feminien (damessalon, day-spa, esthetic-clinic, brow/lash-studio)

**Kleurpalet**

| Token | Typische waarde | Rol |
|---|---|---|
| `--brand-primary` | warm cremewit (`#FAF7F4`) of zacht blush (`#F2E4DC`) | Achtergrond van hero en secties |
| `--brand-accent` | rosé-goud (`#C4966A`) of burgundy (`#6B2737`) | CTA-knoppen, lijnaccenten, prijscodering |
| `--brand-bg` | gebroken wit (`#FDFAF8`) | Pagina-achtergrond |
| `--brand-fg` | diepe taupe/antraciet (`#2A2420`) | Lopende tekst, navigatie |

Derivaten via `color-mix()`:
- Subtiele hover op CTA: `color-mix(in srgb, var(--brand-accent) 80%, black)`
- Soft card-achtergrond: `color-mix(in srgb, var(--brand-primary) 30%, var(--brand-bg))`
- Semi-transparante overlay op hero: `color-mix(in srgb, var(--brand-fg) 40%, transparent)`

**Typografie**

- Display (h1, hero-tagline): serif met hoge x-hoogte — Cormorant Garamond, Playfair Display, of Libre Baskerville. Grootte: `--text-4xl` tot `--text-5xl`. Letter-spacing licht negatief (−0.02em).
- Body en labels: humanistische sans-serif — Jost, DM Sans, of Inter Light. Grootte `--text-base` voor lopende tekst, `--text-sm` voor meta en prijsonderschrift.
- Hiërarchie: max. 2 lettertypefamilies per site (één serif display + één sans body).

**Layout en ruimte**

- Royale witruimte is een bewuste luxe-signaal: gebruik `--space-24` of `--space-32` als verticale sectionering.
- Hero minimaal 90vh, met uitsnede-foto (portret of detailshot) in een asymmetrisch 60/40-raster.
- Diensten-grid: 2-koloms op desktop (`gap: var(--space-8)`), 1-koloms op mobiel.

**Beweging**

- `transition-duration: var(--dur-standard)` op hovers en CTA-knoppen.
- Page-entry: subtiele fade-in van secties (`opacity: 0 → 1`, `var(--dur-hero)`, `ease: var(--ease)`).
- Zachte parallax op hero-achtergrond is welkom; bouncy of elastische animaties zijn stijlbreuk.
- Verplicht: `@media (prefers-reduced-motion: reduce)` — alle transities op `var(--dur-micro)` of uit.

---

### Archetype B — Masculien modern (barbershop, herrenkapper, fade-specialist)

**Kleurpalet**

| Token | Typische waarde | Rol |
|---|---|---|
| `--brand-primary` | mat zwart (`#111111`) of antraciet (`#1C1C1C`) | Primaire achtergrond, navigatiebalk |
| `--brand-accent` | baksteenrood (`#B5451B`), amber (`#D4820A`), of kopergroen (`#3D6B5E`) | CTA, hover-states, prijsaccent |
| `--brand-bg` | donkergrijs (`#181818`) of warm off-black (`#1A1714`) | Secties-achtergrond |
| `--brand-fg` | puur wit (`#FFFFFF`) of warm crème (`#F5F0E8`) | Alle lopende tekst |

Derivaten via `color-mix()`:
- Hover op accent: `color-mix(in srgb, var(--brand-accent) 85%, white)`
- Lichte separator: `color-mix(in srgb, var(--brand-fg) 12%, transparent)`

**Typografie**

- Display: condensed of extended grotesque — Oswald, Bebas Neue, Barlow Condensed. Hoofdletters met wide letter-spacing (`0.08em` tot `0.15em`). Grootte `--text-4xl` tot `--text-5xl`.
- Body: geometrische of neutrale sans — Inter, Neue Haas Grotesk, Aktiv Grotesk. `--text-base` voor kopij, `--text-sm` voor labels.
- Industriële detail-elementen: dunne horizontale lijn (1px, `var(--brand-fg)` op 20% opacity) als sectie-scheiding.

**Layout en ruimte**

- Strakker dan archetype A: `--space-16` als standaard verticale sectionering.
- Hero: volledig breedte, donker geoverlayd beeld van de ruimte of een kapsessie. Tekst links uitgelijnd met CTA.
- Prijslijst: tabel-structuur of 2-koloms definitielijst; geen prijzen verstoppen.

**Beweging**

- Dezelfde tokenconventies als archetype A, maar gebruik `--dur-micro` voor hover-feedback op nav-links — snappy voelt moderner hier.

---

### Gemengde salons

Sommige zaken (bv. een premium mixed salon) combineren: dark hero + blush-toned diensten-sectie + serif naam + sans-serif body. Kies bij twijfel: het merk bepaalt, niet de dienstenmix. Stem kleur- en typografiekeuze af op de doelgroep die de hoogste omzet genereert en zorg voor interne consistentie.

---

## Tone of voice in het Nederlands

### "u" of "jij" — beslisregel

| Segment | Aanspreekvorm | Motivatie |
|---|---|---|
| Day-spa, esthetic-medicine, anti-ageing clinic | **u** | Oudere doelgroep, medische connotatie, hoge ticketprijs |
| High-end damessalon (kleurspecialist, keratin, extensions) | **u** | Aspirationeel, luxe-positionering |
| Barbershop, herrenkapper | **jij** | Informele mannenruimte, community-gevoel |
| Nagelstudio, brow/lash-studio (jonger publiek) | **jij** | Jong, trendy, social-media-gedreven |
| Gemengde salon zonder duidelijk profiel | **u** als veilige keuze | Nooit mixen op dezelfde pagina |

**Gulden regel**: beslis vóór de eerste copy-zin en wijk nooit af, ook niet in placeholder-tekst of foutmeldingen.

---

### Ritme en stijl

Korte zinnen. Sensorisch waar mogelijk. Vermijd corporate wellness-jargon.

**Goed (luxe-salon, u-register):**
> "Uw haar verdient meer dan een knipbeurt. In onze kleurcabine nemen we de tijd voor een grondige huidanalyse en een eerlijk adviesgesprek."

**Goed (barbershop, jij-register):**
> "Elke fade is handwerk. Geen timer, geen haast. Kom wanneer het jou past — wij zijn er."

**Goed (nagelstudio, jij-register):**
> "Gelnagels die drie weken meegaan. Boek je afspraak online en kies je kleur alvast uit ons lookbook."

**Slecht (generiek spa-jargon):**
> "Welkom bij BellaVita Wellness. Wij bieden u een unieke beleving van rust en schoonheid in een luxueuze omgeving."

**Slecht (korting-spam):**
> "HUGE DEAL — 50% korting op je eerste behandeling! Bel NU!"

**Slecht (Engels filler in Nederlandse copy):**
> "Onze stylisten zijn ware experts in het creëren van de perfect blowout en glossy finish."

---

### Sleutelwoorden die werken in deze sector

- **Kapper/kleur**: *behandeling*, *kleurconsult*, *huidanalyse*, *colourist*, *kleurcabine*, *balayage*, *highlights*, *grijs camoufleren*, *keratinebehandeling*, *afspraak*
- **Barbershop**: *fade*, *trim*, *skin fade*, *scheerbeurt*, *hot towel*, *baard*, *contour*, *klassiek scheren*, *traditioneel ambacht*
- **Beauty/nagels/lashes**: *gelnagels*, *manicure*, *pedicure*, *lash lift*, *brow lamination*, *sugaring*, *epilatie*, *huidverzorging*, *pakket*, *cabine*
- **Day-spa/esthetic-clinic**: *huidanalyse*, *behandelprotocol*, *serum*, *hydratatie*, *radiofrequentie*, *microneedling*, *resultaatgericht*, *huidtherapeut*

### Vermijden

- "Passie voor uw haar/huid/nagels" als losstaande zin zonder bewijs.
- "State-of-the-art technieken" — te vaag, te Engels.
- Opsommingslijst van ALLE diensten in de hero — dat is voor de dienstenpagina.
- Overmatig gebruik van uitroeptekens en emoji in koppen.
- Vertaalde Engelse slogans die klinken als Google Translate: "Uw schoonheid, onze missie."

---

## Paginastructuur

### Standaard paginaset (4–6 pagina's)

| Pagina | Verplicht | Optioneel |
|---|---|---|
| Home | Altijd | — |
| Behandelingen / Prijzen | Altijd | Kan gesplitst zijn: diensten + apart prijzenpagina |
| Over ons / Team | Altijd | Teamleden als aparte subpagina bij > 6 medewerkers |
| Boek online | Altijd (of iframe op home) | Eigen boekingspagina of redirect naar Treatwell/SalonKee/Booksy |
| Contact | Altijd | — |
| Galerij / Lookbook | Optioneel | Sterke meerwaarde bij fotogenieke salons |
| Blog / Tips | Optioneel | Alleen als er capaciteit is voor regelmatige updates |

### Navigatie-volgorde (aanbevolen)

```
[Logo]  Behandelingen  Prijzen  Over ons  Galerij  Contact  [Boek een afspraak →]
```

De boekingsknop (`--brand-accent` als achtergrond, `var(--brand-bg)` als tekstkleur) staat altijd uiterst rechts en is visueel onderscheiden van de reguliere nav-links.

### Mobiele navigatie

- Hamburgermenu of bottom-nav met max. 5 items.
- "Boek online" altijd als sticky-knop onderaan het scherm op mobiel (`position: fixed; bottom: var(--space-4)`).

---

## Sectiepatronen

### Home-pagina

1. **Hero** (min. 90vh)
   - Groot beeld: portretfoto van een behandeling of het salon-interieur.
   - Naam van het salon of de kleurstudio (display-type, `--text-4xl` of `--text-5xl`).
   - Tagline: max. 10 woorden, sensorisch of positionerend.
   - Primaire CTA: "Boek een afspraak" — linkt naar boekingswidget of -pagina.
   - Optioneel: booking-partner-logo (Treatwell, SalonKee, Booksy) als klein inline-logo naast de CTA.

2. **Diensten-teaser** (3–4 uitgelichte behandelingen)
   - Kaartjes met beeld + dienstbenaming + bondige omschrijving (max. 15 woorden) + "Meer info"-link.
   - GEEN prijzen op home; verwijs naar de prijzenpagina.

3. **Over ons-anker** (2–3 regels)
   - Eigenaar/oprichter foto (echte foto, geen stock) + bondige bio + "Ontdek ons verhaal"-link.

4. **Merken-blok** (indien van toepassing)
   - Logo's van gedragen merken: Wella, Davines, ICON, Aveda, Schwarzkopf, L'Oréal Professionnel, Kerastase, Olaplex.
   - Horizontale rij of 4-koloms grid, grijswaarde logos op lichte achtergrond. `gap: var(--space-8)`.

5. **Beoordelingen-blok**
   - 2–3 citaten (Google, Treatwell) met naam + datum. Geen sterren-grafiek op home.
   - Optioneel: link naar volledig Treatwell/Google-profiel.

6. **Instagram-feed** (optioneel)
   - Max. 6 recente posts als grid. Gebruik een embed-oplossing, geen handmatige screenshots.
   - Link naar Instagram-profiel met followercount indien > 3.000.

7. **Locatie-blok**
   - Adres, openingsuren (tabel), Google Maps embed (volledig breedte of naast de uren).
   - Klikbare `tel:`-link en `mailto:`-link.

---

### Behandelingen / Prijzen-pagina

- **Structuur per categorie**: gebruik `<section>` met `<h2>` per dienstencategorie (bv. "Knippen", "Kleur", "Behandelingen", "Nagels").
- **Per dienst**: naam + korte omschrijving (max. 2 regels) + prijs (of prijsrange "vanaf €X").
- **Toon prijzen openbaar**: transparantie is een concurrentievoordeel in deze sector. Vermijd "vraag ons om de prijs".
- **Booking-widget integratie**: SalonKee/Treatwell/Booksy iframes krijgen een vaste minimumhoogte (`min-height: 600px`) en worden geplaatst na de dienstenlijst of op een aparte boekingspagina. Voeg `loading="lazy"` toe aan de iframe.
- **Pakketformules**: highlight als card met subtiele achtergrond via `color-mix(in srgb, var(--brand-primary) 15%, var(--brand-bg))`.

---

### Over ons / Team-pagina

1. **Openerblok**: grote portretfoto eigenaar(s) + citaat in hun eigen woorden, gecursiveerd, `--text-xl`.
2. **Verhaaltekst**: max. 300 woorden. Vertel het waarom, niet het wat. Tijdslijn optioneel.
3. **Opleidingen & merken**: Schwarzkopf-certificering, L'Oréal Academy, Wella-opleiding — als tekstlijn of badge-rij. Geen logowand met 15 merken.
4. **Team-blok** (optioneel bij > 3 medewerkers): portret + naam + specialisatie (bv. "kleurspecialist", "baard- en snorexpert"). `gap: var(--space-8)`, 3-koloms op desktop.

---

### Galerij / Lookbook (optioneel)

- Masonry-grid of strakke 3-koloms grid. Geen slideshow-carrousel van alle haarknippen ooit.
- Filter op categorie (bv. "Kleur", "Knippen", "Nagels") bij grote collecties.
- Alt-teksten beschrijven de behandeling, niet de persoon: "Balayage met warme koperaccenten op halflang haar."
- Lightbox is welkom; autoplay is verboden.

---

### Boek online-pagina

- Duidelijke instructie welke partner wordt gebruikt (Treatwell, SalonKee, Booksy).
- Indien iframe: stel hoogte in via `ResizeObserver` of een vaste `min-height: 700px`. Vermeld fallback (telefoonnummer / e-mail) bij laadproblemen.
- Alternatieve boekingskanalen vermelden: "Liever via DM? Stuur ons een berichtje op Instagram."

---

## CTA-conventies

### Primaire CTA

```
Boek een afspraak online
```

- Kleur: `var(--brand-accent)` als achtergrond, `var(--brand-bg)` als tekst (of omgekeerd bij donker archetype).
- Grootte: `--text-base` (normale knop) of `--text-lg` (hero-knop).
- Padding: `var(--space-3) var(--space-6)`.
- Hover: `color-mix(in srgb, var(--brand-accent) 80%, black)`, `transition-duration: var(--dur-micro)`.
- Linkt altijd door naar de boekingspartner of de interne boek-online-pagina.

### Secundaire CTA

```
Bel voor advies
```

- Ghost-knop: border `1px solid var(--brand-accent)`, transparante achtergrond.
- Altijd als `<a href="tel:+32...">` — klikbaar op mobiel.

### Tertiaire kanalen

```
DM ons op Instagram voor jouw kleurconsult
```

- Inline tekst-link of klein Instagram-icoontje + tekst. Geen aparte knop; plaatsen in de hero-ondertekst of het contact-blok.

### Negatieve CTA-patronen (verboden)

- Popup bij pagina-enter met kortingscode ("Geef je e-mail, krijg 15% korting!").
- Volledige-scherm overlay vóór de inhoud geladen is.
- CTA-tekst: "Klik hier", "Meer informatie", "Bekijk onze diensten" zonder actiewerkwoord.
- Meerdere primaire CTAs naast elkaar in de hero (max. 1 primair + 1 secundair).

---

## Vertrouwenssignalen

### Eigenaar/colourist-profiel

- **Foto + naam + jaren ervaring** op home of over-ons. "Sofie, 14 jaar colourist — gespecialiseerd in balayage en grijs camoufleren."
- Opleidingen: vermeld specifiek (Wella Colour Academy, L'Oréal Professionnel Partner, Schwarzkopf-gecertificeerd) — generiek "gecertificeerd" telt niet.
- Instagram-followercount alleen tonen als > 3.000 en als het account actief is (laatste post < 4 weken geleden).

### Productmerken

Vermelding van gedragen merken verhoogt geloofwaardigheid bij geïnformeerde klanten. Rangschik naar herkenbaarheid:

- **Tier 1** (brede herkenning): Wella Professionals, L'Oréal Professionnel, Schwarzkopf Professional, Kérastase, Olaplex.
- **Tier 2** (niche maar prestige): Davines, ICON, Aveda, Kevin Murphy, Shu Uemura Art of Hair.
- Weergave: logo's als grijswaarde-row op lichte achtergrond. Geef max. 6 merken mee op de website — een volledige logowand verliest geloofwaardigheid.

### Boekingsplatform-koppeling

- Treatwell-badge, SalonKee-badge of Booksy-rating direct zichtbaar naast de primaire CTA.
- Google Reviews-gemiddelde met sterren en aantal beoordelingen (bv. "4,8 ★ op Google — 127 recensies").

### Galerij als vertrouwenssignaal

- Echte klantfoto's (met toestemming) > stock. Voor/na-foto's werken sterk bij kleurbehandelingen.
- Ruimtefoto's (stoel + spiegel + licht) tonen professionaliteit van de omgeving.

### Structuurdata

Genereer altijd `LocalBusiness` JSON-LD met minimaal `@type`, `name`, `address`, `telephone`, `url`, `openingHours`, `priceRange`. Voor salons met meerdere specialisaties: gebruik `@type: ["HairSalon", "LocalBusiness"]` of `["NailSalon", "LocalBusiness"]` naargelang.

---

## Beeldmateriaal

### Wat werkt

- **Behandelingsfoto's op echte klanten** (met toestemming): kapsessie, nagellak-applicatie, lash lift. Toon het vakmanschap, niet alleen het resultaat.
- **Voor/na** bij kleurbehandelingen: naast elkaar of slide-vergelijking. Voeg alt-tekst toe die de techniek beschrijft.
- **Interieur-sfeershots**: kappersstoel + spiegel + daglicht, wachthoek, productplanken. Dit geeft een gevoel van de ruimte vóór de klant binnenstapt.
- **Eigenaar/team in actie**: niet poserend, maar werkend — schaar in hand, kleur aanbrengen, baard scheren.
- **Productshots** van gedragen merken (fles Davines, Wella-kleurpoeder): versterk de merk-associatie.

### Technische vereisten

- Formaat: WebP met JPEG-fallback.
- Hero: min. 1600px breed, geoptimaliseerd voor < 200 KB.
- Galerij-thumbnails: 800px breed, `loading="lazy"`.
- Alt-teksten: beschrijvend en behandelingsgericht. "Colourist brengt balayage aan op donker haar in Antwerpse kapsalon" — NIET "mooi haar meisje foto".

### Wat absoluut vermeden moet worden

- **Generieke stock met rozenbladen en kaarsjes op een nek**: deze cliché spa-beelden ondermijnen geloofwaardigheid in 2025.
- **Bargain-bin haarkleur-stock**: te glad, te perfect, te gevarieerd in stijl — klanten herkennen het.
- **AI-gegenereerde gezichten**: in deze sector met hoge aandacht voor gelaat-details zijn uncanny valley-effecten direct herkenbaar en vertrouwensbreukend.
- **Slecht gecropte Instagram-screenshots** als galerij-vervanging: lage resolutie, inconsistente grootte, UI-elementen zichtbaar.
- **Sparkle/glitter-animaties of glinsterende tekst-effecten**: dated en niet in lijn met welk van de twee archetypes dan ook.
- **Autoplaying achtergrondmuziek**: onmiddellijke dealbreaker voor elke doelgroep.

### Toestemming en privacy

- Klantfoto's vereisen expliciete toestemming (mondeling of schriftelijk). Vermeld dit in de alt-tekst of caption niet, maar zorg dat het intern gedocumenteerd is.
- Geen herkenbare gezichten zonder toestemming in hero of ogp-images.

---

## Referentie-URL's (geverifieerd)

Drie Belgische referentiesites die in mei 2026 met succes werden geladen en die elk een ander archetype vertegenwoordigen:

### 1. Atelier Géraud — Antwerpen
**URL**: [https://atelier-geraud.com](https://atelier-geraud.com)
**Type**: High-end damessalon, Antwerpen — lid van Leading Salons of the World.
**Waarom referentie**:
- Helder luxe-positionering: "Your Style, Our Signature" — kort, aspirationeel, geen spa-clichés.
- Productwebshop geïntegreerd (Shu Uemura, Noir Stockholm) naast de salonboekingen — een volwassen contentarchitectuur voor een prestige-salon.
- Gebruik van Optios als boekingspartner (gangbaar in Vlaanderen naast Treatwell/SalonKee).
- Instagram-feed geïntegreerd in de homepage met recente kleur-posts — actief en brand-consistent.

### 2. ROMAIN Barbershop & Academy — Gent
**URL**: [https://www.romainghent.be](https://www.romainghent.be)
**Type**: Heritage barbershop met academy en productlijn, Gent.
**Waarom referentie**:
- Sterk masculien merk: "A Heritage Grooming House for Men — Objects, rituals & tools developed through daily practice." Geen knipcliché.
- Gediversifieerd model: barbershop + academy + webshop (razor sharpening kits, fragrances) op één domein, elk met eigen sectie.
- Squarespace-gebaseerd maar visueel coherent: donker kleurpalet, grote lifestyle-fotografie, geen kleur-overload.
- "Book now" via Optios direct in de hero — geen stappen tussendoor.

### 3. Envy Antwerp Social Club — Antwerpen
**URL**: [https://envyantwerp.com](https://envyantwerp.com)
**Type**: Premium gemengde salon (haar + massage + beauty), Antwerpen.
**Waarom referentie**:
- Gemengd archetype goed gebalanceerd: luxueuze omschrijving ("beauty is not performed, but orchestrated") zonder spa-clichés.
- Sterke social proof op homepage: meerdere klantrecensies met naam en specifieke styliste vermeld — vertrouwen via personaliteit, niet via sterren.
- Meerdere talen (NL/EN) — goed model voor salons in internationaal Antwerpen.
- Optios-boeking geïntegreerd, sticky "Make an appointment" in de navigatie.

---

## Negatieve voorbeelden

Onderstaande patronen ondermijnen geloofwaardigheid en/of conversie. Vermijd ze actief.

### Visuele clichés

- **Rozenbladen-op-nek hero**: het universele lazy spa-stockfoto. Communiceert niets over het specifieke salon.
- **Kaarsjes + handdoeken compositie als enige interieurshot**: doet denken aan een middelmaatig wellnesshotel, niet aan een vakkundig behandelcentrum.
- **Glitter- en sparkle-animaties op tekst of logo**: amateuristisch in beide archetypes.
- **Trage karussel van álle haarknippen ooit gemaakt**: visuele chaos, geen curatief onderscheid.

### Copy-clichés

- **"Welkom bij [Salonaam] Wellness & Beauty. Wij bieden u een unieke beleving..."** — generieke welkomstfrase die op elke salon kan plakken. Begin in medias res.
- **"Passie voor uw haar"** als losstaande hero-tagline — bewijs het via concrete diensten en echte klantbeelden, benoem het niet.
- **"State-of-the-art technieken en producten"** — betekenisloze frase. Noem de specifieke techniek of het merk.
- **Volledig Engelse tagline op een Vlaamse salon zonder expliciete positioneringsreden**: inconsistent met de doelgroep, tenzij het merk bewust internationaal positioneert.

### UX-patronen

- **Entry-popup met kortingsaanbod**: "Geef je e-mail voor 20% op je eerste afspraak!" — te erg voor een salon dat op kwaliteit wil positioneren. Bovendien strafft Google dit mobiel.
- **Autoplaying achtergrondmuziek of -video met geluid**: directe sluitknop-trigger.
- **Slecht gecropte Instagram-screenshots als galerij**: lage resolutie, zichtbare Instagram-UI, inconsistente formaten — gebruik een embed of eigen geëxporteerde foto's.
- **Geen zichtbare prijzen op de behandelingenpagina**: in een sector waar Treatwell en Google de concurrentie naast elkaar toont, is prijsopaciteit een conversiekiller. "Vraag ons om de prijs" stuurt bezoekers naar de concurrent.
- **Boekingswidget zonder fallback**: als het Treatwell/SalonKee iframe uitvalt, moet er een telefoonnummer of e-mailadres zichtbaar zijn. Nooit een lege `<iframe>` zonder foutafhandeling.
- **Team-pagina met enkel voornamen en geen specialisaties**: klanten kiezen een stylist op expertise. "Lisa" zonder "kleurspecialist, 8 jaar ervaring, Wella-gecertificeerd" mist de vertrouwenstrigger.
