---
industry: health-wellness
language: nl-BE
applies_to: [tandarts, kine, kinesist, kinesitherapeut, psycholoog, osteopaat, chiropractor, kliniek, groepspraktijk]
---

# Industrie-gids: Gezondheid & Welzijn — Zorgpraktijken

Doelpubliek van de gids: Claude Code bij het genereren van een website voor een lead in de zorgsector (tandarts, kinesitherapeut, psycholoog, osteopaat, chiropractor, groepspraktijk).
Taal van de gegenereerde site: `nl-BE` (Standaardnederlands, Vlaams register, aanspreking "u").
Geografisch bereik: Vlaanderen en Brussel; RIZIV-regelgeving van toepassing.

---

## Aesthetic conventions

### Typografie

Gebruik een kalm, leesbaar lettertype-paar dat professionaliteit uitstraalt zonder klinisch-steriel aan te voelen:

- **Headlines / koppen**: humanistisch schreef-lettertype — Source Serif 4, EB Garamond, Lora. Licentievrij via Google Fonts. Het schreeflettertype geeft warmte en gezag; nooit condensed-serif (te technisch), nooit slab-serif (te industrieel).
- **Body / navigatie / labels**: neutrale humanistische sans-serif — Inter, DM Sans, Manrope. Minimaal `--text-base` voor lopende tekst. Regellengte max. 70 tekens (`max-width: 65ch` op paragraafcontainers).
- **Hiërarchie**: Headlines in `--text-3xl` tot `--text-4xl`, tussenkoppen in `--text-xl` tot `--text-2xl`, body in `--text-base`, disclaimers / RIZIV-info in `--text-sm`.
- **Wat vermijden**: Raleway of Josefin Sans (te modisch), Comic Sans op kindenpagina's (nooit), geometrische display-lettertypes (te koud), twee sans-serif-lettertypes door elkaar.

### Kleurpalet

Kalm, warme kleuren; geen clinisch blauw-wit. Richtpalet voor `--brand-*` tokens (per SYSTEM.md §9):

| Token | Richting | Voorbeeldwaarden |
|---|---|---|
| `--brand-primary` | Saliegroen, warm leisteen, diepblauw-groen, warm taupe | `#4a7c6f`, `#3d5a6e`, `#5a7a6e`, `#6b5e52` |
| `--brand-accent` | Zacht terracotta, warm goud-beige, saliegroen lichter | `#c4836a`, `#b9956c`, `#7aaa99` |
| `--brand-bg` | Gebroken wit, warm ivoor, licht zand | `#f8f6f2`, `#faf9f6`, `#f5f2ee` |
| `--brand-fg` | Donkere inkt (nooit puur zwart) | `#1e2022`, `#2c2c2c` |

Contrast altijd valideren per SYSTEM.md §5 (4.5:1 voor body, 3:1 voor grote tekst en UI-componenten).

Kleur-afgeleiden via `color-mix()` per SYSTEM.md §9 — bv. een zachte sectie-achtergrond:
`color-mix(in srgb, var(--brand-primary) 8%, var(--brand-bg))`.
Nooit nieuwe `--color-*` of `--brand-secondary` tokens uitvinden.

**Vermijden**: ziekenhuiswit (`#ffffff`) gecombineerd met koud lichtblauw, felle rode of oranje accenten (agressief), puur zwart-op-wit zonder warmte.

### Witruimte en layout

- Ruime, ademende pagina's. Verticale sectie-scheiding: `--space-16` tot `--space-24` (64–96 px) per SYSTEM.md §1.
- Interne padding van blokken: `--space-8` tot `--space-12` (32–48 px).
- Kaartpanelen (behandelingen, teamleden): interne padding `--space-6` (24 px), tussenruimte `--space-6`.
- Maximale contentbreedte: `var(--max-w)` (1280 px), horizontaal gecentreerd met `margin-inline: auto`.
- **Navigatie**: horizontale topbalk op desktop, hamburger op mobiel. Max. 6 items. Geen mega-menu.
- **Raster team / behandelingen**: 2-koloms op `md` (768 px+), 3-koloms op `lg` (1024 px+), 1-kolom mobiel.

