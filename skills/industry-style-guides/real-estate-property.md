---
industry: real-estate-property
language: nl-BE
applies_to: [vastgoedmakelaar, real-estate, immobilier, syndic, property-manager, vastgoedontwikkelaar, sales-agent, rental-agent]
---

# Industry Style Guide — Vastgoed & Eigendom (Belgisch/Vlaams)

Geldt voor: residentiële makelaars (koop + huur), commerciële/retail-agenten, syndic-kantoren (mede-eigendom), property managers, vastgoedontwikkelaars (small-to-mid). Context: België, Vlaanderen, formeel register.

---

## 1. Aesthetic Conventions

### Kleurenpalet

Vastgoed is een sector van vertrouwen en vermogen. Het palet is ingehouden, editoraal — nooit luidruchtig.

| Rol | Typische waarden | Toegewezen token |
|---|---|---|
| Achtergrond | Cream `#F8F5F0`, gebroken wit `#FAFAF7` | `--brand-bg` |
| Primaire kleur | Navy `#1B2A4A`, diepgrijs `#2C2C2C`, donkergroen `#1E3A2F` | `--brand-primary` |
| Accentkleur | Gedempte goud `#B8964E`, oker `#C4933F`, zachte sage `#6B8C7A` | `--brand-accent` |
| Tekstkleur | Bijna-zwart `#1A1A1A`, donkergrijs `#2D2D2D` | `--brand-fg` |

Derivaten via `color-mix()` (SYSTEM.md §9 — nooit `--brand-secondary` of `--color-*` tokens aanmaken):
- Hover op primaire knop: `color-mix(in srgb, var(--brand-primary) 80%, black)`
- Lichte tint achtergrond voor secties: `color-mix(in srgb, var(--brand-accent) 10%, var(--brand-bg))`
- Semi-transparante overlay op hero-foto: `color-mix(in srgb, var(--brand-primary) 60%, transparent)`

### Typografie

Dubbele typografische stem: sterk serif voor namen, adressen en prijzen — clean sans voor de rest.

- **Koppen / referentienamen / adressen**: Cormorant Garamond, Source Serif 4, of Playfair Display. Gebruik voor `h1`–`h3` op listingpagina's en de hero van de homepage. Grootte: `--text-4xl` (homepage hero) → `--text-2xl` (paginatitels) → `--text-xl` (sectietitels).
- **Body / UI / labels**: Inter, DM Sans, of IBM Plex Sans. Grootte `--text-base` voor lopende tekst; `--text-sm` voor meta-informatie (m², EPC-label, KI, referentienummer).
- **Prijs-display**: serif, `--text-3xl`, `--brand-primary`, geen vette opmaak nodig — de grootte spreekt.
- **Geen mixed-weight chaos**: maximaal 2 gewichten per lettertype (Regular + Medium voor sans; Light + Regular voor serif).

### Witruimte en layout

Vastgoedpagina's hebben een hoge informatiedichtheid (listingdetails, technische specs). Comprimeer niet — gebruik de schaal consequent:

- Sectionpadding: `--space-16` boven/onder op desktop; `--space-8` op mobiel (< `--bp-md`).
- Ruimte tussen listingkaarten in een grid: `--space-6` (24 px gutter).
- Listingdetails intern (EPC-badge, m², prijs): `--space-3` tussen rijen.
- Max-breedte content: `--max-w` (1280 px); fotohero's mogen full-bleed buiten deze beperking.

### Full-bleed fotografie

Coverfotos van eigendom lopen edge-to-edge (`width: 100vw`, `margin-inline: calc(-1 * var(--gutter))`). Aspectratio listing hero: **3:2** of **16:9** — nooit 1:1 op listingpagina's (verliest schaalgevoel). Kaartminiaturen: **4:3**.

### Map-integratie

Google Maps, Mapbox of Leaflet als `<iframe>` of embedded component op elke listingdetailpagina en de contactpagina. Flageer dit als **iframe-patroon**: stel `loading="lazy"` in, geef het element `aspect-ratio: 16/9`, en zet `pointer-events: none` voor decoratieve kaarten zonder interactie.

---

## 2. Tone of Voice (Nederlands, Belgian "u")

Register: **formeel "u"**. Vastgoed zijn high-stakes beslissingen — kopers en verkopers verwachten een professionele gesprekspartner, geen vriendschappelijke toon.

### Kernprincipes

