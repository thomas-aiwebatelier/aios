---
name: industry-style-guides
description: Use when generating, editing, or classifying any AI Web Atelier client website. Resolves a lead's industry to one of 10 canonical industry guides; provides the keyword + Google Maps `types` fallback table for the classifier; defines the unmatched / low-confidence handling protocol.
---

# Industry Style Guides

Per-industry design briefs that complement the cross-cutting `atelier-design-system` skill. Where SYSTEM.md / tokens.css / generation-prompt.md govern *how every site must behave*, the industry guides govern *what a well-designed site for this kind of business looks and reads like* — aesthetic conventions, Dutch tone of voice, page structure, CTAs, trust signals, imagery, and negative examples specific to the vertical.

This skill is invoked at two distinct points in the pipeline:

1. **Discovery / classification (Pipeline 1, spec §11.1)**: when a new lead is discovered via Google Maps, Claude Code returns an `industry_key` plus a confidence score. The classifier MUST use the resolution rules below — it cannot return a key that does not match a filename in this directory.
2. **Generation / edit (Pipelines 3 + 5, spec §11.3 + §11.5)**: when generating or editing a site for a lead, the generation pipeline loads the matching `<industry_key>.md` alongside the design system. The guide is read verbatim by Claude Code; treat its contents as constraints, not suggestions.

## The 10 canonical industry filenames

These are the only valid values for the `leads.industry_key` column (per spec §7). Adding a new industry requires (a) adding a new `<key>.md` guide drafted to the same 9-section structure, (b) adding entries below in the keyword and Google Maps tables, (c) updating the `applies_to` arrays as needed, and (d) bumping `industry-style-guides` version (post-spine).

| `industry_key` | Covers | File |
|---|---|---|
| `bakery-restaurant` | Bakeries, restaurants, cafés, traiteurs, tearooms, food artisans | [bakery-restaurant.md](./bakery-restaurant.md) |
| `trades-construction` | Plumbers, electricians, roofers, painters, masons, HVAC, general contractors | [trades-construction.md](./trades-construction.md) |
| `professional-services` | Accountants, advocaten, notarissen, financial advisors, fiscalists, consultants | [professional-services.md](./professional-services.md) |
| `health-wellness` | Tandartsen, kinesitherapeuten, psychologen, osteopaths, chiropractors, group practices | [health-wellness.md](./health-wellness.md) |
| `beauty-personal-care` | Kappers, barbershops, beauty/nail/lash/brow studios, day spas, esthetic clinics | [beauty-personal-care.md](./beauty-personal-care.md) |
| `retail-boutique` | Clothing boutiques, conceptstores, gift shops, bookshops, design retail | [retail-boutique.md](./retail-boutique.md) |
| `fitness-sport` | Gyms, CrossFit, yoga/Pilates, personal trainers, sport clubs, dance schools, martial arts | [fitness-sport.md](./fitness-sport.md) |
| `automotive` | Garages, car dealers, tire shops, detailers, EV-installers, classic-car specialists | [automotive.md](./automotive.md) |
| `real-estate-property` | Vastgoedmakelaars, syndic-kantoren, property managers, vastgoedontwikkelaars | [real-estate-property.md](./real-estate-property.md) |
| `creative-services` | Photographers, designers, illustrators, videographers, copywriters, brand studios | [creative-services.md](./creative-services.md) |

## Resolution algorithm

Given a lead with `(business_name, google_maps_types[], existing_website_url?)`, the classifier resolves an `industry_key` as follows:

1. **Direct match by Google Maps `types`** — see § Google Maps `types` table below. If any of the lead's `types` maps to a canonical key, return that key with `confidence = 0.95`.
2. **Keyword match against `business_name`** (case-folded, accents stripped) — see § Keyword table. If a keyword is found, return the corresponding key with `confidence = 0.75`.
3. **Free-form classification** — Claude Code reads `(name, types, scraped_homepage_copy_if_any)` and returns one of the 10 canonical keys plus a confidence in `[0, 1]`. Discard any returned key not in the canonical list.
4. **Default** — if none of 1–3 produce a canonical key, set `industry_key = 'professional-services'` with `confidence = 0.0` and surface the lead with a **"needs manual industry"** badge in the Approval Queue (spec §10.3 + §6.1.3). Thomas overrides before approving.