---

## Tone of voice in Dutch (Belgian, "u")

### Register

**Bijna altijd "u"** — zorgpraktijken spreken patiënten aan met "u". Uitzonderingen:
- Pediatrische en sportfysiotherapie-praktijken kunnen een "u/jij"-mengvorm hanteren op de website, mits consequent per sectie.
- Jonge doelgroepspraktijken (bv. studenten-psychologenpraktijk) mogen "jij" hanteren als dat expliciet tot de positionering behoort — stel dit vast vóór generatie.

Standaard: gebruik "u" door de hele site.

### Toon

Professioneel en warm — niet afstandelijk, niet overdreven joviaal. De patiënt is in een kwetsbare positie; de toon reflecteert rust en competentie.

- **Helderheid boven jargon**: leg medische termen altijd uit in gewoon Nederlands.
- **Geruststellen**: gebruik verzekerende, rustige zinsbouw. Geen alarmerend taalgebruik.
- **Vermijden**: marketing-superlatieven ("beste tandarts van Gent!"), anglicismen ("smile makeover", "pain-free experience"), overdreven enthousiasme ("Ontdek uw stralende toekomst!").

### Concrete Nederlandse voorbeeldzinnen

**Hero / welkomsttekst:**
- "Welkom in onze praktijk. Wij begeleiden u met aandacht en deskundigheid."
- "Een vertrouwde praktijk voor de ganse familie — in het hart van [stad]."
- "Kwaliteitsvolle zorg, dichtbij huis. Wij nemen de tijd voor u."

**Behandelingen-pagina:**
- "Tijdens een consultatie bespreken wij uw klachten en stellen wij een behandelplan op dat bij u past."
- "Kinesitherapie na een sportblessure? Wij begeleiden u stap voor stap naar volledig herstel."
- "Uw eerste afspraak bij een psycholoog is een kennismakingsgesprek zonder verdere verbintenis."

**Tarieven / terugbetaling:**
- "Onze praktijk is volledig geconventioneerd. U betaalt het officieel RIZIV-tarief, zonder bijkomende ereloonopslag."
- "Raadpleeg uw ziekenfonds voor de exacte terugbetaling van kinesitherapie-sessies."
- "Wij zijn erkend door het RIZIV (nr. [nummer]). Uw mutualiteit vergoedt een deel van de consultaties."

**Afspraak / contact:**
- "Maak eenvoudig online een afspraak via Doctena, of bel ons tijdens de praktijkuren."
- "Voor dringende gevallen kunt u ons telefonisch bereiken op [nummer]."
- "Wenst u meer informatie over onze behandelingen? Neem gerust contact met ons op."

**Over de praktijk:**
- "Onze praktijk bestaat uit een team van erkende therapeuten met complementaire specialisaties."
- "Wij spreken Nederlands, Frans en Engels — zodat iedere patiënt zich thuis voelt."

**Jargon-uitleg (schrijf zo — nooit aannames):**
- "Geconventioneerd betekent dat wij de officiële tarieven van het RIZIV toepassen. U betaalt nooit meer dan het wettelijk vastgestelde tarief."
- "Het RIZIV-nummer is het officiële erkenningsnummer van uw zorgverlener. Het garandeert dat deze bevoegd is om de terugbetaalbare zorg te verlenen."

---

## Page structure patterns

