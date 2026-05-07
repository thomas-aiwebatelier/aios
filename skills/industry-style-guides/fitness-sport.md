---
industry: fitness-sport
language: nl-BE
applies_to: [gym, fitness, crossfit, yoga, pilates, personal-trainer, pt, sportclub, volleybal, tennis, padel, martial-arts, dansschool]
---

# Industrie-gids: Fitness · Sport · Beweging

Covers gyms, CrossFit boxes, yoga- en Pilates-studio's, personal trainers (PT), sportclubs (volleybal, judo, tennis, padel), martial arts en dansscholen. Vlaamse/Belgische context.

---

## Aesthetic conventions

Deze sector kent twee visueel tegengestelde subgenres. Identificeer het subgenre vóór enige designkeuze.

### Subgenre A — Energiek (gym, CrossFit, HIIT, PT, vechtsporten, padel)

**Kleurpalet**

Donkere achtergronden met hoog-contrast accenten domineren. Richtpalet:

| Token | Richting | Voorbeeldwaarden |
|---|---|---|
| `--brand-primary` | Bijna-zwart, diep navy, antraciet | `#0d0d0d`, `#111827`, `#1a1a2e` |
| `--brand-accent` | Elektrisch blauw, neon groen, blood orange | `#00b4ff`, `#39ff14`, `#ff4500` |
| `--brand-bg` | Donker grijs, bijna-zwart — nooit puur `#000` | `#141414`, `#1c1c1c`, `#0f172a` |
| `--brand-fg` | Wit of lichtgrijs voor body | `#f5f5f5`, `#e2e8f0` |

Accenten (`--brand-accent`) alleen voor primaire CTA-knoppen, highlights, hover-states en icoonkleur — nooit voor bodytekst. Gebruik `color-mix(in srgb, var(--brand-accent) 15%, transparent)` voor subtiele achtergrond-glows zonder de toon te overrompelen.

Contrast altijd valideren: 4,5:1 voor bodytekst, 3:1 voor grote koppen (WCAG AA).

**Typografie**

- Display/koptekst: condensed, bold, hoog gewicht — stijlen als Druk Wide, Inter Tight, Bebas Neue, Oswald. `--text-4xl` (titels) of `--text-5xl` (hero headline). `letter-spacing: -0.02em` tot `-0.04em`.
- Body: Inter, DM Sans, Manrope — clean sans-serif. `--text-base` tot `--text-lg`.
- **Vermijden**: decoratieve scripts, serif voor sport-koppen (tenzij boutique PT-studio), Comic Sans (nooit), Roboto zonder weight contrast (te generiek).

**Layout**

- Full-viewport hero met actie-achtergrondfoto of -video. Overlay met `color-mix(in srgb, var(--brand-bg) 55%, transparent)` zodat tekst leesbaar blijft.
- Asymmetrische grids, diagonale sectiescheidingen (`clip-path: polygon`) of bold dividers zijn gepast.
- Sectie-gating verticaal `--space-16` tot `--space-24`. Interne padding `--space-8` tot `--space-12`.
- Max-breedte layout: `--max-w` met horizontale padding `--gutter`.
- Sticky topbar met trainingsplanning-CTA altijd zichtbaar.

**Motion**

- Subtiele scale-animatie op hero bij load: `transform: scale(1.03)` over `--dur-hero`.
- CTA-hover: achtergrond fade + lichte `translateY(-2px)` over `--dur-micro` met `--ease`.
- Scroll-triggered fade-in van statistieken (member count, klassen per week) over `--dur-standard`.
- **Nooit**: autoplay-video mét geluid, parallax op mobiel (performance killer), loopende neon-flicker.

---

### Subgenre B — Meditatief (yoga, Pilates, mindful movement, boutique wellness-studio)

**Kleurpalet**

Zachte, aardse tinten. Ruimte en rust zijn het visuele statement.

| Token | Richting | Voorbeeldwaarden |
|---|---|---|
| `--brand-primary` | Sage groen, aardegrijs, warm terracotta | `#7d9b76`, `#8a8070`, `#b5714a` |
| `--brand-accent` | Warm zand, gebroken wit, zachte oker | `#d4b896`, `#e8ddd0`, `#c9a96e` |
| `--brand-bg` | Crème, warmwit, licht zand | `#faf7f2`, `#f5f0e8`, `#fffef9` |
| `--brand-fg` | Donkere, warme inkt — nooit koud zwart | `#2c2416`, `#3a3128` |

