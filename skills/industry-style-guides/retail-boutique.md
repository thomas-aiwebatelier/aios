---
industry: retail-boutique
language: nl-BE
applies_to: [boutique, kledingwinkel, conceptstore, giftshop, boekenwinkel, design-shop, retail]
---

# Industry Style Guide — Retail Boutique (nl-BE)

Gebruikt door de generator (zie `generation-prompt.md` §1) als primaire stijlreferentie voor
kledingwinkels, conceptstores, cadeauwinkels, design-shops en boekenwinkels in Vlaanderen.
SYSTEM.md §1–§10 zijn de technische grondbeginselen; deze gids werkt er bovenop.

---

## 1. Aesthetic Conventions

**Overkoepelend karakter:** redactioneel, lookbook-geïnspireerd. Het beeld spreekt; tekst
ondersteunt en verfijnt. De lat ligt hoog: elke pagina voelt alsof die uit een Belgisch
lifestyle-magazine is geknipt.

### Witruimte
Genereus en bewust ingezet. Tussen productsecties: minimum `var(--space-24)` (96px) verticale
scheiding. Rondom hero's: geen full-bleed die meteen overgaat in de volgende sectie zonder
ten minste `var(--space-16)` adempauze. Witruimte is geen afwezigheid van inhoud — het is
onderdeel van de merkbeleving.

### Typografie
- **Koppen:** serif-first. Voorkeursopties in volgorde: Cormorant Garamond, Playfair Display,
  Fraunces. Altijd via `<link rel="preconnect">` + `<link>` in `<Base>` (nooit CSS `@import`,
  SYSTEM.md §6 verbiedt dat).
- **Broodtekst:** schoon humanistisch sans-serif of een lichte serif voor legbaarheid op kleine
  schermen. Voorbeeld: Jost, DM Sans of Source Serif 4.
- **Grootte-mapping:** hero-kop → `var(--text-5xl)` of `var(--text-4xl)`;
  sectie-koppen → `var(--text-3xl)` of `var(--text-2xl)`;
  product-titels → `var(--text-xl)`;
  broodtekst → `var(--text-base)` (nooit kleiner dan `var(--text-sm)` op mobiel).
- **Letter-spacing:** headlines mogen ruim gesperd zijn (letter-spacing 0.04–0.08em) voor
  een luxueuzer gevoel. Dit is een per-site keuze, niet een token.
- **Regelafstand:** headlines 1.1–1.2; broodtekst 1.6–1.75.

### Kleurpalette
- Basis: neutraal crème, off-white of warm lichtgrijs als `--brand-bg`
  (typische waarden: `#f8f5f0`, `#f5f3ee`, `#faf9f7`).
- Voorgrond: diepe inkt of warm donkerbruin als `--brand-fg`
  (typische waarden: `#1a1a1a`, `#1c1a18`, `#2a2520`).
- **Accentkleur als enige aanrakingspunt van kleur:** één merkkleur (`--brand-accent`) tegen
  de neutrale achtergrond. Voor boutiques: terra cotta, mosgroen, bordeaux, roestbruin, mauve,
  of een warme oker. Nooit meerdere heldere kleuren tegelijk.
- Derivaten via `color-mix()` op het gebruiksmoment (SYSTEM.md §9). Voorbeeld:
  zachte achtergrondtint: `color-mix(in srgb, var(--brand-accent) 8%, var(--brand-bg))`.
- Contrastvereisten SYSTEM.md §5: `--brand-fg` op `--brand-bg` ≥ 4.5:1;
  `--brand-accent` op `--brand-bg` ≥ 3:1.

### Fotografie en layout
- **Beeld-led:** de verhouding beeld/tekst op een productpagina is minimaal 60/40 ten gunste
  van beeld.
- **Galerijgrid:** typisch 2-koloms op desktop (gap `var(--gutter)` = `var(--space-6)`),
  1-koloms op mobiel. Nooit 3+ koloms voor hero-producten (te druk voor boutique-esthetiek).
