---
industry: bakery-restaurant
language: nl-BE
applies_to: [bakery, bakkerij, restaurant, café, koffiehuis, food-artisan, traiteur, tearoom]
---

# Industrie-gids: Bakkerij · Restaurant · Café · Voedingsambacht

Doelpubliek van de gids: Claude Code bij het genereren van een website voor een lead in deze sector.
Taal van de gegenereerde site: `nl-BE` (Standaardnederlands, Vlaamse register).
Geografisch bereik: Vlaanderen en Brussel; primair Antwerpen en omgeving.

---

## Aesthetic conventions

### Typografie

Gebruik een warm, ambachtelijk lettertype-paar:

- **Headlines**: schreef-lettertype met humanistische snit — Lora, Playfair Display, Cormorant Garamond, of Libre Baskerville. Licentievrij via Google Fonts. Nooit condensed of slab-serif voor headlines (te druk); nooit een geometric sans (te technisch).
- **Body**: neutrale, leesbare sans-serif — Inter, DM Sans, Source Sans 3. Minimaal `--text-base` (1rem / 16px). Regellengte max. 70 tekens voor lopende tekst (stel `max-width: 65ch` in op paragraafcontainers).
- **Accent / display**: de headline-schreef mag ook voor grote display-quotes en cijferaccenten (bv. "Since 1987") worden ingezet in `--text-4xl` of `--text-5xl`.
- **Wat vermijden**: Google Fonts Pacifico, Lobster, Dancing Script (feel: 2010-cheesy). Geen neon-/techno-lettertypes. Geen twee schreefloos-lettertypen door elkaar.

### Kleurpalet

Aardse, warme kleuren domineren de sector. Richtpalet voor `--brand-*` tokens (per SYSTEM.md §9):

| Token | Richting | Voorbeeldwaarden |
|---|---|---|
| `--brand-primary` | Diepbruin, terracotta, donkerolijfgroen | `#3b1f0e`, `#7c3a2d`, `#3d4a2f` |
| `--brand-accent` | Warm goud, gebrand oranje, botergeel | `#c9973a`, `#e8a44a`, `#d4b483` |
| `--brand-bg` | Crème, gebroken wit, licht zandkleur | `#faf6f0`, `#f7f3ec`, `#fffef9` |
| `--brand-fg` | Donkere inkt, nooit puur zwart | `#1c1209`, `#2a1f14` |

Contrast altijd valideren per SYSTEM.md §5 (4.5:1 voor body, 3:1 voor grote tekst).

**Vermijden**: klinisch wit-op-grijs (`#ffffff` achtergrond + `#888` body-tekst), neon-accenten, koele blauw/groen tinten zonder warme neutralen als tegenwicht.

### Fotografie-stijl

- **Sfeerbeelden**: daglicht of warm kunstlicht. Nooit koel LED-blauwtint. Voorkeur: ochtendschemering in bakkerij, kaarslichtstemming in restaurant.
- **Actieshots** werken beter dan product-stills: handen die deeg kneden, een bakker die een brood insnijdt, een kok die een bord afwerkt, stoom boven een kop koffie.
- **Productshots**: houten oppervlakken, linnen doeken, keramiek, steengoed. Vogelvluchtperspectief (flat lay) voor brood en gebak. Schuin van boven (45°) voor borden en bekers.
- **Mensen**: echte gezichten van de eigenaar/bakker/kok zijn essentieel voor vertrouwen. Geen stock-glimlachmodellen.
- **Wat vermijden**: stockfoto's van generiek eten met te verzadigde kleuren, witte studio-achtergrond, plastiek glans op voedsel, AI-gegenereerd voedsel (vreemde texturen, foutieve anatomie bij broodkruim).

### Layout-patronen