- **Precies, niet lyrisch.** Beschrijf feiten: oppervlakte, EPC-waarde, ligging, staat. Laat de foto's het gevoel dragen.
- **Belgisch vakjargon consequent gebruiken.** Termen die vertrouwen opbouwen bij de lokale klant:
  - *eigendom*, *referentie*, *bewoonbare oppervlakte (m²)*, *grondoppervlakte (m²)*
  - *EPC-waarde* (altijd label + kWh/m²/jaar vermelden), *cadastraal inkomen (KI)*
  - *vrij van vruchtgebruik*, *onmiddellijk beschikbaar*, *gemeenschappelijke lasten*
  - *te koop*, *te huur*, *openbaar bod*, *bod onder voorbehoud*
  - *schatting*, *bezichtiging*, *compromis*, *akte*, *notariële kosten*
- **Geen superlatief.** Niet: "prachtig gerenoveerd droomappartement!" → Wel: "Gerenoveerd appartement (2022) met 3 slaapkamers, 87 m² bewoonbare oppervlakte, EPC-label B."
- **Actieve werkwoorden, korte zinnen.** Listing-intro's: max 3 zinnen. Diensten-pagina's: max 150 woorden per blok.

### Voorbeeldzinnen per context

**Hero-tagline (homepage)**
> "Uw eigendom in vertrouwde handen. Verkoop, verhuur en beheer in [stad/regio] — al [X] jaar."

**Listing-intro (woning te koop)**
> "Halfopen bebouwing (1998, volledig gerenoveerd in 2021) gelegen in een rustige, residentiële wijk van [gemeente]. Bewoonbare oppervlakte: 162 m². Grondoppervlakte: 485 m². EPC-label C (211 kWh/m²/jaar). Vrij bij akte. Referentie: VK-2024-0187."

**Listing-intro (appartement te huur)**
> "Instapklaar appartement op de 3de verdieping met lift. 2 slaapkamers, 78 m². Huurprijs: € 975/maand (excl. gemeenschappelijke lasten). Beschikbaar: 1 augustus. Referentie: VH-2024-0342."

**CTA voor verkopers**
> "Wilt u weten wat uw eigendom waard is? Vraag een vrijblijvende, professionele schatting aan. Wij bezorgen u een gedetailleerd rapport binnen 48 uur."

**Dienst-intro (syndic)**
> "Als erkend syndic-kantoor beheren wij uw mede-eigendom met oog voor detail: transparante boekhouding, tijdige communicatie en correcte opvolging van de beslissingen van de algemene vergadering."

**Wat te vermijden**
- ❌ "Ontdek uw droomwoning!" — te emotioneel, niet informatief
- ❌ "Must-see property in the heart of…" — Engels in een Nederlandstalige context
- ❌ "PRIJS VERLAAGD!!!" — sensationeel, beschadigt vertrouwen
- ❌ "We helpen u graag verder 😊" — informeel, ongepast register

---

## 3. Paginastructuur

### Standaard paginaset (6–8 pagina's)

| Pagina | Slug | Doel |
|---|---|---|
| Home | `/` | Trust-anker, zoekfunctie, recente referenties |
| Te koop | `/te-koop` | Listing-overzicht koop (met filters) |
| Te huur | `/te-huur` | Listing-overzicht huur (met filters) |
| Verkocht / Verhuurd | `/referenties` of `/portfolio` | Track record, social proof |
| Diensten | `/diensten` | Schatting, verkoop, verhuur, syndic — 1 pagina met ankers of sub-pagina's |
| Over ons | `/over` | Team, BIV-erkenning, IPI-nummers, geschiedenis |
| Contact | `/contact` | Formulier, kaart, telefoonnummer, kantooruren |
| Nieuwbouw *(optioneel)* | `/nieuwbouw` | Enkel voor ontwikkelaars/makelaars met nieuwbouwportefeuille |

### CRM-integratiepatroon

Listings komen bijna altijd uit een externe CRM (Whise, OmniInvent, Realtor, Sweepbright). Twee geldige implementatiepatronen:

**Patroon A — Embedded iframe (minimum viable)**
```html
<!-- Listing-overzichtspagina: embed CRM-widget als iframe -->
<iframe
  src="https://[crm-provider].com/embed/[kantoor-id]"
  title="Vastgoed te koop — [Kantoornaam]"
  loading="lazy"
  width="100%"
  style="min-height: 800px; border: none;"
  referrerpolicy="no-referrer-when-downgrade">
</iframe>
```
Nadeel: visuele stijl van de CRM overschrijft de site-stijl; gebruik enkel als geen API beschikbaar is. Omring de iframe met site-eigen header en footer zodat de branding intact blijft.