- **Hero:** full-bleed afbeelding of video-loop (zonder autoplay-audio), maximale hoogte
  80–100vh, met een enkelvoudige typografische overlay. Geen carrousel-hero met meerdere
  slides — anti-patroon (zie §9).
- **Tegels:** vierkant of licht portretformaat (3:4). Nooit willekeurige verhoudingen door
  niet-gespecificeerde `<img>`-dimensies — CLS-overtreding (SYSTEM.md §6).
- **Inconsistente achtergronden** in productserie-shots zijn een stijlfout: kies één look en
  houd die consequent aan per collectie.

---

## 2. Tone of Voice (Dutch)

**Toon:** gecureerd, warm, verfijnd. De boutique is een editor, geen doorverkoper.

### Aanspreekvorm
| Positionering | Aanspreekvorm |
|---|---|
| High-end / couture / luxury | **u** — afstandelijk en respectvol |
| Conceptstore / lifestyle / jong publiek | **jij/je** — toegankelijk, vriendelijk |
| Mix of onduidelijk | Kies één. Nooit wisselen binnen dezelfde pagina. |

### Sleutelwoorden en -zinnen (correct gebruik)
- *gecureerd*, *zorgvuldig geselecteerd*, *handpicked*
- *exclusief in Antwerpen*, *enkel verkrijgbaar bij ons*
- *seizoenscollectie*, *limited edition*, *capsule*
- *handgemaakt*, *ambachtelijk*, *kleinschalig*
- *duurzaam geproduceerd*, *fair trade*, *tijdloos*
- *het verhaal achter het merk*, *ontdek de collectie*
- *voor uzelf of als cadeau* (high-end), *voor jezelf of iemand anders* (conceptstore)

### Verboden register
- Kortingsgedreven taal op een niet-kortingsgepositioneerd merk: **"SOLDEN!", "Maar liefst 50%
  goedkoper!", "Koop 2, betaal 1"** — fatale merkschade.
- Corporate boilerplate: **"Wij streven naar klanttevredenheid"**, **"Onze missie is..."**.
- Anglicismen zonder reden: **"shop now"** ipv "ontdek de collectie", **"add to cart"** ipv
  "in de winkelwagen".
- Overdreven superlatieven: **"de beste winkel van België"**.

### Toonbeelden (concreet)
```
Hero-kop (high-end):
  "Een zorgvuldig gecureerde collectie voor het leven dat u wilt leiden."

Hero-kop (conceptstore):
  "Alles wat je nodig hebt — en niets wat je niet nodig hebt."

Nieuw binnen:
  "Vers in de winkel: de herfstcollectie van Sessùn en Isabel Marant Étoile."

About-intro:
  "Sinds 2012 selecteren we merken die iets te zeggen hebben — in de Kloosterstraat,
  hartje Antwerpen."

CTA voor winkelbezoek:
  "Kom langs en ontdek de volledige selectie in onze winkel."
```

---

## 3. Page Structure Patterns