Gebruik `color-mix(in srgb, var(--brand-primary) 8%, var(--brand-bg))` voor sectie-achtergrondwissels zonder harde grenzen.

**Typografie**

- Koptekst: licht gewicht serif (Cormorant Garamond, Playfair Display, DM Serif Display) of geometric sans (Jost, Plus Jakarta Sans) op laag gewicht. `--text-3xl` tot `--text-4xl`. Ruime letter-spacing `0.02em` tot `0.04em`.
- Body: lichte sans-serif, `--text-base`, royale regelafstand (`line-height: 1.75`).
- **Vermijden**: condensed bold display letters (botst met zen-esthetiek), Times New Roman default, decoratieve scripts die onleesbaar zijn op mobiel.

**Layout**

- Ruime witruimte is de boodschap. Section-gating `--space-24` tot `--space-32`.
- Foto's ademen: geen volle-scherm video-hero, wel een rustig prominente foto met zachte fade-in.
- Eenvoudige, gecentreerde compositie. Geen diagonalen of agressieve clip-paths.
- Twee kolommen max op desktop; ruime eenkoloms op mobiel.

**Motion**

- Fade-in over `--dur-standard` met `--ease` — traag en kalm.
- Geen bounces, geen schokkerige keyframes. Geen auto-scroll of pop-ups bij 30% scroll.

---

### Subgenre C — Sportclub (volleybal, tennis, judo, dansschool, padel, voetbal)

**Kleurpalet**

Gedomineerd door clubkleuren — stel `--brand-primary` en `--brand-accent` in op de officiële clubkleuren. Typisch: primair=hoofdkleur, accent=contrastkleur. Witte achtergrond (`--brand-bg: #ffffff` of `#f8f8f8`) met donkere tekst (`--brand-fg`).

**Layout**

- Leden-fotogalerij en uitslagen/rangschikking zijn eerste-klasse content.
- Klasserooster als tabel — responsive: sticky eerste kolom, horizontaal scrollbaar op mobiel.
- Team-fotogrids: 3–4 kolommen desktop, 2 kolommen mobiel, 1 kolom op `--bp-sm`.

---

## Tone of voice in Dutch

### Register

**Standaard: "jij"** — informeel, motiverend, direct. Dit is de norm voor 90% van de sector.

Uitzonderingen:
- Yoga/meditatie met overwegend 40+-publiek: mix van "je" (tekst) en "u" (persoonlijke correspondentie). Nooit agressief formeel.
- Klassieke sportclubs met traditionele werking (atletiekclub, turnvereniging): "je/jij" veilig, "u" als de clubcommunicatie dat al gebruikt.
- Medische fitness of revalidatietraining: "u" is veiliger om vertrouwen te wekken.

### Ritme en stijl

Korte zinnen. Imperatief. Actief. Geen passieve constructies.

**Energiek subgenre — werkt:**
- "Train harder. Word sterker. Begin vandaag."
- "Jij bepaalt het tempo. Wij zorgen voor de rest."
- "Geen excuses. Wel resultaten."
- "Transformeer je lichaam in 12 weken — met een coach die er elke stap bij is."
- "Voel het verschil na je eerste les."

**Energiek subgenre — vermijden:**
- "Wij zijn een toonaangevende aanbieder van fitness-oplossingen." (corporate)
- "Onze state-of-the-art faciliteiten bieden u…" (formeel + cliché)
- "WORD NU LID!!!" (all-caps met drie uitroeptekens — amateur)
- Engelse slogans op een Nederlandstalige site zonder reden

**Yoga/meditatief subgenre — werkt:**
- "Kom tot rust in jezelf."
- "Vind je adem. Vind je evenwicht."
- "Elke les is een nieuw begin — ook als je vandaag voor het eerst op de mat staat."
- "Yoga is geen prestatie. Het is aanwezig zijn."
- "Neem de tijd voor jezelf. Je verdient het."

**Yoga/meditatief — vermijden:**
- "Boost your flexibility with our premium yoga sessions!" (Engels + pushy)
- "Schrijf je nu in voor onze exclusieve wellness-journey!" (marketingklatsch)
- Zinnen van meer dan 25 woorden in de hero