Standaard paginaset voor een zorgsector-website (5–6 pagina's):

| Pagina | Doel | Prioriteit |
|---|---|---|
| Home | Eerste indruk, vertrouwen, CTA afspraak | Verplicht |
| Over de praktijk | Praktijkgeschiedenis, waarden, team | Verplicht |
| Behandelingen / Diensten | Overzicht van het aanbod per categorie | Verplicht |
| Afspraak maken | Booking-widget of link + praktische info | Verplicht |
| Contact | Adres, kaart, bereikbaarheid, openingsuren | Verplicht |
| FAQ / Tarieven & Vergoedingen | Terugbetaling, mutuialiteit, conventionering | Aanbevolen |

**URL-structuur** (kebab-case, per SYSTEM.md §8):
`/`, `/over-de-praktijk`, `/behandelingen`, `/afspraak`, `/contact`, `/tarieven-en-vergoedingen`

**Navigatievolgorde**: Home → Behandelingen → Over ons → Tarieven & Vergoedingen → Afspraak → Contact

---

## Section patterns

### Hero-sectie (homepage)

- Eén sterk sfeerbeeld van de praktijkruimte of het team, **geen** roterende carousel.
- Overlay-tekst: korte welkomstboodschap (max. 12 woorden) + subkop (max. 20 woorden) + primaire CTA.
- Achtergrond: foto met lichte, warme donkere overlay (`color-mix(in srgb, var(--brand-fg) 40%, transparent)`).
- Hoogte: `90vh` op desktop, `70vh` op mobiel.

### Behandelingen-sectie

- Kaartindeling: icoon of kleine illustratie + titel + 2–3 zinnen uitleg + optionele "Meer lezen"-link.
- Iconen: lijn-iconenset (bijv. Phosphor, Heroicons) — geen medische clip-art.
- Max. 6 kaarten per rij (doorgaans 3 op desktop); overflow naar volgende rij.

### Team-sectie

- Portretfoto + naam + titel (bv. "Erkend kinesitherapeut") + specialisaties + eventueel talen.
- RIZIV-nummer per teamlid optioneel tonen (zie §Trust signals).
- Layout: 2–3 koloms op desktop, 1 kolom mobiel.

### Vertrouwens-blok (trust bar)

- Horizontale balk of small-kaart-rij met: jaren ervaring | aantal patiënten of behandelingen | erkende beroepsvereniging | convenieringstatus.
- Gebruik `--space-6` padding intern, `--space-8` gap tussen elementen.

### Terugbetaling / Tarieven-sectie

- Altijd aanwezig als aparte sectie of pagina.
- Tabel of kaartjes: sessie-type | officieel tarief | terugbetaling | uw aandeel.
- Duidelijke vermelding: "Geconventioneerd" of "Niet-geconventioneerd" met toelichting.
- Link naar RIZIV-zoeker voor verificatie.

### Afspraak-sectie

- Primaire booking: embed of link naar Doctena, Doctoranytime, Doclr, of Calendly.
- Secundaire optie: telefoonnummer (for urgencies), e-mail.
- Openingsuren in gestructureerde lijst; altijd ook in `LocalBusiness` JSON-LD schema (SYSTEM.md §8).

---

## CTA conventions

### Primaire CTA

**"Maak een afspraak"** — dit is de standaard primaire call-to-action voor alle zorgpraktijken.

- Kleur: `var(--brand-primary)` achtergrond, `var(--brand-bg)` tekst (of omgekeerd afhankelijk van contrast).
- Grootte: `--text-base` tot `--text-lg`, padding `--space-3` verticaal × `--space-6` horizontaal.
- Positie: rechtsboven in navigatie (sticky op desktop), onderaan hero, onderaan behandelingskaarten.

### Secundaire CTA

- **"Online afspraak boeken"** → deep link naar Doctena / Doctoranytime / Doclr-profiel.
- **"Bel ons"** met klikbaar telefoonnummer (`tel:`-link) — voor urgente vragen.
- **"Meer info over [behandeling]"** — tekstlink of ghost-button op behandelkaarten.

### CTA-taalregels

- Imperatief, "u"-register: "Maak een afspraak", "Neem contact op", "Bekijk ons aanbod".
- Nooit Engelstalige CTA's: geen "Book Now", "Get Started", "Contact Us".
- Nooit agressieve urgentie: geen "Boek vandaag nog voor het te laat is!", geen countdowntimers.

### Booking-integratie

Vermeld expliciet welk platform wordt gebruikt (Doctena is marktleider in BE zorg):
- Doctena: `https://www.doctena.be/[praktijkslug]`
- Doctoranytime: `https://www.doctoranytime.be/...`
- Doclr: `https://www.doclr.be/...`

Embed de widget inline wanneer de praktijk dat aanraadt; anders een prominente externe link-knop.

---

## Trust signals

Vertrouwen is de primaire conversiefactor in de zorgsector. Zet deze elementen prominent:

### Wettelijk verplicht / sterk aanbevolen

| Element | Positie | Noot |
|---|---|---|
| **RIZIV-nummer** | Footer + over-pagina | Wettelijk vereist voor erkende zorgverleners in BE. Toon per therapeut. |
| **Convenieringstatus** | Hero of apart blok bovenaan contact/tarieven | "Volledig geconventioneerd", "Gedeeltelijk geconventioneerd", of "Niet-geconventioneerd" + toelichting. |
| **Beroepsvereniging** | Footer of over-pagina | Tandarts → VBT / Dentalia. Kine → Axxon. Psycholoog → BFP / Compsy. Osteopaat → BVO. Chiropractor → BCA. |

### Sterk aanbevolen

- **Teamfoto's met naam + specialisatie**: echte foto's > stock. Zie §Imagery guidance.
- **Jaren ervaring**: "Al meer dan 15 jaar uw vertrouwde praktijk in [gemeente]."
- **Talen**: "Wij spreken Nederlands, Frans en Engels" — relevant in tweetalig BE.
- **Diploma's en bijscholingen**: beknopt vermeld op de over-pagina of per teamlid.
- **Ziekenfonds-partners**: logo's van de grote mutualiteiten (CM, Solidaris, Liberale Mutualiteit, HELAN, Neutrale Ziekenfondsen) als de praktijk samenwerkt.
- **Google Reviews-score**: toon sterren + aantal beoordelingen indien ≥ 4.0 en ≥ 20 reviews.
- **Patiëntenquote**: 1–2 geanonimiseerde getuigenissen op homepage.

### Footer-verplichtingen

Elke footer bevat minimaal: praktijknaam + adres + RIZIV-nummer + telefoonnummer + openingsuren + privacybeleid (GDPR-link) + cookieverklaring.

---

## Imagery guidance

### Wat wel

- **Praktijkinterieur**: wachtzaal en behandelkamer — warm verlicht, netjes maar niet steriel-koud. Planten, hout, warme kleuren zijn welkom. Geen all-white SPA-look.
- **Teamportretten**: warm, glimlachend maar professioneel. Witte jas optioneel (niet verplicht). Echte mensen, geen stock-modellen. Neutrale achtergrond of praktijkomgeving.
- **Belgische context**: exterieur van het pand, straatgevels, Vlaamse baksteenarchitectuur — geeft lokaliteit en vertrouwen.
- **Behandelingssfeer**: handen van een kinesitherapeut in actie (massage, oefenbegeleiding), tandartsenstoel vanuit patiëntperspectief (ontspannen, niet bedreigend), consultatieruimte van een psycholoog (comfortabele stoelen, planten, boeken).

### Wat niet

- Stockfoto-tandarts die een reusachtige plastic tand of tandenborstel vasthoudt.
- "Witte jas, armen gekruist, brede glimlach in studio"-portret — cliché en onpersoonlijk.
- Handschoenen die een anonieme patiënt aanraken (generiek medisch stock).
- Microscoop, pillen op een witte achtergrond, ziekenhuiscorridors.
- AI-gegenereerde "medische modellen" (te perfect, onnatuurlijk).
- Autoplaying video van een dokter die een patiënt de hand schudt.
- Before/after-carrousel van tanden of huid (kan als misleidend worden beschouwd onder BE-reclameregels voor medische beroepen).
- Engelse stockfoto's met zichtbaar Engelstalig materiaal op muren of badges.

### Beeldverhouding en plaatsing

- Hero: liggend breed (16:9 of 21:9). Eén enkel sterk beeld.
- Teamportretten: staand (3:4 of 1:1). Consistent formaat per pagina.
- Behandelingssfeerbeelden: liggend (4:3 of 16:9).
- Afbeeldingen: WebP-formaat, `loading="lazy"` voor below-the-fold, LCP-afbeelding nooit lazy (SYSTEM.md §6).

---

## Reference URLs

Drie Belgische zorgpraktijkwebsites, geverifieerd bereikbaar (HTTP 200) tijdens het opstellen van deze gids:

### 1. Tandpunt Gent — `https://www.tandpuntgent.be`

**Type**: Tandartsenpraktijk (tandarts), De Pinte / Gent-regio.
**Observatie**: Rustige, strakke site met "patiënt centraal"-positionering. Correcte Nederlandse copy, preventie-focus. Geen agressieve marketing. Goed voorbeeld van eenvoudige, heldere praktijk-site zonder overbodige franjes. Leesbaar kleurgebruik, duidelijke CTA.

### 2. Kine-Gent — `https://kine-gent.be`

**Type**: Groepspraktijk kinesitherapie, centrum Gent.
**Observatie**: Teamfocus ("wij vormen een groep van erkende kinesitherapeuten"), specialisaties vermeld per behandelaar, sportrevalidatie en manuele therapie prominent. Goede structuur voor groepspraktijk met meerdere disciplines. Rust in het ontwerp, kleurpalet licht en professioneel.

### 3. IPO Psycholoog — `https://ipo.be`

**Type**: Groepspraktijk psychologie, therapie en diagnostiek — Antwerpen, Deurne, Kapellen, Mechelen, Willebroek, Tielt-Winge.
**Observatie**: Meerdere locaties, duidelijk navigatie per locatie en aanbod. Professionele uitstraling zonder klinische koudheid. Duidelijke scheiding tussen diagnostiek en therapie. Aanspreking rustig en informatief. Goede referentie voor multi-locatie of groepspraktijk met breed aanbod.

---

## Negative examples

Patronen die **nooit** worden nagebootst in door Atelier gegenereerde zorgwebsites:

### Visueel

- **Stock-glimlachmodel als hero**: model met overdreven witte tanden recht in de camera — schreeuwt "nep". Vervanging: echte teamfoto of praktijkinterieur.
- **Engelstalige headline op een Vlaamse site**: "Make me smile!", "Your health, our priority", "Pain-free dentistry" — volledig out of place voor BE doelpubliek.
- **For/after-tandcarrousel**: automatisch doorscrollende before/after van tanden of cosmetische behandelingen — agressief, potentieel in strijd met BE-medische reclameregels (KB 18 februari 2005 betreffende reclame voor geneesmiddelen).
- **Autoplay-video van handdruk-met-dokter**: generieke stockclip die automatisch afspeelt bij laden — rommelig en onprofessioneel.
- **Comic Sans of Lobster voor kindenpagina's**: nooit, ook niet "om leuk te doen". Gebruik Nunito of Quicksand als vriendelijkere maar leesbare optie.
- **Koud wit-op-wit met felle rode accenten**: ziekenhuisgroen of alarmerend rood associaties triggeren angst — het tegenovergestelde van de gewenste kalmerende toon.

### Functioneel / copy

- **Chatbot-popup bij landing**: "Hoi! Hoe kan ik u vandaag helpen met uw gezondheid? 😊" — intrusief, wekt wantrouwen in zorgcontext.
- **Geen vermelding van convenieringstatus**: patiënten zoeken dit actief op; weglaten leidt tot telefonische opvolgvragen en verlies van vertrouwen.
- **Tarieven verstopt of onvindbaar**: tarieven en terugbetaling moeten prominent aanwezig zijn, niet verstopt in een PDF-download.
- **Geen RIZIV-nummer zichtbaar**: wettelijke verplichting voor erkende zorgverleners in BE. Weglaten tast geloofwaardigheid aan.
- **Jargon zonder uitleg**: "We bieden IASTM, PNF en dry needling aan" — altijd uitleggen wat elke behandeling inhoudt en voor wie deze geschikt is.
- **Countdown-timer voor "beperkt aanbod"**: absoluut niet gepast in zorgcontext — niet ethisch en niet in lijn met deontologische codes van zorgberoepen.
- **Sociale bewijskracht met fake-getallen**: "Al 10.000+ tevreden patiënten!" zonder bron — wekt wantrouwen bij BE-patiënten.