The classifier MUST NOT invent a new `industry_key`. The DB column has no CHECK constraint enforcing this (Drizzle SQLite limitation), so this is a code-level invariant — any code path that writes `industry_key` must validate against this canonical list.

A confidence below `0.60` (per spec §10.2 / §10.3 implementation in Tasks 3.7 + 3.8) renders a **"needs review"** badge in the Discovery + Approval queues. Thomas may accept the suggestion as-is or override the dropdown.

## Google Maps `types` table

Google Places API returns a list of `types` for each place. Use this exact mapping; one type sufficient to classify:

| Google Maps `type` | → `industry_key` |
|---|---|
| `bakery` | `bakery-restaurant` |
| `restaurant` | `bakery-restaurant` |
| `cafe` | `bakery-restaurant` |
| `coffee_shop` | `bakery-restaurant` |
| `meal_takeaway` | `bakery-restaurant` |
| `food` (generic — only if no other type matches) | `bakery-restaurant` |
| `plumber` | `trades-construction` |
| `electrician` | `trades-construction` |
| `roofing_contractor` | `trades-construction` |
| `painter` | `trades-construction` |
| `general_contractor` | `trades-construction` |
| `locksmith` | `trades-construction` |
| `accounting` | `professional-services` |
| `lawyer` | `professional-services` |
| `legal_services` | `professional-services` |
| `notary_public` | `professional-services` |
| `insurance_agency` | `professional-services` |
| `financial_consultant` | `professional-services` |
| `dentist` | `health-wellness` |
| `physiotherapist` | `health-wellness` |
| `doctor` | `health-wellness` |
| `medical_clinic` | `health-wellness` |
| `health` (generic) | `health-wellness` |
| `psychologist` | `health-wellness` |
| `chiropractor` | `health-wellness` |
| `hair_care` | `beauty-personal-care` |
| `beauty_salon` | `beauty-personal-care` |
| `spa` | `beauty-personal-care` |
| `nail_salon` | `beauty-personal-care` |
| `barber_shop` | `beauty-personal-care` |
| `clothing_store` | `retail-boutique` |
| `jewelry_store` | `retail-boutique` |
| `book_store` | `retail-boutique` |
| `shoe_store` | `retail-boutique` |
| `gift_shop` | `retail-boutique` |
| `home_goods_store` | `retail-boutique` |
| `gym` | `fitness-sport` |
| `fitness_center` | `fitness-sport` |
| `sports_complex` | `fitness-sport` |
| `sports_club` | `fitness-sport` |
| `yoga_studio` | `fitness-sport` |
| `dance_school` | `fitness-sport` |
| `car_repair` | `automotive` |
| `car_dealer` | `automotive` |
| `car_wash` | `automotive` |
| `gas_station` (only when paired with car_repair) | `automotive` |
| `auto_parts_store` | `automotive` |
| `real_estate_agency` | `real-estate-property` |
| `property_management_company` (where available) | `real-estate-property` |

Google Maps does NOT have a dedicated type for creative services (photographers, designers, freelance creatives). Those lead must resolve via keyword or free-form steps below.

## Keyword table (Dutch + French + English)

Match against `business_name` after case-folding and diacritic stripping. First match wins; ordering matters when keywords could overlap (e.g. *"sport-kine"* — `kine` wins over `sport`, return `health-wellness`).