**Sportclub — werkt:**
- "Word lid van de familie."
- "Speel mee. Groei mee."
- "Van beginner tot kampioen — er is ruimte voor iedereen."
- "[Clubnaam] — al [X] jaar het kloppend hart van [gemeente]."

### Sleutelwoorden per subgenre

| Energiek | Yoga/meditatief | Sportclub |
|---|---|---|
| training, les, coach, programma | les, workshop, retraite, sessie | ploeg, trainer, wedstrijd, seizoen |
| abonnement, intake, proefles | proefles, aanbod, rooster | lidmaatschap, aansluiting |
| resultaten, progressie, transformatie | rust, adem, aanwezig zijn, balans | familie, gemeenschap, sportiviteit |
| HIIT, CrossFit, krachttraining | yin, vinyasa, hatha, meditatie | toernooi, kampioenschap, klasse |
| before/after, gewicht, spiermassa | innerlijke groei, bewustzijn | verdedigen, aanvallen, samenspelen |

---

## Page structure patterns

### Gym / Fitness center (5–7 pagina's)

1. **Home** — hero met sfeer, kernvoordelen (3–4 bullets), testimonial-strip, CTA naar proefles of prijzen
2. **Lessen / Aanbod** — overzicht lestypes met beschrijving, niveau-aanduiding, en lesrooster-grid
3. **Lesrooster / Planning** — weekplanning als tabel (dag × tijdstip × les × coach). Responsief tabelformaat verplicht. Integratie via TeamUp, MindBody, Bsport — embed of diepe link.
4. **Lidmaatschap / Prijzen** — altijd zichtbaar. Vergelijkingstabel (formule A vs B vs C) met duidelijke verschillen. Geen verstopte prijzen.
5. **Coaches / Team** — bio per coach met certificaties, specialiteit, foto
6. **Over ons** — verhaal, waarden, locatie-sfeer
7. **Contact** — adres, openingsuren, routebeschrijving, parkeerinfo, intakeformulier of boekingslink

### CrossFit box (4–5 pagina's)

1. **Home** — energetische hero, "Wat is CrossFit?"-introductie voor nieuwelingen, community-foto's
2. **WOD / Programma** — uitleg trainingsfilosofie, voorbeeldweek
3. **Lessen & Rooster** — beginner OnRamp/fundaments apart vermeld; rooster-grid
4. **Lidmaatschap** — prijzen duidelijk, proefles prominent
5. **Over / Team** — coaches met CrossFit-Level certificatie (L1, L2, L3) zichtbaar

### Yoga / Pilates studio (4–5 pagina's)

1. **Home** — rustgevende hero, sfeer, "Wat mag je verwachten?", proefles-CTA
2. **Lessen & Rooster** — lestype (hatha, yin, vinyasa, Pilates), niveau, tijdsduur, roostergrid
3. **Tarieven** — losse les, lessenkaart (10-beurtenkaart), maand-/jaarabonnement. Altijd zichtbaar.
4. **Leraren / Team** — foto, bio, opleiding (Yoga Alliance RYT-200/500, BASI Pilates)
5. **Over / Contact** — studiosfeer, locatie, parkeermogelijkheden

### Personal trainer (3–4 pagina's)

1. **Home** — resultaatgerichte hero ("transformeer in 12 weken"), PT-foto, 3 kernvoordelen
2. **Aanpak / Programma's** — werkwijze, intake, trajectduur, wat inbegrepen is
3. **Tarieven** — pakket per sessie, traject van 8/12 weken, optie online coaching
4. **Over / Contact** — bio, certificaties (NASM, ISSA, CrossFit-L1), referenties

### Sportclub (volleybal, tennis, padel, judo…) (5–6 pagina's)

1. **Home** — clubidentiteit, recente resultaten of nieuws, aanmeldings-CTA
2. **Activiteiten / Trainingen** — trainingsschema per leeftijdsgroep/niveau
3. **Aansluiting / Lidmaatschap** — leeftijdscategorieën, prijzen, aansluiting via federatie (VolleyVlaanderen, Tennis Vlaanderen, Judo Vlaanderen)
4. **Team / Bestuur** — trainers + bestuursleden
5. **Nieuws / Resultaten** — wedstrijdverslagen, uitslagen, foto's
6. **Contact** — sporthal-adres, contactpersoon per afdeling