**Standaard sitestructuur voor een kleinschalige Vlaamse boutique (4–5 pagina's):**

```
/                   Home
/collectie          Collectie (of /shop, /aanbod, /assortiment)
/over               Over ons (of /over-[winkelnaam])
/bezoek             Bezoek / Contact
/journal            Journal / Blog (optioneel — alleen als er actieve content is)
```

### Wat NIET standaard aanwezig is
- **Geen checkout / winkelwagen op de spine-site.** Boutiques die online verkopen, doen dat
  typisch via een apart Shopify-subdomein (bijv. `shop.[winkelnaam].be`). De spine-site is een
  merkontdekkingssite. CTAs verwijzen naar het bezoek of het externe Shopify-domein.
- **Geen login / account-sectie** op de spine.
- **Geen ingebedde sociale widgets** die externe JS laden (SYSTEM.md §6.3 verbiedt dit). Link
  naar Instagram-profiel; embed niet.

### Navigatievolgorde
Home → Collectie → Over → Bezoek (→ Journal indien aanwezig). Op mobiel: hamburger-menu,
de vier items op één niveau, geen sub-navigatie (boutiques hebben zelden categorieën diep
genoeg om een megamenu te rechtvaardigen).

---

## 4. Section Patterns

### Home (`/`)

**Volgorde van secties (top → bottom):**

1. **Full-bleed editorial hero**
   - Eén beeld, maximaal één kop (`<h1>`, `var(--text-5xl)` of `var(--text-4xl)`), één CTA.
   - Hero-afbeelding krijgt `fetchpriority="high"` en GEEN `loading="lazy"` (SYSTEM.md §6, LCP).
   - Optionele ondertitel: `var(--text-lg)`, max. 15 woorden.
   - Animatie bij pagina-entry mag, duur `var(--dur-hero)` (600ms). Volledig uitgeschakeld bij
     `prefers-reduced-motion` (tokens.css handelt dit af via de globale regel).

2. **Nieuw binnen / Seizoenscollectie**
   - 3–4 product- of categorietegels in een 2-koloms galerijgrid (desktop), 1-koloms (mobiel).
   - Gap: `var(--gutter)`. Padding rondom grid: `var(--space-12)` verticaal.
   - Elke tegel: afbeelding (3:4 ratio) + productnaam (`var(--text-lg)`) + eventueel prijs of
     merknaam (`var(--text-sm)`, gedempte kleur).
   - Sectiekop: `var(--text-2xl)`, gecentreerd of links uitgevuld — consistent gekozen.

3. **Feature / In de kijker**
   - Één product of merk breed uitgelicht: 50/50 of 60/40 split (beeld | tekst) op desktop,
     gestapeld op mobiel.
   - Bevat: afbeelding + korte beschrijving (max. 3 zinnen) + CTA "Ontdek meer" of "Kom langs".

4. **Over-snippet**
   - Twee tot drie zinnen over de winkel + link naar de over-pagina.
   - Optioneel: kleine portretfoto van de eigenaar naast de tekst.

5. **Locatie & openingsuren**
   - Straatnaam, uren, eventueel een kleine statische kaartafbeelding (geen embedded Google Maps
     iframe met tracking-JS — link naar Google Maps-URL in plaats van embedden).
   - Structuurdata `LocalBusiness` JSON-LD is al vereist door SYSTEM.md §8.

6. **Instagram-teaser (optioneel)**
   - Statische grid van 6 recente foto's als `<img>` met `alt` + link naar profiel.
   - Geen Instagram-embed-widget (externe JS verboden, SYSTEM.md §6.3).

---

### Collectie (`/collectie`)

**Twee geldige patronen — kies op basis van assortimentsgrootte:**

**A. Categoriegrid** (< 30 producten of < 5 categorieën)
- Eenvoudige grid van categoriekaarten (bijv. "Dames", "Heren", "Accessoires", "Cadeaus").
- Elke kaart: groot beeld + categorie-label + CTA.

**B. Filterable productgrid** (≥ 30 producten, e-commerce-intent)
- Filteropties links (desktop) of als horizontale chips (mobiel): merk, categorie, nieuw.
- Grid: 2 koloms desktop (boutique-standard), 1 kolom mobiel.
- Als de winkel een extern Shopify-domein heeft: vervang de productgrid door een
  categorie-teaser-sectie met een prominente CTA "Shop online via onze webshop" die linkt
  naar het externe domein.

---

### Over (`/over`)

**Volgorde:**

1. **Kop + oprichtersverhaal** — `<h1>` met de naam of zin die de filosofie vat.
2. **Oprichterfoto** — editoriaal, niet zakelijk. Liefst in de winkelruimte zelf.
3. **Merkfilosofie** — max. 4 alinea's. Wat selecteer je? Waarom? Wat maakt jouw keuze anders?
4. **Winkelfoto's** — 2–4 sfeerbeelden van het interieur, met `alt`-tekst die de sfeer beschrijft.
5. **Eventuele persvermelding of onderscheiding** — inline, niet als afzonderlijke sectie.

---

### Bezoek (`/bezoek`)

1. **Praktisch blok:** adres (voluit), openingsuren (per dag), telefoon, e-mail.
2. **Bereikbaarheid:** parkeerinformatie, openbaar vervoer (tram/bus-lijnnummer in Antwerpen).
3. **Winkelfoto** — buitenkant van het pand, herkenbaar.
4. **CTA:** "Plan je route" (link naar Google Maps-URL) of "Stuur ons een bericht" (mailto).

---

## 5. CTA Conventions

**Karakter:** uitnodigend, nooit aandringend. De boutique verkoopt een beleving, geen
korting op urgentie.

### Aanbevolen CTA-teksten

| Context | Voorkeurstekst |
|---|---|
| Winkelbezoek aanmoedigen | "Bezoek de winkel", "Kom langs", "Ontdek onze collectie ter plaatse" |
| Collectie tonen | "Ontdek de collectie", "Bekijk het aanbod", "Nieuw binnen" |
| Externe webshop linken | "Shop online", "Bestel via onze webshop" |
| Instagram | "Volg ons op Instagram", "Bekijk onze laatste looks" |
| Contact | "Stuur ons een bericht", "Neem contact op" |
| Over-pagina | "Lees ons verhaal", "Meer over ons" |

### Anti-patronen
- **"Koop nu!"** — drukt urgentie die boutiques niet communiceren.
- **"Bestel vandaag nog"** — te transactioneel.
- **"Beperkte voorraad!"** — nep-schaarste, merkonvriendelijk voor boutiques.
- Meer dan één primaire CTA per sectie — kies één; een tweede mag als ghost-button.

### Knop-stijl
- Primaire CTA: `--brand-accent` als achtergrond of als rand (outline-stijl past ook goed bij
  boutique-esthetiek), `--brand-fg` als tekst of omgekeerd.
- Hover: `color-mix(in srgb, var(--brand-accent) 80%, black)` als donkere hover-state.
- Transition: `var(--dur-micro)` (150ms), `var(--ease)`.
- Minimale klikdoelgrootte mobiel: 44×44px (SYSTEM.md §7).

---

## 6. Trust Signals

**Primaire trust-signalen voor een Vlaamse boutique:**

1. **Naam en gezicht van de eigenaar/oprichter** — zichtbaar op de over-pagina, bij voorkeur
   ook als kleine vermelding op de home (bijv. "Geselecteerd door Lotte, sinds 2014").
2. **Jarenlange aanwezigheid in de buurt** — "Sinds 2014 in de Kloosterstraat" heeft meer gewicht
   dan een abstracte oprichtingsdatum.
3. **Straatnaam/buurt als identiteitsanker** — de Kloosterstraat, de Nationalestraat, het
   Eilandje, de Kammenstraat: Antwerpenaren herkennen die namen. Gebruik ze expliciet.
4. **Instagram-bereik** — vermeld alleen als het profiel substantieel is (≥ 2.000 volgers).
   Formulering: "Volg ons op Instagram — [X]k volgers."
5. **Persvermelding** — "Zoals gezien in Knack Weekend", "Aanbevolen door De Standaard", "Te
   zien in het Antwerp Fashion Weekend-programma." Alleen vermelden als het aantoonbaar waar is
   en als er een URL of publicatie-datum bij kan.
6. **De winkelruimte zelf** — kwalitatieve interieurbeelden tonen zorg en investering. Een mooie
   winkel is een stilzwijgende garantie voor kwaliteitsselectie.
7. **Merken in het assortiment** — "Wij voeren o.a. Sessùn, Humanoid, Bellerose en Isabel Marant
   Étoile" vertrouwt op de reputatie van gevestigde merken.

**Vermijd:**
- Nep-recensies of sterren-widgets zonder verificeerbare bron.
- "100% tevreden of geld terug" — te transactioneel voor boutique-positionering.
- Trust-badges (beveiligingszegels, SSL-logo's) tenzij de site effectief e-commerce heeft.

---

## 7. Imagery Guidance

### Gewenste fotostijl
- **Productfotografie:** consistente achtergrond per collectie (wit, crème of een neutrale
  decortextuur), gelijkmatig daglicht of zachte studiobelichting. Nooit gemengde achtergronden
  in één grid.
- **Lifestyle / in-store shots:** model of product in de winkelruimte zelf, op straat (de buurt),
  of in een interieurcontext die aansluit bij de merkwereld.
- **Eigenaarportret:** editoriaal, in de winkel of op een locatie die de merkidentiteit
  onderstreept. Geen zakelijk headshot.
- **Buitenkant van het pand:** bij voorkeur bij daglicht, in de winkelstraat. Herkenbaar voor
  mensen die het zoeken.
- **Buurtsfeer:** straatbeelden van de wijk als aanvullende context op de bezoekpagina.

### Altijd `alt`-tekst (SYSTEM.md §5)
- Product: "[Merk] [productnaam] in [kleur]" — bijv. "Sessùn linnen blouse in gebroken wit".
- Interieur: "Winkelinterieur van [winkelna], houten rekken met kleding in aardetinten."
- Portret: "Portret van [naam], oprichter van [winkelna], in de winkel."
- Buiten: "Gevel van [winkelna] in de [straatnaam], Antwerpen."

### Fallback als de lead geen eigen foto's heeft
Gebruik Unsplash met zoektermen: `boutique antwerp`, `fashion store interior`,
`clothing boutique belgium`, `editorial fashion`. Altijd `alt`-tekst toevoegen die de context
beschrijft. In de code een commentaar opnemen dat echte foto's nodig zijn post-acceptatie:
```html
<!-- TODO: vervang door eigen fotografie na klantgoedkeuring -->
```

### Verboden
- Studioproductfoto's op witte achtergrond als het merk "warm en gecureerd" is — stijlbreuk.
- Lage-resolutie screenshots van Instagram-posts als productkader.
- Stockfoto's van generieke boodschappentassen, winkelkarretjes of mannequins in een lege winkel.
- Glow-effecten, drop shadows op productafbeeldingen — ouderwets en haaks op de luxe-esthetiek.
- Fotocollages met meerdere tekststijlen — te rommelig.

### Technische vereisten (SYSTEM.md §6 & §7.6)
- LCP-afbeelding (hero): `fetchpriority="high"`, geen `loading="lazy"`.
- Alle overige afbeeldingen: `loading="lazy"`.
- Altijd `width` en `height` op `<img>` om CLS te voorkomen.
- Formaat: WebP via Astro `<Image>` component, of AVIF/WebP bronbestand.
- Typische aspect ratio's: hero 16:9 of 3:2; tegels 3:4; portret 2:3.

---

## 8. Reference Sites

De volgende drie sites zijn geverifieerd als bereikbaar op 2026-05-07 en dienen als
stijlreferentie. Bestudeer ze op informatiehiërarchie, verhouding beeld/tekst,
CTA-plaatsing en typografisch ritme — kopieer geen markup of kopij.

### 1. `https://www.natan.be` — NATAN (Brussel / Antwerpen)
Belgisch haute couture- en ready-to-wear-merk met internationale uitstraling. De site toont
een klassiek, editoriaal esthetiek: grote campaign-fotografie, minimale navigatie, serene
witruimte. Sterk voorbeeld van hoe een Belgisch modehuis zijn erfgoed vertelt via beeld in
plaats van via tekst. Let op de fotograaf-credits en de manier waarop collectiedrops worden
gepresenteerd als culturele events ("NATANxMattias De Leeuw, Art Brussels 2026").

### 2. `https://www.bellerose.be` — Bellerose (Brussel)
Belgisch familiemodebrand (dames, heren, kinderen) met een warme, speelse toon. De Shopify-site
is representatief voor hoe een mid-market Belgische boutique een volledige e-commerce-ervaring
opbouwt met een sterk merkgevoel. Observeer de productgridstructuur, de gebruik van seizoensleiding
("Spring–Summer '26") als navigatie-anker, en de balans tussen verkoopgedreven en
lifestyle-gedreven content.

### 3. `https://www.libeco.com` — Libeco (Meulebeke, West-Vlaanderen)
Belgisch linnenproducent met een doorlopende winkelervaring. Uitzonderlijk sterk voorbeeld van
Nederlandstalige merkstorytelling: "Libeco is de referentie voor Belgisch linnen van de hoogste
kwaliteit." Geen lege superlatieven — de kwaliteitsclaim wordt meteen onderbouwd door herkomst
en productiemethode. Toont ook hoe een Vlaamse producent/retailer herkomst (de Leievallei,
het Belgisch klimaat) als trust-signaal gebruikt. Let op de fotobewerking: warm, naturel, nooit
gefotoshopt.

---

## 9. Negative Examples — Wat te Vermijden

De onderstaande patronen zijn concreet slechte uitvoeringen die in Vlaamse boutique-omgevingen
voorkomen. Elk is een **afwijzing** in de AI Web Atelier kwaliteitscontrole.

### Anti-patroon 1: WooCommerce-standaardthema zonder aanpassing
**Herkenningspunten:** Storefront- of Twenty Twenty-thema, standaard productgrid met prijzen
groot en prominent, rode "Koop nu"-knoppen, generieke sidebar met categorieën en recente posts.
**Waarom fout:** Geen merkidentiteit, geen esthetisch oordeel. De winkel communiceert niet
meer dan "wij hebben producten te koop."

### Anti-patroon 2: Generieke stockfotografie
**Herkenningspunten:** Vrouw met boodschappentas, etalagepop in een lege winkel,
handen met creditcard, winkelstraat zonder herkenbare locatie.
**Waarom fout:** Onpersoonlijk. Boutiques verkopen selectie en smaak; generieke stock
ondermijnt precies die belofte.

### Anti-patroon 3: "Over ons"-pagina met corporate boilerplate
**Herkenningspunten:** "Wij zijn een team van gepassioneerde professionals die streven naar
klanttevredenheid en kwaliteit in alles wat we doen."
**Waarom fout:** Geen enkel merk-eigenheid, geen context, geen persoon, geen locatie.
Elke winkel in de wereld kan dit schrijven.

### Anti-patroon 4: SALE-banner op een niet-kortingsgepositioneerd merk
**Herkenningspunten:** Grote rode banner bovenaan de homepage "SOLDEN — TOT 70% KORTING",
ook buiten het officiële soldenperiode, voor een winkel die zich op kwaliteitsselectie
positioneert.
**Waarom fout:** Vernietigt de perceptie van merkwaarde. Eén prominente kortingsbanner
wist maanden curatoriale merkopbouw uit.

### Anti-patroon 5: Autoplay-carrouselhero met meerdere slides
**Herkenningspunten:** Drie of meer slides die automatisch doorscrollen, telkens met een
andere afbeelding en CTA, soms met fade- of slide-animatie.
**Waarom fout:** Verdeelt de aandacht. Boutique-sites zijn sterk door focus. Een carrousel
communiceert onbeslistheid. Technisch nadeel: moeilijk CLS-vrij te houden (SYSTEM.md §6).
Gebruik één krachtig hero-beeld.

### Anti-patroon 6: Drop shadows en glow-effecten op productafbeeldingen
**Herkenningspunten:** `box-shadow: 0 4px 20px rgba(0,0,0,0.3)` op producttegels,
"magische" glans-overlays op kledingstukken.
**Waarom fout:** Dateert het design onmiddellijk (visuele taal van 2012). Luxe-esthetiek
communiceert via witruimte en fotokwaliteit, niet via effecten.

### Anti-patroon 7: Instagram-screenshots als productkader
**Herkenningspunten:** Schermafbeeldingen van Instagram-posts (met vind-ik-leuks, profielphoto,
hashtags zichtbaar) als "galerij" op de website.
**Waarom fout:** Lage resolutie, inconsistente stijl, watermerken van Instagram — alles haaks
op een gecureerde boutique-esthetiek. Gebruik altijd de bronafbeelding, niet de screenshot.

### Anti-patroon 8: Meerdere lettertypen zonder systeem
**Herkenningspunten:** Homepage gebruikt drie of meer verschillende lettertypefamilies (bijv.
Raleway voor de kop, Open Sans voor de body, Pacifico voor een accent en Times New Roman voor
een quote).
**Waarom fout:** Typografische chaos. Maximaal twee families (heading serif + body sans, of
één family in meerdere gewichten). Elke extra family is een laadkost én een stijlbreuk.