- **Hero-sectie**: volledig beeldvullend (100vw × 90-100vh) met overlay-tekst linksonder of gecentreerd. Geen full-carousel als openingsscherm; één sterk beeld volstaat.
- **Raster**: maximaal 2-koloms voor productenlijst op desktop; 1-kolom op mobiel. Geen Pinterest-masonry-layout (te druk voor ambachtssector).
- **Witruimte**: ruim ademen. Section-gating verticaal `--space-16` tot `--space-24` (64–96px) per SYSTEM.md §1. Interne sectiepadding `--space-8` tot `--space-12` (32–48px).
- **Navigatie**: horizontale topbalk op desktop, hamburger op mobiel. Max. 5 items. Geen mega-menu.

---

## Tone of voice in Dutch

### Register

| Segment | Aanspreekvorm | Reden |
|---|---|---|
| Bakkerij | **u** | Ouder, trouw klantenbestand; familiale maar respectvolle toon |
| Restaurant (fine dining) | **u** | Gastvrijheid, waardigheid, Belgische eetcultuur |
| Restaurant (brasserie/bistro) | **u** of **je** — kies één, mix nooit | Bistro-sfeer is informeler maar de keuze moet consistent zijn |
| Café / koffiehuis | **je** | Jonger publiek, dagelijkse bezoeker, casual sfeer |

### Ritme en stijl

Korte, warme zinnen. Geen alinea's van meer dan 3 regels in hero- of intro-blokken. Voorkeur voor actieve werkwoordsvorm.

**Goed:**
> "Elke ochtend bakken we ons brood vers op de steen. Kom gerust binnen."

**Slecht:**
> "Wij zijn een bakkerij die gespecialiseerd is in de productie van ambachtelijk brood op dagelijkse basis."

### Sleutelwoorden die werken in deze sector

- **Bakkerij/banket**: *ambachtelijk*, *vers gebakken*, *op de steen*, *dagelijks*, *huisbereiding*, *op bestelling*, *seizoensgebonden*, *Belgisch*, *familie*
- **Restaurant**: *seizoensmenu*, *streekproducten*, *marktvers*, *gastronomisch*, *huisgemaakt*, *van bij ons*, *dagmenu*, *de chef kiest*
- **Café**: *versgemalen*, *specialty*, *lokale brander*, *huisgemaakte limonade*, *rustig tafelen*, *thuiskomen*

### Vermijden

- Engels filler in Nederlandstalige copy: "freshly baked", "homemade", "farm-to-table" — vertaal altijd.
- Corporate jargon: "wij streven naar kwaliteit", "klantgerichtheid staat centraal", "passie voor ons vak" als losse zin zonder bewijs.
- Generieke welkomstformule als eerste woord op de pagina: "Welkom op onze website!" — begin in medias res.
- Dubbele superlatieven: "het allerbeste", "absoluut vers" — laat het product zichzelf bewijzen.

---

## Page structure patterns

### Bakkerij (3–4 pagina's)

1. **Home** — sfeer, openingsuren, locatie, vers-vandaag-feature
2. **Assortiment / Producten** — brood, gebak, taarten op bestelling, seizoensproducten
3. **Over ons** — verhaal, familie, ambacht, leveranciers
4. **Contact** — adres, openingsuren, telefoon, Google Maps embed, eventueel bestelformulier

### Restaurant (4–5 pagina's)

1. **Home** — sfeer, daghighlight, reservatie-CTA
2. **Menu** — seizoensmenu, à la carte, weekmenu, wijnkaart (optioneel)
3. **Over ons** — chef, concept, herkomst ingrediënten
4. **Reservaties** — link of embed (TheFork, SevenRooms, eigen formulier)
5. **Contact** — adres, openingsuren, routebeschrijving, parkeerinfo

### Café / Koffiehuis (3–4 pagina's)

1. **Home** — sfeer, specialiteiten, openingsuren
2. **Kaart** — dranken, gebak, lunchmenu (indien van toepassing)
3. **Over ons** — concept, koffiebrandmerk, team (optioneel)
4. **Contact / Vind ons** — adres, uren, socials, map

---

## Section patterns

### Home-pagina

