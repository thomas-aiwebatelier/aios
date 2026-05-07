---
industry: professional-services
language: nl-BE
applies_to: [accountant, advocaat, notaris, financial-advisor, boekhouder, consultant, fiscalist]
---

# Industry Style Guide: Professional Services (Juridisch, Notariaat & Financieel Advies)

Doelgroep: advocatenkantoren, notariskantoren, accountants, erkende boekhouders-fiscalisten,
financiële adviseurs en managementconsultants in Vlaanderen en België. Klanten hebben een
hoge lifetime value en oriënteren zich zorgvuldig. Impulse-aankopen bestaan niet.

---

## 1. Aesthetic Conventions

### Typografie

Koppen in een klassiek, gezaghebbend serif: **Cormorant Garamond**, **EB Garamond** of
**Source Serif 4**. Stel `font-weight: 300–400` in voor display-koppen — vetgedrukt is
te agressief. Broodtekst en navigatie in een rustige sans-serif: **Source Sans 3**,
**Inter** of **IBM Plex Sans**.

```css
/* Voorbeeld per-site override — na import van tokens.css (SYSTEM.md §9) */
:root {
  --brand-primary: #1b2d4f;   /* navy                            */
  --brand-accent:  #7a4f3a;   /* oxblood / warmbruin             */
  --brand-bg:      #f5f2ec;   /* crème / gebroken wit            */
  --brand-fg:      #1a1917;   /* bijna-zwart, warm               */
}
```

Toegestane `--brand-primary` paletten per kantoor-karakter:

| Karakter | Primary | Accent | Noot |
|---|---|---|---|
| Klassiek-juridisch | `#1b2d4f` (navy) | `#7a4f3a` (oxblood) | Meest formeel |
| Notariaat | `#2c3e2d` (bosgroen) | `#8c7553` (taupe-goud) | Aards, vertrouwd |
| Financieel/audit | `#2d2416` (diepbruin) | `#5c6b5a` (saliegroen) | Neutraal, serieus |
| Boutique-advocaat | `#3b2f2f` (espresso) | `#b09070` (zand) | Warm, intiem |

Afgeleide tinten via `color-mix()` (SYSTEM.md §9) — nooit nieuwe tokens aanmaken:

```css
/* Zachte sectieachtergrond */
background: color-mix(in srgb, var(--brand-primary) 6%, var(--brand-bg));

/* Hover-donker op primary-knop */
background: color-mix(in srgb, var(--brand-primary) 80%, black);

/* Subtiele border */
border-color: color-mix(in srgb, var(--brand-accent) 30%, var(--brand-bg));
```

### Witruimte en densiteit

Genereus. Professionele kantoren zijn geen webshops. Gebruik de hogere spacing-stops:

- Sectie-padding verticaal: `var(--space-24)` tot `var(--space-32)`
- Tussenruimte kaartblokken: `var(--space-8)`
- Alinea-doorloop: `var(--space-4)` (1rem) — geen compressie
- Hero bottom-padding: minimaal `var(--space-32)`

Maximale breedte: `var(--max-w)` (1280 px). Kolommen: 12-kolom grid,
`gap: var(--gutter)` (24 px). Zijmarges mobiel: `var(--space-6)`.

### Kleur — absolute regels

- GEEN felle accenten (neon, helderblauw, felgroen). De saturatie blijft diep en gedekt.
- GEEN degradees als achtergrond. Een enkel plat kleurvlak of een subtiele textuurlaag
  (`opacity: 0.03` papier/canvas SVG) is acceptabel.
- Wit wordt **crème/gebroken wit** (`--brand-bg`). Puur `#ffffff` voelt klinisch.
- Donkere secties (footer, hero-variant): `--brand-primary` als achtergrond,
  `--brand-bg` of wit als tekst. Nooit `--brand-fg` op `--brand-primary` tenzij
  contrast ≥ 4,5:1 gevalideerd (SYSTEM.md §4).

### Beweging — terughoudendheid verplicht

- Geen parallax-effecten. Geen scrolanimaties die afleiding geven.
- Toegestaan: `transition: opacity var(--dur-standard) var(--ease)` op knoppen en links.
- Hero-video: uitsluitend als stille, langzame office-loop zonder ondertiteling.
- `prefers-reduced-motion` altijd respecteren (SYSTEM.md §5).

---

## 2. Tone of Voice in Dutch (Belgian, "u")