> **Patroon-waarschuwing**: lesrooster-grids zijn bijna universeel in deze sector. Implementeer altijd als responsieve tabel met vaste eerste kolom (tijdslot) en horizontaal scrollbaar op mobiel (`overflow-x: auto` op de wrapper). Nooit als statisch screenshot of PDF-embed.

---

## Section patterns

### Home-pagina

**Hero-sectie**

```
[Achtergrond: actiefilm (autoplay muted loop) of high-energy foto]
[Overlay: color-mix(in srgb, var(--brand-bg) 50%, transparent)]

H1: [Korte, krachtige slogan] — --text-4xl of --text-5xl, --brand-fg
Subkop: [Één zin die de propositie verduidelijkt] — --text-lg of --text-xl
CTA primair: [Boek je proefles / Doe een gratis intake] — --brand-accent achtergrond
CTA secundair (optioneel): [Bekijk ons aanbod] — ghost-knop
```

Voor yoga/meditatief: statische foto met rustige fade-in. Geen video. Geen overlay zwaarder dan 30%.

**Social proof strip** (direct onder hero)

Drie tot vier metrics in een rij: aantal leden, jaar opgericht, aantal klassen per week, Google-rating. Grote cijfers in `--text-3xl` of `--text-4xl`, label in `--text-sm`.

```
[1.200+ leden]  [12 jaar ervaring]  [30 klassen/week]  [4,9 ★ op Google]
```

**Lessen-preview sectie**

Drie tot vier kaarten (lestype, niveau-badge, duur, CTA "Meer info"). Kaartgrid: 3 kolommen desktop, 2 op `--bp-md`, 1 op `--bp-sm`. Sectie-gap `--space-6` tot `--space-8`.

**Testimonials sectie**

Minimaal drie getuigenissen met: naam, foto (optioneel), lid-duration ("training sinds 2021"), max. drie zinnen. Geen carrousel zonder pauze-knop. Sticky-quote-aanhalingstekens groot in `--text-3xl` en `--brand-accent`.

**CTA-sectie** (bottom-of-page)

Volle-breedte banner (`--brand-primary` achtergrond, `--brand-fg` tekst) met één grote CTA. Padding `--space-16` verticaal.

---

### Lessen / Rooster-pagina

- Intro: één alinea per lestype (naam, wat je leert, wie het voor is, niveau).
- Roostergrid: weekview tabel. Kolommen = dagen (ma–zo), rijen = tijdsloten per 30 of 60 min. Cel-inhoud: lesnaam + coach. Kleurcodering per lestype (max. 5 kleuren, altijd ook label — niet alleen kleur). Mobiel: scroll horizontaal, of dagkiezer als tabs.
- Booking-integratie: diepe link naar TeamUp/MindBody/Bsport of embed. Geen PDF-rooster.
- Niveau-badges: "Beginner", "Gevorderd", "Alle niveaus" — visueel duidelijk.

---

### Lidmaatschap / Prijzen-pagina

- Vergelijkingstabel: 2–3 formules (bijv. "Basis / Flexi / All-in"). Rijen = features, kolommen = formule. Check-marks en kruisen. Aanbevolen formule visueel benadrukt (border `--brand-accent`, badge "Populairste keuze").
- Prijs prominent: `--text-3xl`, duidelijk per maand. Geen "*prijs excl. inschrijfgeld" verborgen.
- Proefles / gratis intake altijd aangeboden — eigen sectie of sticky CTA.
- FAQ-sectie hieronder: veelgestelde vragen over opzegtermijnen, domiciliëring, inschrijfgeld.

---

### Coaches / Team-pagina

- Kaartgrid: foto (vierkant of portretformaat), naam, titel/specialiteit, top-2 certificaties, korte bio (max. 60 woorden). Desktop 3–4 kolommen, mobiel 1–2.
- Certificaties als badges of tekst — niet als logo's van certificerende instanties tenzij ze herkend worden (CrossFit HQ-logo, Yoga Alliance-logo).
- Optioneel: persoonlijke "filosofie" quote in italics.

---

### Contact-pagina

- Google Maps embed (of alternatieven voor privacy: OpenStreetMap, statische kaartafbeelding met link).
- Openingsuren: duidelijke tabel of gestructureerde lijst. Inclusief vakantie-uren of sluitingsdagen.
- Telefoon + e-mail als klikbare links (`tel:` en `mailto:`).
- Intakeformulier (naam, e-mail, telefoon, interesse, vraag) — max. 5 velden.
- Parkeer- en openbaar vervoer-info: praktisch voor bezoekers die de locatie niet kennen.