1. **Hero** — groot beeld (min. 90vh), naam zaak, tagline (max. 8 woorden), openingsuren zichtbaar zonder scrollen op desktop, primaire CTA-knop.
2. **Vers vandaag / Dagmenu-feature** — 1-3 uitgelichte producten of gerechten van de dag. Bakkerij: "Vandaag vers: desembrood, croissants, seizoenstaart." Restaurant: "Menu van de week" met korte beschrijving van 2–3 gangen.
3. **Verhaalanker** — 2–3 zinnen over wie u bent, foto van eigenaar/team, link naar "Over ons".
4. **Fotogalerie-teaser** — 3-koloms fotogrid (6 beelden op desktop, 2 op mobiel); geen lightbox op homepage, wel link naar volledig assortiment/fotopagina.
5. **Reservatie of Bestel-CTA** (restaurant/bakkerij op bestelling) — gecentreerde balk met CTA-knop, eventueel telefoonnummer.
6. **Locatie-blok** — embedded Google Maps, adres, openingsuren in tabel, optioneel parkeerinfo.

### Menu / Assortiment-pagina

- Gegroepeerde lijst per categorie (bv. "Desembrood", "Croissants & viennoiserie", "Taarten"). Gebruik `<section>` per categorie met `<h2>` categorie-naam.
- Per item: naam + korte beschrijving (max. 1 regel) + prijs of "vraag onze prijslijst".
- Foto's: optioneel bij items, maar consistent — ofwel alle items met foto, ofwel geen.
- Allegeninfo: indien relevant (bakkerij), apart blok onderaan of link naar PDF.
- Restaurant: duidelijk onderscheid lunch/diner, vermeld "dagelijks wisselend" als menu seizoenaal is.

### Over ons-pagina

- **Openerblok**: grote portretfoto van eigenaar(s) + citaat in hun eigen woorden (gecursiveerd, `--text-xl`).
- **Verhaaltekst**: max. 300 woorden in alinea's van max. 3 regels. Tijdslijn optioneel voor zaken met lange geschiedenis ("Sinds 1974...").
- **Herkomst & ambacht**: waar komen de grondstoffen vandaan? Welke technieken? Lokale leveranciers benoemen verhoogt geloofwaardigheid.
- **Team-blok** (optioneel voor kleine zaken): 2–4 portretten met naam en functie.

### Contact-pagina

- Adres + postcode + gemeente (vetgedrukt, `--text-lg`).
- Telefoon als klikbare `tel:`-link.
- Openingsuren in gestructureerde tabel (niet als vrije tekst).
- Google Maps embed (volledig breedte of 2-koloms naast uren-blok).
- Sociale media als icoontje-rij (max. 4 platforms).
- Eventueel: bestelformulier voor taarten op bestelling (naam, datum, type, opmerking, submit).

---

## CTA conventions

### Bakkerij

| Situatie | CTA-tekst |
|---|---|
| Standaard bezoek | "Kom langs" / "Vind ons" |
| Taart op bestelling | "Bestel uw taart" / "Vraag onze prijslijst" |
| WhatsApp-bestelling | "Bestel via WhatsApp" (link: `https://wa.me/32XXXXXXXXX`) |
| Nieuwsbrief | "Ontvang onze weekaanbiedingen" |

### Restaurant

| Situatie | CTA-tekst |
|---|---|
| Primair | "Reserveer een tafel" (link naar TheFork, SevenRooms of eigen formulier) |
| Menu bekijken | "Bekijk ons menu" |
| Dagmenu | "Menu van de week" |

### Café

| Situatie | CTA-tekst |
|---|---|
| Primair | "Kom binnen" / "Vind ons" |
| Socials | "Volg ons op Instagram" |
| Passief | Geen agressieve pop-up CTA's — café-sfeer is uitnodigend, niet pushend |

**Algemene CTA-regels**:
- Maximaal 1 primaire CTA per sectie. Nooit twee knoppen van gelijk gewicht naast elkaar.
- CTA-knoptekst: werkwoord + object. "Reserveren" is zwakker dan "Reserveer een tafel".
- Knopstijl per SYSTEM.md §9 brand tokens: `--brand-primary` als achtergrond, `--brand-bg` als tekst, of omgekeerd als ghost-knop.

---

## Trust signals