Altijd **"u"** — geen enkele uitzondering. "Jij", "je", "jouw" zijn verboden in alle
klantgerichte copy: knoppen, formulierlabels, foutmeldingen, mails en meta-beschrijvingen.

### Woordkeuze: formeel vakjargon, geen marketingspreken

Gebruik de correcte Belgisch-juridische en boekhoudkundige termen:

- *fiscale optimalisatie* — niet "belastingvoordeel"
- *vennootschapsrecht* — niet "bedrijfsrecht"
- *erkend boekhouder-fiscalist (ITAA)* — altijd met kwalificatie
- *gerechtelijke procedure* / *procesvoering* — niet "rechtszaak"
- *notariële akte* / *authentieke akte* — niet "notarisdocument"
- *successieplanning* / *estate planning* — beide gangbaar
- *onroerend goed* — nooit "vastgoed" in notariële context
- *aankoopbelofte* / *compromis* — gebruik de juridisch correcte term
- *IBR-revisor* / *ITAA-erkend* — vermeld de erkenning expliciet
- *Orde van Vlaamse Balies (OVB)* — voluit bij eerste vermelding

### Voorbeeldzinnen — woordelijk te gebruiken of als model

**Homepage hero:**
> "Wij adviseren ondernemers, familiale vennootschappen en particulieren in complexe
> fiscale en juridische vraagstukken. Maak een afspraak voor een eerste oriënterend gesprek."

**Diensten-inleiding:**
> "Ons kantoor adviseert u in alle aspecten van het vennootschapsrecht, van de oprichting
> van uw onderneming tot fusies, splitsingen en herstructureringen."

**Vertrouwenssignaal:**
> "Mr. Jan De Smet is advocaat aan de balie van Antwerpen en erkend bemiddelaar
> (FOD Justitie) met meer dan twintig jaar ervaring in handels- en insolventierecht."

**CTA op dienstenpagina:**
> "Wenst u meer informatie over onze boekhoudkundige diensten? Stuur ons uw vraag
> via onderstaand formulier en wij nemen binnen twee werkdagen contact met u op."

**Contactformulier-intro:**
> "Beschrijf uw vraag zo volledig mogelijk. Wij behandelen uw gegevens strikt
> vertrouwelijk conform de GDPR-wetgeving."

**Actualiteit-teaser:**
> "Onze fiscalisten publiceerden een analyse van de recente wijzigingen in
> de vennootschapsbelasting. Lees het volledig artikel hieronder."

### Wat te vermijden

| Vermijd | Gebruik in plaats daarvan |
|---|---|
| "Welkom bij ons team!" | Geen begroetingszin — begin in medias res |
| "Wij helpen jou groeien" | "Wij adviseren u bij de groei van uw onderneming" |
| "Super blij dat u er bent" | Nooit |
| "Neem gerust contact op!" | "Neem contact op via onderstaand formulier" |
| "Onze passie is uw succes" | Niet van toepassing — onprofessioneel |
| "Klik hier" | "Raadpleeg onze tarievenwijzer" / "Lees het artikel" |

---

## 3. Page Structure Patterns

### Standaard set: 4–5 pagina's

```
/          → Home (diensten-overzicht + trust signals + CTA)
/diensten  → Dienstenoverzicht (of per-praktijkgebied)
  /diensten/fiscale-advies         ← notarissen en advocaten
  /diensten/vennootschapsrecht
  /diensten/successieplanning
/over      → Kantoor + team (partners + medewerkers)
/actualiteit  → Blog / juridische actualiteit (optioneel maar aanbevolen)
/contact   → Contactformulier + adres + kaart + kantoortijden
```

Notariskantoren en grotere advocatenkantoren voegen praktijkgebied-subpagina's toe.
Kleinere boekhouders/consultants beperken zich tot 4 pagina's zonder blog.

### Navigatiestructuur

- Logo links (kantoor-naam, liefst in serif lettertype, geen claimliner eronder).
- Navigatie-items: maximaal 5 à 6. Geen mega-menu's.
- Actieve pagina: visueel onderscheid via `color: var(--brand-accent)` of
  `border-bottom: 2px solid var(--brand-primary)` — geen achtergrondmarkering.
- Mobile: hamburger-menu, geen off-canvas-animatie met bounce.
- Sticky header: subtiele border-bottom
  `color-mix(in srgb, var(--brand-primary) 15%, var(--brand-bg))` bij scroll.
- Geen chatwidgets, geen cookie-opt-in-pop-ups die de helft van het scherm bedekken.