---

## CTA conventions

### Primaire CTA's per subgenre

| Subgenre | Primaire CTA | Secundaire CTA |
|---|---|---|
| Gym / Fitness | "Probeer gratis" / "Boek je proefles" | "Bekijk onze formules" |
| CrossFit box | "Doe een gratis intro-les" / "Start jouw traject" | "Wat is CrossFit?" |
| Yoga / Pilates | "Boek je proefles" / "Ontdek onze lessen" | "Bekijk het rooster" |
| Personal trainer | "Doe een gratis intake" / "Start in 12 weken" | "Lees mijn aanpak" |
| Sportclub | "Word lid" / "Sluit je aan" | "Bekijk trainingen" |

**Regels:**

- Maximaal 1 primaire CTA per sectie. Twee knoppen van gelijk gewicht naast elkaar vermijden.
- CTA-tekst: werkwoord + object. "Inschrijven" is zwakker dan "Schrijf je gratis in".
- Gratis aanbod altijd vermelden: "gratis proefles", "gratis intake", "gratis eerste week" — dit is sectorstandaard en verhoogt conversie significant.
- Prijsverberging is een rode vlag voor bezoekers: "Contacteer ons voor tarieven" zonder enige prijsindicatie breekt vertrouwen.
- Knopstijl: `--brand-accent` achtergrond, `--brand-bg` of `--brand-fg` tekst (afhankelijk van contrast). Padding `--space-3` verticaal, `--space-6` horizontaal.
- Ghost-knop voor secundaire CTA: border `1px solid var(--brand-accent)`, transparante achtergrond.

**Booking-software integratie:**

Wanneer de klant TeamUp, MindBody of Bsport gebruikt: diepe link naar boekingspagina van het specifieke lestype — nooit naar de homepage van de software. Embed indien technisch mogelijk (iframe). Fallback: prominente knop + tel/mail als backup.

---

## Trust signals

### Coaches en certificaties

Certificaties geven vertrouwen — ze moeten zichtbaar zijn, niet verstopt in een footer.

Erkende certificaties voor Vlaanderen/België:

- **CrossFit**: CrossFit Level 1 (L1), Level 2 (L2), Level 3 (L3) — toon als tekst-badge
- **PT / Personal training**: NASM-CPT, ISSA, ACE, ErgoFit (België), KINE (kinesitherapeut)
- **Yoga**: Yoga Alliance RYT-200, RYT-500, E-RYT; BWY; FROY (Federatie Ruimte voor Yoga)
- **Pilates**: BASI Pilates, Stott Pilates, Peak Pilates
- **Sport**: erkende federatietrainer (VolleyVlaanderen, Tennis Vlaanderen, Judo Vlaanderen) — vermeld het brevetniveau

### Member testimonials

- Naam + (optioneel) foto + "training/lid sinds [jaar]" — duur geeft geloofwaardigheid
- Max. drie zinnen — kracht zit in de beknoptheid
- Diversiteit in type resultaat: energie, gewicht, community, rehabilitatie na blessure
- GDPR: expliciete toestemming voor foto + naam. Vermeld dit discreet op de site ("foto's en getuigenissen geplaatst met toestemming van onze leden").

### Before/after transformatiefoto's

Krachtig signaal voor PT en gym — maar vraagt voorzichtigheid:

- Expliciete schriftelijke toestemming vereist. Vermeld op de pagina: "Gedeeld met toestemming."
- Identieke belichting en achtergrond voor beide foto's — dramatisch licht-contrast tussen "voor" (donker) en "na" (helder) is een manipulatiecliché dat kritische bezoekers afschrikt.
- Tijdsperiode vermelden: "Resultaat na 12 weken begeleiding."
- Realistisch: geen geretoucheerde foto's of extreme filters.

### Cijfers en community

- Ledenaantal of "community"-grootte: "1.200+ leden in Gent en omgeving"
- Jaar van oprichting: "Actief since 2009" — continuïteit is een vertrouwenssignaal
- Klassen per week: "30+ klassen per week"
- Google-rating: toon alleen als ≥ 4,2 met minimaal 20 reviews. Format: "4,8 ★ (127 reviews op Google)"