**Patroon B — API-pull (aanbevolen)**
Haal listings op via de CRM-API (REST/JSON) en render ze als eigen Astro-componenten. Dit geeft volledige controle over stijl, snelheid (SSG/ISR) en SEO (server-side HTML). Sla data op in de gegenereerde Astro-build of gebruik on-demand revalidation. Stel `revalidate: 3600` in (1 uur) voor te-koop en te-huur pagina's.

Welk patroon ook gekozen wordt: **vermeld altijd het CRM-patroon in het dossier** zodat de klant weet welke data-verbinding onderhouden moet worden.

---

## 4. Sectiepatronen

### Homepage

1. **Hero** — Full-bleed foto van iconisch lokaal eigendom (of kantoorpand). Overlay met kantoorlogo + tagline (max 12 woorden) + zoekbalk (locatie + type: koop/huur). Geen carrousel op hero — één sterke foto wint het van vier middelmatige.
2. **Cijfers-balk** — 3–4 vertrouwensgetallen in één horizontale rij: aantal transacties, jaar van oprichting, actieve referenties, kantoorlocaties. Achtergrond: `color-mix(in srgb, var(--brand-primary) 10%, var(--brand-bg))`.
3. **Uitgelichte referenties** — 3–4 recente listingkaarten (carousel op mobiel, 3-col grid op desktop). Bevat: foto, adres, bewoonbare oppervlakte, prijs, status-badge (Te koop / Te huur).
4. **Diensten-inleiding** — 3 kolommen: Schatting / Verkoop / Verhuur (+ Syndic indien van toepassing). Icoon + titel + 2 zinnen + tekstlink "Lees meer".
5. **Team-sectie** — Persoonsfoto's van makelaars met naam, functie, direct telefoonnummer. Max 4 op homepage; link naar volledige teampagina.
6. **Recente getuigenissen** — 2–3 klantencitaten met naam, type transactie, en plaatsnaam. Geen anonieme reviews.
7. **Verkocht-showcase** — 3 recente verkochte panden als miniatuurkaarten met "Verkocht" of "Verhuurd" badge. Bouwt track record op.
8. **CTA-balk** — Volle breedte, `--brand-primary` achtergrond: "Laat uw eigendom gratis schatten. Wij bezorgen u een gedetailleerd rapport." + primaire knop.

### Listingoverzichtspagina (Te koop / Te huur)

- Filterbar sticky aan bovenkant: type (huis/appartement/commercieel), gemeente, prijs-range (slider), slaapkamers, oppervlakte. Gebruik `<details>`/`<summary>` of een uitklapfilter — geen volledige filterpagina die de browser verlaat.
- Kaartgrid: 3-kolommen desktop (`--bp-lg`), 2-kolommen tablet (`--bp-md`), 1-kolom mobiel.
- Elke listingkaart bevat: foto (4:3), adres (serif, `--text-lg`), bewoonbare m², slaapkamers, prijs (prominente serif, `--text-xl`), EPC-badge (kleurcodering per EU-label), referentienummer (`--text-xs`, `--brand-fg` met opacity via `color-mix(in srgb, var(--brand-fg) 60%, transparent)`).
- Pagination of infinite scroll: verkies **pagination** (betere SEO, sneller TTFB op grote catalogi).

### Listingdetailpagina

1. **Fotogalerij** — Minimaal 8 foto's. Hoofdfoto full-bleed bovenaan; galerij-thumbnail-strip eronder. Lightbox voor volledige weergave. Geen JavaScript-carrousel met auto-play.
2. **Kerninformatie-blok** (sticky sidebar op desktop): adres (serif `--text-3xl`), prijs, status, type, referentienummer, primaire CTA-knop "Vraag info / Plan bezichtiging".
3. **Specificaties-tabel**: bewoonbare oppervlakte, grondoppervlakte, bouwjaar, renovatiejaar, EPC (label + kWh/m²/jaar), cadastraal inkomen, aantal slaapkamers, badkamers, garage, tuin (m²), oriëntatie, beschikbaarheid.
4. **Beschrijving** — Max 250 woorden, feitelijk, alinea's per zone (gelijkvloers / verdieping / tuin / technisch).
5. **Kaart** — iframe of embedded map component, `aspect-ratio: 16/9`, met adres-pin. Geen Street View screenshot.
6. **Contactformulier** — Minimaal: naam, telefoon, e-mail, bericht (pre-ingevuld met referentienummer), verzendknop "Stuur mijn vraag".
7. **Soortgelijke referenties** — 3 vergelijkbare panden onderaan; cross-sell zonder afbreuk aan de hoofdpagina.