### Footer

- BTW-nummer + ondernemingsnummer prominent.
- Erkenningsnummer (ITAA/IBR/OVB) indien van toepassing.
- Kantooradres + telefoonnummer als klikbaar `tel:`-link.
- Privacyverklaring + cookiebeleid links (verplicht).
- Sociaal media: LinkedIn alleen — geen Instagram, geen Facebook.
- GEEN nieuwsbrief-aanmeldformulier in de footer tenzij het kantoor
  een volwassen e-mailprogramma heeft.

---

## 4. Section Patterns

### Hero (home)

- Achtergrond: foto van het kantoorgebouw of een abstracte textuur op `--brand-primary`.
  GEEN stockfoto's van handshakes, glimlachende advocaten in pak.
- Koptekst: `--text-4xl` à `--text-5xl`, serif, gewicht 300–400, crème op donker
  of `--brand-primary` op crème. Maximaal twee regels.
- Subtekst: `--text-lg`, sans-serif, maximaal 40 woorden.
- Één primaire CTA; geen secundaire knop naast de primaire.
- Padding: `var(--space-32)` top/bottom.

### Diensten-blok (home, overzicht)

- 2- of 3-koloms grid op desktop (`gap: var(--gutter)`), 1-kolom mobiel.
- Per dienst: icoontje (lijnstijl, monochroom in `--brand-accent`) + titel
  `--text-xl` + 2 à 3 zinnen beschrijving `--text-base` + link.
- GEEN prijzen op de overzichtspagina. Tarieven op aanvraag of op aparte pagina.
- Iconen: geen emoji, geen gevulde kleuriconen — altijd lijnstijl.

### Teamblok / Partners

- Foto (zwart-wit of gereduceerde kleurverzadiging), formeel, neutrale achtergrond.
- Naam: `--text-xl`, serif.
- Titel direct onder naam: "Advocaat | Balie van Brussel" of "ITAA-erkend boekhouder-fiscalist".
- Korte bio: 2–3 zinnen max. `--text-sm`, sans-serif.
- Geen LinkedIn-icoontjes per persoon op de kaart — link enkel via de detailpagina.

### Actualiteit / Blog

- Lijst van artikels: datum + titel + categorie-tag + eerste 30 woorden.
- Categorieën: "Fiscaal recht", "Vennootschapsrecht", "Successieplanning", etc.
- Auteur: naam + functie, geen foto op de lijstpagina.
- RSS-feed beschikbaar (trust signal voor Google).

### Contactsectie (ook als component op andere pagina's)

- Tweekoloms: formulier links, adres/kaart rechts.
- Achtergrond: `color-mix(in srgb, var(--brand-primary) 6%, var(--brand-bg))` —
  subtiele afscheiding van de rest van de pagina.
- Google Maps embed of statische kaartafbeelding.
- Kantoortijden als `<table>` of eenvoudige lijst — geen fancy componenten.

---

## 5. CTA Conventions

### Toegestane CTA-formuleringen (woordelijk)

| Context | CTA-tekst |
|---|---|
| Hero / bovenaan pagina | "Vraag een afspraak" |
| Dienstenpagina | "Contacteer ons voor meer informatie" |
| Teamlid / partner | "Maak kennis met ons team" |
| Blog / actualiteit | "Lees het volledige artikel" |
| Contactformulier | "Verstuur uw vraag" |
| Telefoonsuggestie | "Bel voor een eerste consult" |
| Tarieven/offerte | "Vraag een vrijblijvende offerte" |

### Knopstijl

```css
/* Primaire CTA */
.btn-primary {
  background: var(--brand-primary);
  color: var(--brand-bg);
  padding: var(--space-3) var(--space-8);
  font-size: var(--text-sm);
  font-family: sans-serif;          /* Source Sans / Inter */
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
  border: 1px solid var(--brand-primary);
  padding: var(--space-3) var(--space-8);
  font-size: var(--text-sm);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: background var(--dur-standard) var(--ease),
              color var(--dur-standard) var(--ease);
}
.btn-secondary:hover {
  background: color-mix(in srgb, var(--brand-primary) 8%, var(--brand-bg));
}
```

### Wat nooit mag

- "Boek nu" / "Koop nu" / "Start gratis" — volledig verkeerde register.
- Knopkleur `--brand-accent` als contrast-vulling op donkere achtergrond zonder
  WCAG AA-validatie (SYSTEM.md §4). Accent is voor decoratieve elementen, niet voor
  primaire knoppen tenzij contrast voldoet.