### Sportclub-specifiek

- Federatie-logo (VolleyVlaanderen, Tennis Vlaanderen, Judo Vlaanderen, enz.) — officieel aangesloten
- Provinciale of nationale erkenning vermelden
- Seizoensresultaten: "Kampioen Provincie Antwerpen 2024–2025"
- Foto's van wedstrijden, trofeeën, teamfoto's

---

## Imagery guidance

### Wat werkt

**Energiek subgenre (gym/CrossFit/PT)**

- Actie-opnames van echte leden mid-training: kniebuiging, burpee, deadlift, box jump — bewegingsonscherpte is authentiek
- De trainingsruimte zonder mensen: lege gym-vloer, rekken, rubbermat-detail — toont kwaliteit van de infrastructuur
- Coaches die coachen: corrigeren van houding, aanmoedigen — niet poseren
- Groepslessen in volle gang: communitygevoel is sleutelargument
- Zwart-wit of hoog-contrast behandeling past bij donkere brand-achtergronden

**Yoga/Pilates subgenre**

- Studio-ruimte: zachte raamlichten, houten vloer, plantjes — sfeer boven prestatie
- Leraar in asana-demonstratie: rustig, gefocust, geen performance-glimlach
- Detail-shots: handen in mudra, voeten op mat, oogst van licht door een raam
- Groep in savasana of meditatiehouding
- Pastelbelichting, morning light

**Sportclub**

- Teamfoto officieel (begin seizoen) + informele actiefoto's wedstrijden
- Jeugdspelers in actie — ouders zoeken dit bewust
- Trofeeën of kampioenspodium (met erkenning wie er staat)
- Sporthal/veld/court: de thuisbasis van de club

### Technische vereisten

- Breedte: min. 1.600px voor hero's, min. 800px voor kaarten
- Formaat: WebP met JPEG-fallback. Geen PNG voor foto's.
- Alt-tekst: beschrijvend ("Coach Lena corrigeert de plank-houding van een lid tijdens een groepsles")
- Gezichten altijd scherp — onscherpe gezichten voelen nonchalant aan
- GDPR: schriftelijke toestemming voor herkenbare personen. Bewaar toestemmingsformulieren.

### Vermijden

- Stock-foto's van onrealistisch gespierde of gefilterde modellen — ongeloofwaardig en vervreemdend
- AI-gegenereerde sportfoto's — hallucinatorische ledematen zijn onmiddellijk herkenbaar
- Glimmende chromen fitnesstoestellen zonder mensen erin — catalogus-vibe, niet community-vibe
- Fitnesshorloge-/supplement-close-ups als hero — product-focus, geen sport-focus
- Dezelfde stockfoto's die op tien andere Belgische gyms staan (controleer: Getty Images "gym" zoekresultaten zijn gevaarlijk generiek)
- Foto's waarbij "voor" donker en ongelukkig en "na" goudkleurig en stralend is — dit is een emotionele manipulatiecliché

---

## Reference URLs

### 1. Gym / Fitness chain — `https://www.jims.be`

JIMS Fitness, Belgisch fitness-ketens (meerdere vestigingen in Brussel, Antwerpen, Luik). Nederlandstalig aanbod via `jims.be/nl`. **Wat werkt**: heldere propositie-structuur op de homepage ("Kies voor meer dan fitness"), testimonials met naam en type motivatie (coaching, community, groepslessen), aanbod gestructureerd per "sportprofiel" zodat bezoekers zichzelf kunnen plaatsen. Foto-aanpak toont echte leden in actie. **Zwakheden**: homepage vrij lang, weinig prijs-transparantie in de eerste scroll. **Bruikbaar als referentie voor**: homepage-structuur, testimonial-aanpak, profielgebaseerde content-organisatie.

**Geverifieerd**: site laadt correct, Nederlandstalige content aanwezig, structuur zoals beschreven.

### 2. Yoga studio — `https://www.yogacentrumgenk.be`