| Keyword (any language) | → `industry_key` |
|---|---|
| `bakkerij`, `bakery`, `boulangerie`, `patisserie`, `restaurant`, `bistro`, `traiteur`, `café`, `koffie`, `tearoom`, `brasserie`, `eetcafe`, `frituur` | `bakery-restaurant` |
| `loodgieter`, `plumber`, `plombier`, `elektricien`, `electrician`, `électricien`, `dakwerk`, `roofer`, `couvreur`, `schilder`, `painter`, `peintre`, `metselaar`, `mason`, `maçon`, `verwarming`, `hvac`, `aannemer`, `bouwbedrijf`, `entrepreneur` | `trades-construction` |
| `accountant`, `boekhoud`, `comptable`, `advocaat`, `lawyer`, `avocat`, `notaris`, `notaire`, `fiscalist`, `consultant`, `kantoor` (when not real-estate context) | `professional-services` |
| `tandarts`, `dentist`, `dentiste`, `kine`, `kinesi`, `physio`, `psycholoog`, `psy`, `osteopa`, `chiropract`, `kliniek`, `clinic`, `groepspraktijk`, `huisarts`, `praktijk` | `health-wellness` |
| `kapper`, `salon`, `barbershop`, `barber`, `coiffure`, `coiffeur`, `nagels`, `nail`, `lash`, `brow`, `wenkbrauw`, `spa`, `wellness`, `beauty`, `esthetiek`, `instituut` | `beauty-personal-care` |
| `boutique`, `kledingwinkel`, `kleding`, `mode`, `conceptstore`, `concept-store`, `giftshop`, `boekenwinkel`, `bookstore`, `librairie`, `interieur` (retail context), `design-shop` | `retail-boutique` |
| `gym`, `fitness`, `crossfit`, `yoga`, `pilates`, `personal-trainer`, `pt-studio`, `sportclub`, `volleybal`, `tennis`, `padel`, `judo`, `karate`, `dansschool`, `dance` | `fitness-sport` |
| `garage`, `automec`, `autoherst`, `autodealer`, `occasion`, `banden`, `pneus`, `tire`, `detailing`, `autowash`, `carwash`, `laadpaal`, `ev-installer`, `classic-car` | `automotive` |
| `vastgoed`, `real-estate`, `immo`, `immobilier`, `makelaar`, `agent-immobilier`, `syndic`, `property` (in syndic/management context), `vastgoedmakelaar`, `vastgoedkantoor` | `real-estate-property` |
| `fotograaf`, `photographer`, `photographie`, `studio` (when paired with `design`/`brand`/`creative`/`fotografie`/`film`), `ontwerper`, `designer`, `grafisch`, `illustrator`, `illustrat`, `videograaf`, `videographer`, `copywriter`, `freelance` (creative context) | `creative-services` |

Edge cases:

- **`studio`** is highly ambiguous — appears in beauty (lash-studio, nail-studio), fitness (yoga-studio, pilates-studio), creative (design-studio, film-studio). Always pair with another keyword from the same row before deciding.
- **`praktijk`** maps to `health-wellness` by default but could be a tax/accountant *fiscale praktijk*. Combine with `tandarts`/`kine`/`fiscalist` for disambiguation.
- **`kantoor`** in isolation means "office" generically; pair with `notaris`, `vastgoed`, `advocaten` for disambiguation. Otherwise fall through.
- **Mixed Dutch/French Brussels businesses** — match keywords from either language; prefer the language of `business_name` when both fire.

## Confidence reporting

| Source | Confidence assigned |
|---|---|
| Direct Google Maps `type` match | `0.95` |
| Keyword match in `business_name` | `0.75` |
| Free-form Claude Code classification | Use Claude's reported confidence, clamped to `[0.0, 0.95]` (never `1.0` from free-form) |
| Default fallback (no match) | `0.0` — surfaces as "needs manual industry" badge |

The Discovery Queue (spec §10.2) shows a "needs review" badge for any lead with `industry_classification_confidence < 0.60`. The Approval Queue (spec §10.3) shows a dropdown override for the same threshold; Thomas's override sets `confidence = 1.0` and is final.

## Maintenance

- **Adding a new keyword to an existing industry** — edit the keyword table here. The classifier code (Task 3.1 `industry-classify.ts`) reads this file at boot to build its lookup; no code change required, just a restart.
- **Adding a new industry guide** — out of scope for spine. Requires drafting a new `<key>.md` to the same 9-section structure as the existing guides, adding entries in both tables above, and bumping the skill's version. Generation prompts that reference the industry guide pool by directory listing pick up the new file automatically.
- **Removing an industry** — also out of scope; would require migrating any leads with that `industry_key` to a fallback before deletion.

## Negative checks

When the classifier returns a key, verify before persisting:

1. Key matches one of the 10 filenames listed above (string equality, lowercase).
2. The corresponding `<key>.md` file exists on disk.
3. Confidence is a number in `[0.0, 1.0]`.

Failing any check → fall back to `professional-services` with `confidence = 0.0` and log a warning. Never persist an invalid `industry_key`.