- Urgentie-triggers: "Beperkt aantal plaatsen!", "Vandaag gratis advies!".
- Zweef-effecten met grote schaaltransformaties op knoppen.

---

## 6. Trust Signals

Trust-signalen zijn geen optie in deze sector — ze zijn de primaire conversiefactor.
Elk van de volgende elementen verdient een zichtbare plek.

### Erkenningen en lidmaatschappen

- **ITAA** (Instituut van de Accountants en de Belastingconsulenten): vermeld de
  erkenningscategorie (accountant / belastingconsulent / boekhouder-fiscalist) en
  het lidmaatschapsnummer.
- **IBR** (Instituut van de Bedrijfsrevisoren): vermeld voor revisoren en auditeurs.
- **Orde van Vlaamse Balies (OVB)**: verplicht voor advocatenkantoren. Balie-lidnummer
  als voetnoot bij elke partnerbio.
- **Koninklijke Federatie van het Belgisch Notariaat (FRNB / Notaris.be)**: logo in
  footer, link naar notaris.be-profiel.
- **FSMA-registratie**: voor financiële planners en verzekeringsbemiddelaars.

### Juridische kantooridentificatie (footer)

```html
<!-- Voorbeeld footer trust-block -->
<p class="trust-legal">
  BTW BE 0xxx.xxx.xxx — Ondernemingsnummer 0xxx.xxx.xxx<br>
  Erkend boekhouder-fiscalist ITAA nr. XXXXXXXX<br>
  Lid van het ITAA en de BeroepsVereniging van Erkende Boekhouders (BIBF-lid voor
  2019, overgedragen naar ITAA)
</p>
```

### Oprichtingsjaar en continuïteit

Vermeld het oprichtingsjaar prominent op de "Over ons"-pagina. Formule:
> "Ons kantoor is actief sedert 1987 en bedient een trouwe cliëntèle van kmo's
> en familiale ondernemingen in de regio Gent-Waas."

### Publicaties en media-optredens

- Artikelen in vakbladen (Fiscoloog, Juristenkrant, De Tijd) als lijst op de
  over-pagina of actualiteits-pagina.
- Spreekbeurten / gastdocentschappen: "Gastspreker Universiteit Antwerpen —
  Bijdragen vennootschapsrecht 2023."
- Gerechtelijke procedures van belang (met cliënts toestemming of anoniem).

### Tevredenheidssignalen

- Google-recensies: spar mee met `aggregate-rating` structured data.
- Geen nep-testimonials met stockfoto's. Echte cliënten met naam en sector,
  of helemaal geen testimonials.
- Vermelding in Juridische Raamwerken (Chambers, Legal 500 BE) indien aanwezig.

---

## 7. Imagery Guidance

### Wat werkt

**Portretfoto's van partners en medewerkers**
- Formeel, neutrale achtergrond (crème, gebroken wit, of licht grijs).
- Goed belicht, scherp. Consistente stijl over alle teamleden.
- Zwart-wit of licht gedesatureerd (`filter: saturate(0.6)`) voor een
  klassieke, samenhangende look.
- Kleding: professioneel, donkere kleuren — consistent met kantoorcultuur.

**Kantooromgeving**
- Boekenkasten met rechtskundige werken, stille bureaus, conferentieruimte.
- Architectuurdetails van het gebouw indien representatief.
- Belgische stadsfoto's (Gent, Antwerpen, Brussel): gevelrijen, historische
  pleinen — tonen lokale verankering.

**Documentair / tekstueel**
- Close-up van een open codex, juridisch document met zegelstempel (wettekst, niet
  persoonlijk dossier), vulpen op papier — rustgevend en gezaghebbend.

### Wat verboden is

- Stockfoto's van handdrukken (cliché nr. 1 in de sector).
- Mensen die naar laptopschermen wijzen in vergaderruimtes.
- Hamer / gerechtshamer (gavel) — Belgische rechtbank gebruikt ze niet.
- Kleurrijke stockillustraties of flat-design iconen als hero-beeld.
- AI-gegenereerde gezichten van "advocaten" of "klanten".
- Fotofilters met hoge kleurverzadiging of warme vintage-effecten.

### Technische vereisten (SYSTEM.md §5)