### Diensten-pagina

Gebruik anker-navigatie (`/diensten#schatting`, `/diensten#verkoop`) tenzij de kataloog groot genoeg is voor sub-pagina's. Elke dienst: H2-titel, 100–150 woorden, concrete voordelen als bulletlijst, één CTA.

### Syndic-kantoor specifiek

Voeg een aparte sectie of sub-pagina toe: `/syndic` of `/beheer`. Bevat: dienstverlening (AV-organisatie, boekhouding, noodinterventies), aanmeldformulier voor mede-eigenaars, downloadbare documenten (modelreglement, tariefoverzicht). Vermeld verplicht de BIV-erkenning en het IPI-nummer van de syndic-verantwoordelijke.

---

## 5. CTA-conventies

### Primaire CTA's (per doelgroep)

| Doelgroep | CTA-tekst | Actie |
|---|---|---|
| Verkopers | "Vraag een gratis schatting" | Formulier (naam + tel + adres eigendom + bericht) |
| Kopers | "Plan een bezichtiging" | Formulier (naam + tel + e-mail + referentie + voorkeursdatum) |
| Huurzoekers | "Vraag info over deze referentie" | Formulier (naam + tel + e-mail + referentienummer) |
| Portfolio-bezoekers | "Bekijk onze portefeuille" | Link naar /te-koop of /referenties |
| Eigenaars (verhuur) | "Verhuur uw eigendom met ons" | Formulier of telefoonnummer |
| Mede-eigenaars | "Contacteer onze syndic-afdeling" | Formulier of directe telefoonlijn |

### Formulierminimalisme

Vastgoedformulieren mogen **nooit** meer dan 5 velden bevatten in de initiële weergave:
1. Naam (voornaam + achternaam in één veld)
2. Telefoonnummer *(prioriteit — makelaars bellen terug)*
3. E-mailadres
4. Referentienummer / adres eigendom (waar van toepassing)
5. Vrij bericht / vraag

Extra juridisch verplichte velden (GDPR-toestemming) worden als checkbox onder het formulier geplaatst, niet als extra invoerveld.

### Knopstijl

- Primaire knop: `background: var(--brand-primary)`, `color: var(--brand-bg)`, geen afronding (vastgoed = strak, niet speels) of subtiele afronding max 2–4 px. Grootte: `--text-base`, padding `--space-3` verticaal / `--space-6` horizontaal.
- Secundaire knop: transparante achtergrond, `border: 1px solid var(--brand-primary)`, `color: var(--brand-primary)`.
- Hover: `color-mix(in srgb, var(--brand-primary) 80%, black)` op primaire knop. Transitie: `--dur-micro` (`150ms`), `--ease`.
- Geen zwevende "chatbot"-knoppen onderaan het scherm. Geen "Hulp nodig?" popups.

---

## 6. Vertrouwenssignalen (Belgisch-specifiek)

### Wettelijk verplicht

**BIV-erkenning** (Beroepsinstituut van Vastgoedmakelaars) is in België wettelijk verplicht voor elke makelaar die bemiddelingsactiviteiten uitoefent. Dit moet zichtbaar zijn op de website:

- Vermeld "BIV-erkend vastgoedkantoor" in de footer van elke pagina.
- Toon het individuele **BIV-erkenningsnummer** van elke makelaar op de teampagina naast de profielfoto.
- Formaat: "BIV-stageregister nr. XXXXXX" of "BIV-erkenningsnummer: XXXXXX".
- Link optioneel naar het publieke BIV-register: `https://www.biv.be`.

**IPI-nummer** (Institut Professionnel des Immobiliers / Beroepsinstituut voor Immobiliënberoepen): equivalent voor Franstalige makelaars die ook in Vlaanderen actief zijn. Vermeld indien van toepassing.

**Syndic-verplichtingen**: syndic-kantoren vallen onder dezelfde BIV-wetgeving. Vermeld expliciet "Erkend syndic – BIV nr. XXXXXX" op de syndicpagina én in de footer.

### Optionele maar aanbevolen vertrouwenssignalen