### Historiek en eigenaarschap

- **Jaar van oprichting** prominent op home of over-ons: "Bakkerij Van Dael — ambacht sinds 1987." Gebruik `--text-2xl` of `--text-3xl` voor het jaar, schreefloos of cursief.
- **Familiefoto** of portret van de eigenaar — echte foto, geen stock. Plaatsen op home-hero of over-ons-opener.

### Labels en certificaten

Vermeld altijd als aanwezig (als tekst + logo, geen aanname):

- **Dagvers Belgisch Brood** (Bakkers Vlaanderen-label)
- **Slow Food Ark of Taste** (voor ambachtelijke producten)
- **Bio** / **Demeter** / **Fairtrade** (voor koffie en ingrediënten)
- **Streekproduct Vlaanderen**
- **Bib Gourmand** of **Michelin-ster** (restaurant)
- **TheFork Awards**, **OAD** of andere restaurantonderscheidingen

### Recensies

- Google Reviews widget of handmatige citaten (max. 3, met naam en datum).
- Tripadvisor-badge indien relevant (restaurants en cafés).
- Voor bakkerijen: citaten van vaste klanten volstaan ("Ons gezin koopt hier al 20 jaar ons brood." — Marie uit Gent).

### Structuurdata

Per SYSTEM.md §8: genereer altijd `LocalBusiness` JSON-LD met minimaal `@type`, `name`, `address`, `telephone`, `url`, `openingHours`. Voor restaurants: gebruik `@type: ["Restaurant", "LocalBusiness"]` en voeg `servesCuisine` en `priceRange` toe.

---

## Imagery guidance

### Wat werkt

- **Actiebeelden** (beste conversie): handen die deeg kneden, insnijden van een desembrood, een kok die een bord garnisseert, koffiebar met barista die melk schuimt.
- **Ochtendlicht in bakkerij**: warme oranje tinten, broden op rek of houten schop, lichtstralen door het raam.
- **Tafelsetup van boven** (flat lay): lepel + kop + broodkruimels op linnen onderlegger.
- **Portretfoto's van eigenaar/team**: natuurlijk licht, niet geposeerd, in de eigen ruimte.
- **Seizoensbeelden**: aardbeien-taart in mei, pompoenbisque in oktober — koppel beelden aan het seizoen van de lead.

### Bronnen bij ontbrekende eigen foto's

1. **Lead's eigen foto's**: altijd eerste keuze. Vraag om 5–10 JPEGs bij intake.
2. **Unsplash** (unsplash.com): zoek op "bakery belgium", "artisan bread", "coffee antwerp", "restaurant plating". Download met licentie-attributie in de broncode (HTML-comment).
3. **Pexels**: zelfde aanpak als Unsplash.
4. **Geen AI-gegenereerd voedsel**: broodkruim en glanzend gebak zijn de bekendste valkuilen van generatieve modellen — het resultaat ziet er onecht uit en wekt wantrouwen.

### Technische vereisten

Per SYSTEM.md §6 (performance): LCP-beeld in `<img>` zonder `loading="lazy"`, alle andere beelden met `loading="lazy"`. Formaat: WebP of AVIF. Altijd `width` en `height` attributen om CLS te voorkomen. Beschrijvende `alt`-tekst per SYSTEM.md §5.

---

## Reference URLs

Drie geverifieerde Belgische/Antwerpse sites, gecontroleerd bereikbaar op 2026-05-07:

### 1. Restaurant — `https://www.hertog-jan.com`

Hertog Jan at Botanic Antwerp (chef Gert De Mangeleer). Strakke, minimalistische aanpak: grote typografie, rustige lay-out, "u"-register door de hele site, reservatielink rechtstreeks naar SevenRooms. Hero-sectie met één groot beeld, geen carousel. Duidelijke scheiding tussen culinaire beleving ("totaalbeleving") en praktische info (openingsperiodes). Goede toepassing van vertrouwde structuur: Welkom → Menu → Reserveer.

**Wat je er uithaalt**: hoe een premium restaurant zijn copy warm maar formeel houdt; hoe reservatielink bovenaan navigatie staat zonder opdringerig te zijn.