Yoga Centrum Genk, Genk (Limburg). Kleine, authentieke yogastudio. **Wat werkt**: directe, persoonlijke toon (Etienne Moors schrijft zelf de copy), aanbod helder opgesomd (yoga, individuele lessen, opstellingen, energiebehandelingen), agenda zichtbaar op de homepage. Rustige lay-out, geen agressieve CTA's — past bij de meditieve identiteit. Contactinfo direct beschikbaar (telefoon + e-mail). **Zwakheden**: visueel verouderd (thema ontbreekt moderne typografie), geen online boekingssysteem. **Bruikbaar als referentie voor**: content-prioritering (rooster + contact prominent), authentieke persoonlijke stem, aanbodstructuur voor kleine studio's.

**Geverifieerd**: site laadt correct via `yogacentrumgenk.be` (redirect vanaf `yogacentrum.be`).

### 3. CrossFit box — `https://www.crossfitbrussels.com`

CrossFit Brussels, Brussels' eigen CrossFit-box (engelstalig, maar Belgisch context). **Wat werkt**: duidelijke positionering als pionier ("Brussels' Pioneering CrossFit Box"), methodologische uitleg voor nieuwkomers ("Constantly Varied Functional Movements"), communitygerichte CTA ("Join our community"), actie-achtergrond hero met coach-instructie foto's. Intro-les (trial) prominent aangeboden. **Zwakheden**: Engelse copy — voor Vlaamse klanten vertaal je dit volledig naar het Nederlands. **Bruikbaar als referentie voor**: CrossFit-specifieke propositiestructuur, trial-les als primaire CTA, methodologie-uitleg voor beginners.

**Geverifieerd**: site laadt correct, structuur en foto-aanpak zoals beschreven.

---

## Negative examples

Patronen die er goedkoop, manipulatief of generiek uitzien in fitness en sport. Vermijd strikt:

1. **"TRANSFORM YOUR LIFE!" all-caps hero** — schreeuwende all-caps headlines, drie uitroeptekens, neon op neon. Signaleert gebrek aan zelfvertrouwen. Vervang door een krachtige, rustige slogan: "Sterker. Elke dag." of "Jouw training. Jouw tempo."

2. **Before/after met dramatisch licht-verschil** — "voor"-foto donker, vermoeid, slechte houding; "na"-foto goudkleurig licht, perfecte pose, stralende glimlach. Dit is een welbekende manipulatiecliché. Bezoekers herkennen het en verliezen vertrouwen. Gebruik identieke belichting en neutrale achtergronden.

3. **Pop-up op elke pagina na 5 seconden** — "Schrijf je in voor onze nieuwsbrief en krijg 7 geheime tips voor gewichtsverlies!" Frustreert bezoekers die het aanbod nog niet kennen. Maximaal één pop-up per bezoek, enkel op pagina's waar de bezoeker al interesse toont (zoals de prijzenpagina).

4. **Times New Roman of Courier als standaard-lettertype voor een yogastudio** — browsers-default serif zonder typografische keuze. Signaleert dat de site niet ontworpen maar samengesteld is. Kies altijd een expliciet lettertype passend bij het subgenre.

5. **Prijzen volledig verborgen** — "Contacteer ons voor onze tarieven" zonder enige prijs-indicatie. In de fitnesssector is dit een dealbreaker: bezoekers willen weten of iets betaalbaar is vóór ze contact opnemen. Minimaal: toon een prijsrange of de goedkoopste formule.

6. **Rooster als ingebedde PDF of screenshot** — niet-toegankelijk, niet-leesbaar op mobiel, nooit actueel. Gebruik altijd een HTML-tabel of externe boekingssoftware-embed.

7. **Stock-foto's van onrealistisch gespierde modellen** — de grijnzende fitness-model met perfecte abs en geen zweetsuppel in zicht. Belgische bezoekers identificeren zich niet met dit beeld. Gebruik echte leden, echte ruimtes, echte coaches.

8. **Vier of vijf CTA-knoppen in de hero** — "Boek een les / Bekijk prijzen / Neem contact op / Volg ons / Download onze app". Keuzeverlamming. Één primaire CTA, optioneel één secundaire ghost-knop.

9. **AI-gegenereerde sporters** — hallucinatorische knieën, extra vingers op dumbells, onmogelijke rug-anatomie. Herkenbaar en fataal voor vertrouwen. Nooit gebruiken voor sport/fitness.

10. **"U" in een CrossFit-box of streetworkout-context** — formeel register in een omgeving die radicale informeel heid ademt. Breekt de culturele verwachting. Gebruik altijd "jij/je" tenzij er een expliciete reden is voor "u".