| Signal | Plaatsing | Formaat |
|---|---|---|
| Aantal transacties (vorig jaar of cumulatief) | Homepage cijfers-balk | "X panden verkocht in [jaar]" |
| Jaar van oprichting | Footer + over-pagina | "Actief sinds [jaar]" |
| Getuigenissen met naam + type transactie | Homepage + diensten | 2–3 citaten, max 60 woorden elk |
| Teamfoto's met credentials | Over-pagina + homepage | Naam, functie, BIV-nr., directe tel. |
| Recente verkochte panden | Homepage showcase | "Verkocht binnen 3 weken" badge |
| Notaris-netwerk badge | Footer | Logo partner-notariskantoor |
| Bankpartner logo's (Crelan, KBC, BNP…) | Diensten-pagina | Kleine logo's in een rij |
| Confederation Construction lid (ontwikkelaars) | Homepage + over | Badge + lidnummer |

### Positionering in de pagina

- Footer: BIV-erkenning (tekstueel), maatschappelijke zetel, BTW-nummer, KBO-nummer.
- Contactpagina: volledig adres + kantooruren + telefoonnummer (klikbaar `tel:`-link).
- Over-pagina: uitgebreide teampresentatie met individuele BIV-nummers.
- Listingdetailpagina: naam van de verantwoordelijke makelaar + direct telefoonnummer.

---

## 7. Beeldgids

### Wat wél te gebruiken

**Eigendomsfotografie — kwaliteitseisen:**
- Professionele brede-hoekcamera (24–35 mm equivalent), recht perspectief (geen lens-distortie).
- Daglichtopnames bij voorkeur; kunstlicht als aanvulling, nooit als enige lichtbron.
- Consistente bewerkingsstijl per kantoor (kleurtemperatuur, belichting).
- Minimaal 8 foto's per listing: gevel, woonkamer, keuken, slaapkamers (alle), badkamer, tuin/terras, technische ruimte, eventueel nachtfoto van de gevel.
- Drone-/luchtfoto's voor eigendommen > 500 m² grond of bij uitzonderlijke ligging.
- Seizoensgebonden fotografie: geen winter-tuinfoto's als de tuin een troef is.

**Overige beeldcategorieën:**
- Buurtbeelden: authentieke straatvideo of -foto van de directe omgeving (niet Google Street View).
- Teamfoto's: professioneel portret, neutrale achtergrond of kantooromgeving. Geen selfies.
- Luchtfoto's van de gemeente/wijk als contextuele achtergrond op de homepage of gemeente-landingspagina's.

### Wat te vermijden

- ❌ **GSM-foto's van listings**: donkere, korrelige, scheef genomen foto's doen een listing actief schaden.
- ❌ **Fish-eye-distortie**: een kamer van 12 m² die op 25 m² lijkt — kopers voelen zich bedrogen bij bezichtiging.
- ❌ **AI-gegenereerde interieurstaging** die duidelijk nep is: perfect lichtval, geen schaduwen, te perfecte meubels. Kopers herkennen het.
- ❌ **Donkere of blinde foto's**: fenomeen van tegenlicht (ramen wit uitgebrand, interieur zwart).
- ❌ **Google Street View screenshots** als vervanger van echte foto's.
- ❌ **Stock photo's van generieke gezinnen**: koppel dat sleutels vasthoudt, gezin dat door ramen tuurt — clichématig en ongeloofwaardig.
- ❌ **Automatische foto-carrousel op de hero** met meerdere panden: vermindert focuskracht van de homepage.
- ❌ **Parallax-scrolling op listingfoto's**: trekt de foto uiteen, verliest beeldkwaliteit, verhoogt layout-shift (CLS).

### Alt-tekst

Elke `<img>` vereist een beschrijvende alt-tekst. Formaat voor listings: `"[Type eigendom] te [koop/huur] in [gemeente] — [kamer of perspectief]"`. Voorbeeld: `"Rijwoning te koop in Mechelen — lichte woonkamer met parketvloer"`.

---

## 8. Referentie-URL's

Drie Belgische vastgoedwebsites, geverifieerd bereikbaar (WebFetch mei 2026):

### 1. ERA Belgium — Residentieel (marktleider)
**URL**: `https://www.era.be/nl`
**Segment**: Residentieel, koop + huur, nationaal netwerk (140+ kantoren)
**Wat werkt**: Clean, functioneel zoeksysteem (type + gemeente + prijs); duidelijke cijferbalk (transactievolumes, actieve kopers); heldere paginastructuur met aparte secties voor kopen, huren, nieuwbouw, investeren; team-voorstelling per kantoor.
**Leerpunten voor Atelier**: Zoekinput als primaire hero-actie (niet een CTA-knop); statistieken als trust-anker direct onder de fold; geen onnodige animaties op de homepage.