- Alle afbeeldingen als `<img alt="...">` met beschrijvende alt-tekst.
- Decoratieve achtergrondfoto's: `role="presentation" alt=""`.
- LCP-afbeelding (hero): `loading="eager" fetchpriority="high"`.
- Overige: `loading="lazy"`.
- Formaat: WebP met JPEG/PNG fallback. Maximale breedte 1600 px voor hero's.

---

## 8. Reference URLs

De volgende drie sites zijn geverifieerd toegankelijk (geladen op 7 mei 2026) en
illustreren goede tot sterke ontwerpkeuzes voor de sector in België.

### 1. https://www.notaris.be

**Type:** Officieel platform Koninklijke Federatie Belgisch Notariaat (Vlaanderen/BE)
**Observatie:** Rustig, institutioneel design; heldere navigatiestructuur per
levenssituatie (kopen, erven, ondernemen); consequent "u"-register; portaalpagina's
per praktijkgebied als model voor notariskantoren; geen overbodige decoratie.

### 2. https://www.curia.be

**Type:** Boutique advocatenkantoor (Vlaanderen)
**Observatie:** Minimalistisch tot op het bot — wit met zwart, serife typografie,
geen afleiding. Demonstreert hoe terughoudendheid zelf een kwaliteitssignaal is;
navigatie in drie talen (NL/EN/FR) toont internationale clientèle; kantoor-naam
als enig hero-element.

### 3. https://www.claeysengels.be

**Type:** Gespecialiseerd arbeidsrecht-advocatenkantoor (BE, meerdere kantoren)
**Observatie:** Strak meerkolomsdesign, sterke actualiteits-sectie (nieuws/events
prominent in de navigatie), consistente teampresentatie per kantoor, Nederlandstalige
eerste interface met duidelijke taalswitch. Goede illustratie van een sector-autoriteit
die actualiteit als primair trust-signaal inzet.

---

## 9. Negative Examples

De onderstaande patronen zijn anti-patronen voor deze sector. Genereer ze niet.

### Inhoud en copy

| Anti-patroon | Waarom fout |
|---|---|
| Hero: "Welcome to our firm" (Engels) | Belgische cliënt verwacht NL of FR |
| "Wij zijn er voor jou, dag en nacht!" | Verkeerd register ("jij") + onwaardig |
| CTA: "Plan je gratis gesprek nu!" | "Jij", urgentie, en "gratis" = onprofessioneel |
| Contactformulier met 12+ velden | Vraagt te veel te vroeg; drempelverhoging |
| Sectie "Onze passie voor recht" | Marketingspreken; geloofwaardigheid daalt |
| Prijzen op dienstenpagina tenzij forfait | Zet fee-discussie op de verkeerde plek |

### Visueel en technisch

| Anti-patroon | Waarom fout |
|---|---|
| Stockfoto handshake als hero | Cliché nr. 1; verlaagt onmiddellijk het vertrouwen |
| Gradient-accentknop (paars→blauw) | Incompatibel met de conservatieve esthetiek |
| Parallax-scrolleffect op hero | Leidt af; past bij entertainment, niet bij advocatuur |
| Comic Sans of Pacifico als lettertypekeuze | Volledig onverenigbaar met de sector |
| Grote zwevende chatwidget rechtsonder | Verstorend; kantoor-contact = telefoon/mail |
| Teller "X blije cliënten" met groot cijfer | Onbewijsbaar; ondermijnt geloofwaardigheid |
| Kaartblokken met afgeronde hoeken ≥ 16 px | Te speels; rechthoekig of lichte afronding max. |
| Animerende hero-tekst letter per letter | Theatraal; volledig verkeerde sfeer |
| Logo in neon of felle gradient | Niet compatibel met de kleurconventies (§1) |
| Sociale-bewijskracht via Like-tellers | Irrelevant voor de doelgroep; laat weg |

### Structurele fouten

- Geen BTW- of ondernemingsnummer in de footer: juridisch risicovol én
  wekt wantrouwen bij zakelijke cliënten.
- Over-pagina zonder kwalificaties onder partnernamen: cliënten controleren
  OVB/ITAA-lidmaatschap actief.
- Contact-pagina zonder fysiek adres: vereist voor kantoren met cliëntontmoetingen
  en door de deontologische regels (OVB, ITAA).
- Blog-pagina zonder datum op artikelen: juridische actualiteit heeft een
  duidelijke tijdsgebondenheid — een artikel zonder datum is onbetrouwbaar.
- Testimonials van anonieme "tevreden cliënten" met stockfoto: in de juridische
  sector ongeloofwaardig en deontologisch gevoelig.