### 2. Café / Specialty coffee — `https://www.caffenation.be`

Caffenation Specialty Coffee Roasters, Antwerpen. Internationaler merk (deels Engelstalig), maar Antwerps van origine. Shopify-gebaseerd, clean wit-met-zwart-contrast, uitstekende product- en blogstructuur. Toont hoe een specialty-koffiebrand haar herkomstverhalen (Colombian Coffee Month, blendfilosofie) als vertrouwenssignaal inzet. Handig voorbeeld van hoe een koffiehuis ook e-commerce integreert.

**Wat je er uithaalt**: productgeoriënteerde navigatie voor een koffiemerk; blogposts als expertise-bewijs; clean sans-serif typografie in koffiesector.

### 3. Bakkerij — `https://www.bakkerijtom.be`

Bakkerij Tom & Sandra, Wingene (West-Vlaanderen). Traditionele Vlaamse ambachtsbakkerij met een functionele maar verouderde site (PHP, geen responsive design). Nuttig als **negatief referentiepunt** voor layout en techniek, maar sterk als **positief** voorbeeld van content: uitgebreide assortimentspagina met subcategorieën (brood, pistolets, koeken, taarten, chocolade), duidelijke openingsuren, en een "geschiedenis"-pagina. Toont welke pagina's en content een bakkerij werkelijk nodig heeft.

**Wat je er uithaalt**: volledige assortiment-navigatiestructuur voor een Vlaamse bakkerij; openingsuren als primaire info; contactpagina met telefoon en GSM naast elkaar.

---

## Negative examples

Patronen die er goedkoop, template-matig of onprofessioneel uitzien in deze sector. Vermijd ze strikt:

1. **"Welcome to our bakery!" als eerste woord** — Engelse openingszin op een Nederlandstalige site. Onmiddellijk vertrouwensbreuk. Vervang door naam van de zaak + prikkelende zin in het Nederlands.

2. **Rood-wit geblokte tafelkleed-stockfoto als hero** — clichérestaurantfoto met plastic rieten mandjes en identiek gebak. Herkend als nep door elke bezoeker.

3. **Bootstrap-thema met Lorem Ipsum** — placeholder-tekst in productblokken, generieke "Our Team"-sectie met grijze avatar-iconen, nep-kaart-embed. Geeft aan dat de site nooit is afgewerkt.

4. **Emoji-navigatie of emoji-menu-iconen** — 🍞 🥐 ☕ 🍰 als navigatie-decoratie. Kinderspeelgoed-uitstraling, niet geschikt voor een ambachtsbedrijf.

5. **Full-width autoplay-carrousel van 6 overbelichte foto's** — vaak met zwaar JPEG-artifacten, inconsistente formaten, en animatie die tekst onleesbaar maakt. CLS-probleem (SYSTEM.md §6). Gebruik één sterk beeld.

6. **Pop-up nieuwsbrief bij paginalanding** — in de horecasector bijzonder irritant: bezoekers zijn op zoek naar openingsuren of het menu, niet naar een nieuwsbrief. Vermijd elke modal bij load.

7. **Prijzen verborgen achter "bel ons voor meer info"** — voor bakkerij en café verwachten bezoekers transparantie. Geen prijzen = twijfel. Geef ten minste een prijsrange of "vraag onze prijslijst" met bestelknop.

8. **Social media feed-embed als enige inhoud op de homepagina** — een Instagram-widget als vervanging van echte site-inhoud. Traag, afhankelijk van derde partij, valt weg als account verwijderd wordt.

9. **Google Maps als enige contactinfo** — geen adres in leesbare tekst, geen telefoonnummer als klikbare link, geen openingsuren buiten de Google-widget. Ontoegankelijk en niet indexeerbaar.

10. **Generieke "Passie voor kwaliteit"-kop zonder bewijs** — elke bakkerij in België claimt dit. Vervang door een specifiek feit: "Ons desem groeit al 12 jaar.", "We betrekken onze bloem van Moulin de Hollange."