### 2. TREVI — Commercieel / Meergezins / Projecten
**URL**: `https://www.trevi.be/nl`
**Segment**: Residentieel + commercieel, verhuur + verkoop, Brussel en Wallonië met Nederlandstalige sectie
**Wat werkt**: Duidelijke diensten-indeling (Verkoop / Verhuur / Nieuwbouw) als visuele grid; eigenaarsportaal als aparte toegang; strak zwart-wit-rood palet dat zakelijkheid uitstraalt; sterke nieuwbouwafdeling met projectpagina's.
**Leerpunten voor Atelier**: Diensten als landingspagina's met eigen URL's (betere SEO); eigenaarsportaal als onderscheidend element voor property managers en syndic-kantoren.

### 3. Syncura — Syndicus / Mede-eigendom beheer
**URL**: `https://www.syncura.be`
**Segment**: Professionele syndic, Vlaanderen en Brussel, 40+ jaar ervaring
**Wat werkt**: Directe waardepropositie op de homepage ("40 jaar ervaring", "24/7 permanentie", "antwoord binnen 24 uur"); downloadbare gids als lead magnet; digitaal portaal als onderscheidend trust-signaal; helder contactformulier.
**Leerpunten voor Atelier**: Syndic-sites moeten communicatie-transparantie centraal stellen; lead magnets (gratis gids/brochure) werken goed in dit segment; portaal-login als conversie-trigger voor bestaande klanten.

---

## 9. Negatieve voorbeelden

Patronen die de geloofwaardigheid van een vastgoedkantoor actief ondermijnen:

### Inhoud en tone
- ❌ **"Looking for your dream home?"** — Engelse hero-tekst op een Vlaamse kantoorwebsite. Toont gebrek aan lokale identiteit; kopers en verkopers verwachten Nederlands.
- ❌ **Superlatieven als hoofdinhoud**: "Prachtige, unieke, uitzonderlijke woning in topstaat!" — informatieloze lof die geen enkel zoekcriterium helpt en professionele indruk ondermijnt.
- ❌ **Prijzen in ALL CAPS met uitroeptekens**: "€ 349.000!!!" of "PRIJS VERLAAGD – HAAST U!" — signaleert wanhoop, geen professionalisme.

### Visueel
- ❌ **Ongestijlde CRM-iframe als volledige listingpagina**: de pagina bevat enkel een `<iframe>` met de stijl van de CRM-provider. Geen site-eigen header, geen branding, geen SEO-waarde. Gebruik minstens een omhullende wrapper met kantoorlogo en navigatie.
- ❌ **"URGENT! PRIJS VERLAAGD!"**-banners in rood op listingkaarten — beschadigt de positionering van het kantoor als professionele marktpartij.
- ❌ **Rode "DRINGEND"- of "NIEUW"-stickers** die automatisch aan alle nieuwe panden worden toegevoegd — inflatoir.
- ❌ **Parallax-scrolling op listingfoto's**: de foto wordt uitgerekt bij scrollen, verliest proportie, verhoogt Cumulative Layout Shift (CLS) — technisch en visueel problematisch (SYSTEM.md §4 performance targets).
- ❌ **Google Street View screenshot als listing-hoofdfoto** — lage resolutie, fisheye-distortie, weergeeft de woning soms minder gunstig dan de realiteit.
- ❌ **Automatisch afspelende video op de hero** — verlaagt performance (LCP), verhoogt bounce op mobiel.

### UX-patronen
- ❌ **Popup chatbot bij aankomst**: "Hallo! 👋 Ik help je graag een woning vinden!" — disruptief, informeel register, werkt contraproductief bij professionele vastgoedklanten die bewust zoeken.
- ❌ **Volledige listingpagina zonder contactformulier**: de klant moet terug naar de contactpagina navigeren om een bezichtiging te vragen — elke extra stap kost conversies.
- ❌ **Geen mobiele filteroptie op de overzichtspagina**: vastgoedzoekers gebruiken mobile-first. Een filterbar die op mobiel instort of verdwijnt maakt de catalogus onbruikbaar.
- ❌ **Geen BIV-erkenning zichtbaar**: een vastgoedkantoor zonder zichtbare BIV-erkenning op de website schendt de beroepswetgeving én wekt wantrouwen bij geïnformeerde klanten.
- ❌ **Team-sectie met stockfoto's**: een team van acht generieke stockmodel-makelaars — kopers en verkopers willen de echte persoon kennen die hen begeleidt.
