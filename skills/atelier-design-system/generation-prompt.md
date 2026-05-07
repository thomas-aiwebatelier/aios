# Generation Prompt — AI Web Atelier Site Generator

You are generating a complete custom Astro 5+ website for **{business_name}**, a {industry} based in
{city}, Belgium. This is a per-lead one-off site, not from a shared template — every site is bespoke
and honors the Atelier design system. Your working directory is already set to the empty
`/generated-sites/{slug}/` folder; everything you create goes there.

---

## 1. Read These Files Before Writing Any Code

Before touching a single component, read the following in this order:

1. `skills/atelier-design-system/SYSTEM.md` — the technical constitution. Every rule there maps to a
   programmatic check in `quality-checks.ts`. Violations will fail the build. No exceptions.
2. `skills/atelier-design-system/tokens.css` — the CSS token contract. You are bound to the tokens
   defined in this file. Memorize the spacing stops, type tokens, motion tokens, and brand token names.
3. `industry-style-guides/{industry_key}.md` — the aesthetic conventions, tone of voice, page
   structure patterns, CTA conventions, trust signals, and imagery guidance for this industry.
   If no exact match exists for `{industry_key}`, use the guide whose industry is closest in character
   (e.g. `horeca` for a restaurant, `retail` for a boutique). Log which guide you used.
4. `skills/atelier-design-system/reference-sites/` — study the example most relevant to this
   industry (`bakery-example/`, `plumber-example/`, `boutique-example/`). If the lead's industry
   maps closely to one (e.g. `bakkerij-restaurant` → `bakery-example/`), study that one especially
   closely. If none is a close match, read all three for patterns.

**Do not start generating project files until you have read all four.** SYSTEM.md rules take
precedence over anything in the industry guide. The industry guide operates within the system's
rules, not above them.

---

## 2. Understand Your Input Bundle

The context bundle passed to you on stdin contains the following objects. Parse them before deciding
which mode to operate in (see §3).

### 2.1 Lead Record
```
lead.business_name    — string, the exact legal/trading name
lead.slug             — string, kebab-case, used for the project name and site URL
lead.phone            — string or null
lead.email            — string or null
lead.address          — string (street + number)
lead.city             — string
lead.postal_code      — string
lead.industry_key     — string, e.g. "bakkerij", "loodgieter", "kledingwinkel"
lead.language         — "nl" (default for all spine v1 sites)
lead.existing_website_url — string or null
```

### 2.2 Brand Profile
```
brand.logo_path               — relative path to downloaded logo, or null
brand.extracted_palette       — array of hex strings (up to 5), sorted by prominence
brand.primary_color           — hex string, the most prominent brand color
brand.secondary_color         — hex string or null
brand.accent_color            — hex string or null
brand.fonts_detected.heading  — font-family string or null
brand.fonts_detected.body     — font-family string or null
brand.tone_of_voice_summary   — 2-sentence summary of the brand's voice, or null
brand.social_links            — object { facebook, instagram, linkedin } with URLs or nulls
```

### 2.3 Site Inventory (replication mode only; empty object in greenfield mode)
```
site_inventory.pages[]  — array of page objects:
  .url                  — original URL
  .title                — page <title>
  .meta_description     — original meta description or null
  .sections[]           — array of { type, heading, body_copy_verbatim, ctas[], images[] }
  .forms[]              — array of { fields[], intent }
  .language             — "nl" | "fr" | "mixed"

site_inventory.assets[] — array of downloaded files:
  .original_url         — source URL
  .local_path           — path relative to project root, e.g. "./data/assets/{lead-id}/scraped/hero.jpg"
  .alt_text_original    — alt text from the original page, or null
  .is_logo              — boolean
```

### 2.4 Competitor Record
```
competitor.competitor_url     — string
competitor.competitor_name    — string
competitor.selection_reason   — string (why this competitor was chosen)
competitor.structure_summary  — JSON object describing their page structure
competitor.learnings          — string, prose notes on what to borrow or avoid
```

### 2.5 Industry Style Guide
Already read as `industry-style-guides/{industry_key}.md` in §1. Use it, do not re-fetch it.

### 2.6 Reference Sites
Paths to the three example sites under `skills/atelier-design-system/reference-sites/`. Read their
source; do NOT copy their markup or text verbatim.

---

## 3. Operating Modes — Pick Exactly One

**Mode is determined by a single condition:**

- **Replication mode** → `site_inventory.pages` is a non-empty array (at least one page object).
- **Greenfield mode** → `site_inventory` is empty or `site_inventory.pages` is an empty array.

### 3.1 Replication Mode

Your job is to produce a visually improved, technically modernised version of the existing site,
with **all content preserved exactly**.

**Content rules:**
- Body copy in `sections[].body_copy_verbatim` is reproduced character-for-character. Do not
  summarise, paraphrase, "improve," translate, or correct typos. If the original is in French or
  mixed Dutch/French, reproduce it exactly. The client's voice is the client's voice.
- Headings from `sections[].heading` are reproduced verbatim unless the industry guide explicitly
  calls for a structural rename (e.g. merging a "Welkom" and "Over ons" page into one). If you
  rename, log the decision.
- CTAs from `sections[].ctas[]` are reproduced verbatim (text and intent). Do not invent new CTAs
  or reword existing ones unless the industry guide identifies a trust signal gap that the original
  missed AND you have copy to support it from the inventory.
- Forms: reproduce all fields with their original labels. Do not add or remove fields.

**Structure rules:**
- One Astro page per inventory page: `site_inventory.pages[i].url` → `src/pages/<slug>.astro`.
  Derive the Astro slug from the page URL path: `https://example.com/diensten` → `src/pages/diensten.astro`.
  The root URL maps to `src/pages/index.astro`.
- Section order within a page follows the inventory's section order. Merge adjacent sections of the
  same type only if the industry guide calls for it and it doesn't lose any copy.
- The competitor record is advisory in replication mode. Use `competitor.learnings` to inform visual
  or structural improvements, but do not add copy or sections not present in the inventory.

**Asset rules:**
- Use images from `site_inventory.assets[]` via their `local_path`. Copy them to `public/images/`
  and reference via Astro's `<Image>` component for automatic WebP conversion and dimension inference.
- Preserve `alt_text_original` as the starting point for alt text. Translate to Dutch if the
  original is in another language (this is the one permitted copy transformation). If original alt
  text is empty or missing, write descriptive Dutch alt text.

### 3.2 Greenfield Mode

You are building from scratch. The competitor record and industry guide are your primary scaffolding
inputs.

**Content rules:**
- Generate all copy in Dutch (`nl-BE` locale). Natural, industry-appropriate register as described
  in `industry-style-guides/{industry_key}.md`. Never use English filler. Never use lorem ipsum.
- Copy must be plausible for a real Belgian business in {city}. Reference the business name,
  industry, and city naturally. Do not reference fictional places, UK postcodes, or American idioms.
- The `brand.tone_of_voice_summary` (if not null) sets the voice. Honor it. If null, default to
  the industry guide's recommended tone.

**Structure rules:**
- Page structure follows the industry guide's typical page pattern. If the guide lists e.g.
  "Home / Diensten / Over ons / Contact" as the standard structure, use that. If competitor
  `learnings` suggest a page the industry guide doesn't cover and it would genuinely help the lead,
  add it — but log the decision.
- The competitor's `structure_summary` is the primary page-structure input. Study it as a learned
  pattern, not a template to clone.

**Asset rules:**
- Use `brand.logo_path` if non-null. Copy it to `public/images/logo.*` and reference from the
  `<Base>` layout.
- Generate a text-based favicon SVG from the business initials if `brand.logo_path` is null.
- Use only images that are in `site_inventory.assets[]` (there may be none in greenfield). Do not
  fetch external images at generation time. If the industry guide calls for photography and none
  exists, leave semantically-named `<figure>` placeholders with descriptive alt text and a CSS
  aspect-ratio box — log that real photos are needed post-approval.

---

## 4. Honoring `tokens.css`

### 4.1 Import Order

Your site's global stylesheet MUST begin with:

```css
/* Auto-generated — DO NOT EDIT MANUALLY */
/* Site: {slug} */
@import url('/styles/tokens.css');
```

Copy `skills/atelier-design-system/tokens.css` into `public/styles/tokens.css` verbatim (do not
modify it). Then add the per-site brand override block immediately after the import in
`src/styles/global.css`:

```css
:root {
  --brand-primary: {brand.primary_color};
  --brand-accent:  {brand.accent_color ?? brand.secondary_color ?? '#c9a96e'};
  --brand-bg:      {derived from palette — the lightest neutral, or '#fbfbf8' if none};
  --brand-fg:      {derived from palette — the darkest neutral, or '#1a1a1a' if none};
}
```

Validate contrast before emitting:
- `--brand-fg` on `--brand-bg` MUST be ≥ 4.5:1.
- `--brand-accent` on `--brand-bg` MUST be ≥ 3:1.
If either fails, adjust lightness until it passes. Log any adjustment.

### 4.2 Spacing

Every `margin`, `padding`, `gap`, `top`, `right`, `bottom`, `left` declaration uses a token from
the 11-stop scale: `--space-1` (4px) through `--space-48` (192px). The allowed stops are:

```
--space-1   --space-2   --space-3   --space-4   --space-6
--space-8   --space-12  --space-16  --space-24  --space-32  --space-48
```

`border-width` (1px, 2px) is exempt. Nothing else is exempt.

### 4.3 Typography

Every `font-size` declaration uses one of the 9 type tokens:

```
--text-xs  --text-sm  --text-base  --text-lg  --text-xl
--text-2xl  --text-3xl  --text-4xl  --text-5xl
```

Font family and weight are per-industry (from the industry guide and `brand.fonts_detected`). If
`brand.fonts_detected.heading` is non-null, use it for headings; fall back to the industry guide's
recommendation. If both are null, use a safe system serif stack for headings and system sans for
body.

To load a Google Font, add a `<link rel="preconnect">` and `<link>` in `<Base>` — NOT a CSS
`@import` inside a stylesheet (performance violation per SYSTEM.md §6).

### 4.4 Motion

Every `transition-duration` and `animation-duration` uses one of the 3 duration tokens:

```
--dur-micro (150ms)    — hover states, focus rings, toggles
--dur-standard (300ms) — reveals, panel opens
--dur-hero (600ms)     — page-entry animations, hero sequences
```

The easing token `--ease` (`cubic-bezier(0.4, 0, 0.2, 1)`) is used for all transitions unless the
industry guide specifies otherwise.

`tokens.css` already provides the `prefers-reduced-motion` override block — do not duplicate it.
Your animations will be collapsed automatically. However, verify your animations are driven by
the token variables so the collapse actually works.

### 4.5 Brand Token Derivatives

Compute derived colors at the usage site using `color-mix()`. Do NOT invent new CSS custom
properties for derived colors:

```css
/* Soft background tint */
background: color-mix(in srgb, var(--brand-primary) 10%, var(--brand-bg));

/* Hover darken */
background: color-mix(in srgb, var(--brand-primary) 80%, black);

/* 90% opacity */
background: color-mix(in srgb, var(--brand-primary) 90%, transparent);
```

Document the specific expression in a comment on the declaration where you use it.

### 4.6 Layout

- Every page has exactly one `.container` wrapper with `max-width: var(--max-w)` and
  `margin-inline: auto`.
- Multi-column layouts use `gap: var(--gutter)` (= `var(--space-6)` = 24px).
- Breakpoints in `@media` queries use pixel values directly (640, 768, 1024, 1280). `var(--bp-*)`
  tokens exist for JavaScript only — do not use them in CSS `@media` rules.
- CSS is mobile-first: base styles target 320px; progressive enhancement via `min-width` queries.

---

## 5. Using the Reference Sites

The three reference sites at `skills/atelier-design-system/reference-sites/` show what good
Atelier-quality work looks like in three industries:

- `bakery-example/` — food/hospitality industry
- `plumber-example/` — trade/service industry
- `boutique-example/` — retail/fashion industry

**What to borrow:** Section types, information hierarchy, motion patterns, the relationship between
whitespace and content density, the way hero sections establish trust, how CTAs are placed relative
to trust signals.

**What NOT to copy:** Their HTML structure, their CSS class names, their component file layout, or
any word of their copy. These are exemplars to learn from, not templates to fork.

If the lead's industry maps closely to one reference (e.g. a restaurant → `bakery-example/`), study
that one closely for layout rhythm and section sequencing. If no close match exists, read all three
and synthesise what applies.

---

## 6. What NOT to Do

These are hard violations. Every item below will either fail `quality-checks.ts` or result in a
manual rejection by the admin.

### 6.1 Token violations
- **MUST NOT** invent CSS custom properties outside `tokens.css`. If you need a value the scale
  doesn't cover, compose from existing tokens. If composition is genuinely impossible, log it as a
  concern — do NOT silently emit a raw value.
- **MUST NOT** hardcode spacing values that are not on the 11-stop scale (e.g. `padding: 23px`,
  `gap: 20px`, `margin-top: 10px`). This is a `quality-checks.ts` automated failure.
- **MUST NOT** hardcode font sizes (e.g. `font-size: 18px`, `font-size: 1.1rem`). Use `--text-*`
  tokens.
- **MUST NOT** hardcode placeholder brand hex values (`#1a1a1a`, `#c9a96e`, `#fbfbf8`) as
  literals in CSS. Use `var(--brand-*)`.
- **MUST NOT** use animation or transition durations other than 150ms, 300ms, or 600ms.
- **MUST NOT** use `@media` breakpoints other than 640px, 768px, 1024px, 1280px.

### 6.2 Copy violations
- **MUST NOT** generate placeholder lorem ipsum text. Every word of copy must be real: verbatim
  from the inventory (replication) or Dutch-natural for the industry and locale (greenfield).
- **MUST NOT** generate English-language filler or copy ("Welcome to our store", "Contact us today").
  All copy is Dutch (`nl-BE`). The only exception: content that was already in French or mixed
  Dutch/French in the inventory is reproduced exactly.
- **MUST NOT** reference non-Belgian geography (no "London", "New York", fictional towns). Locale
  is `nl-BE`, locale is {city}, locale is Belgium.

### 6.3 Privacy and tracking
- **MUST NOT** include any analytics scripts, tracking pixels, or third-party beacon requests
  (no Google Analytics, Meta Pixel, Hotjar, Clarity, or similar). This is a hard privacy
  requirement with no exception.
- **MUST NOT** add social media embed widgets that load third-party JS (no Facebook Like button
  SDK, no Twitter/X embed, no Instagram embed widget). Link to profiles; do not embed.
- **MUST NOT** add cookie consent banners, GDPR popups, or consent management scripts — the site
  has no tracking, so none is needed.

### 6.4 Indexing
- **MUST NOT** add `<meta name="robots" content="index,follow">` or any permissive robots meta
  tag. The noindex meta is controlled by the environment variable `SITE_STATUS` (see §7.3). Do not
  hardcode indexing behavior.

### 6.5 Dependencies and scope
- **MUST NOT** bump Astro to a major version beyond 5.x. Use the latest Astro 5.x minor available
  at generation time.
- **MUST NOT** add UI framework dependencies (React, Vue, Svelte, Solid) unless the specific
  industry guide explicitly calls for an interactive island. Static-first is the default. If islands
  are needed, use Astro's native `client:*` directives with a minimal framework footprint.
- **MUST NOT** add a CMS, database, or any server-side runtime. The output is a purely static site.
- **MUST NOT** configure the Astro project as a pnpm workspace member. The project's `package.json`
  must be standalone (no `"workspaces"` field, no dependency on a shared root workspace). pnpm's
  global content-addressed store still deduplicates disk usage automatically.

### 6.6 Accessibility
- **MUST NOT** omit `alt` text on any `<img>`. Decorative images get `alt=""`. Content images get
  descriptive Dutch alt text.
- **MUST NOT** use `outline: none` without a replacement `:focus-visible` indicator.
- **MUST NOT** skip heading levels (e.g. h1 → h3 with no h2). Hierarchy must be strict.
- **MUST NOT** have more than one `<h1>` per page.
- **MUST NOT** use positive `tabindex` values (> 0).
- **MUST NOT** use `role="button"` on a `<button>` or other redundant ARIA.

### 6.7 Performance
- **MUST NOT** include render-blocking `<script>` in `<head>` without `defer` or `async`.
- **MUST NOT** use CSS `@import` inside stylesheets. Use `<link>` in the HTML head instead.
  Exception: the single `@import url('/styles/tokens.css')` in `global.css` is the only permitted
  CSS import — and it is written as a `<link>` in the `<Base>` layout, not embedded in another
  stylesheet.
- **MUST NOT** apply `loading="lazy"` to the LCP image (typically the hero image). Lazy-loading
  the LCP element increases LCP, which fails the performance threshold.
- **MUST NOT** use font files without `font-display: swap`.

---

## 7. Output Requirements

The following checklist defines a complete, valid output. **Every item is required.** `astro build`
must succeed; `quality-checks.ts` must pass.

### 7.1 Project Files

```
package.json           — name: "{slug}", standalone (not workspace member)
                         scripts: { dev, build, preview }
                         astro: "^5.x" (latest minor)
astro.config.mjs       — site: "https://{slug}.pages.dev"
                         output: "static"
                         no integrations unless the industry guide requires them
src/
  layouts/
    Base.astro         — required (see §7.3)
  pages/
    index.astro        — required
    [...].astro        — one per inventory page (replication) or per industry-guide pattern (greenfield)
  components/          — project-specific components (no shared library)
  styles/
    global.css         — tokens.css import + brand override :root block (see §4.1)
public/
  styles/
    tokens.css         — verbatim copy of skills/atelier-design-system/tokens.css
  images/              — all scraped/brand assets copied here
  robots.txt           — required (see §7.5)
  favicon.ico          — required (see §7.4)
  sitemap.xml          — required (see §7.5)
```

### 7.2 `package.json` Shape

```json
{
  "name": "{slug}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":     "astro dev",
    "build":   "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.x"
  }
}
```

Add `@astrojs/image` only if the industry guide requires image optimization beyond Astro's built-in.
Do not add packages preemptively.

### 7.3 `src/layouts/Base.astro`

This layout is used by every page. It MUST include:

**a) `tokens.css` link** (in `<head>`):
```html
<link rel="stylesheet" href="/styles/tokens.css" />
```
Plus `src/styles/global.css` for the brand override.

**b) Noindex meta conditional** — the exact condition is
`import.meta.env.SITE_STATUS !== 'accepted'`. Default `SITE_STATUS` is `preview`. Every page is
noindexed until the lead accepts and the deployer sets `SITE_STATUS=accepted` at build time.

```astro
---
const isAccepted = import.meta.env.SITE_STATUS === 'accepted';
---
{!isAccepted && (
  <meta name="robots" content="noindex,nofollow" />
)}
```

Do NOT emit `<meta name="robots" content="index,follow">` when `isAccepted` is true — omitting the
tag is sufficient; browsers default to indexing.

**c) SEO meta block** — per-page values passed as props:
```astro
---
interface Props {
  title: string;          // 50-60 chars, includes business name
  description: string;   // 120-160 chars, actionable
  canonical: string;     // full URL, e.g. https://{slug}.pages.dev/diensten
  ogImage?: string;      // absolute URL to an image
}
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImage ?? `https://{slug}.pages.dev/images/og-default.jpg`} />
<meta property="og:url" content={canonical} />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage ?? `https://{slug}.pages.dev/images/og-default.jpg`} />
```

**d) LocalBusiness JSON-LD structured data** — on every page:
```astro
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "{lead.business_name}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{lead.address}",
    "addressLocality": "{lead.city}",
    "postalCode": "{lead.postal_code}",
    "addressCountry": "BE"
  },
  "telephone": "{lead.phone}",
  "email": "{lead.email}",
  "url": "https://{slug}.pages.dev"
})} />
```

Omit `telephone` and `email` keys if the values are null — do not emit null as a JSON string.

**e) Semantic page structure**:
```html
<body>
  <header>...</header>
  <main>...</main>
  <footer>...</footer>
</body>
```

Exactly one `<main>` per page. One `<h1>` per page.

### 7.4 Favicon

- If `brand.logo_path` is non-null: generate a square crop and convert to `.ico` at 32×32 using
  Astro's image pipeline or an inline script during build. Place at `public/favicon.ico`.
- If `brand.logo_path` is null: generate a minimal SVG favicon from the business's initials (max
  2 characters from `lead.business_name`, foreground `--brand-fg` default `#1a1a1a` on background
  `--brand-primary` default). Place at `public/favicon.svg` and reference via
  `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`.

### 7.5 `public/robots.txt` and `public/sitemap.xml`

**`robots.txt`** (always):
```
User-agent: *
Allow: /

Sitemap: https://{slug}.pages.dev/sitemap.xml
```

Note: crawlers will respect the `noindex` meta tag on preview deployments. `robots.txt` itself
does not block crawlers — the noindex meta handles that.

**`sitemap.xml`**: valid XML sitemap listing all public pages. Use Astro's `@astrojs/sitemap`
integration configured with `site: "https://{slug}.pages.dev"`. Set `lastmod` to today's date.

### 7.6 Images

- All asset files from `site_inventory.assets[].local_path` (replication) or `brand.logo_path`
  (both modes) MUST be copied to `public/images/`. Reference them via Astro's `<Image>` component
  where Astro image optimization is active, or via standard `<img>` with explicit `width` and
  `height` for static images not processed through the pipeline.
- LCP images (hero images above the fold): use `fetchpriority="high"` and do NOT use
  `loading="lazy"`.
- All below-fold images: use `loading="lazy"`.
- Every `<img>` has a `width` and `height` attribute to prevent CLS.
- Format: Astro's `<Image>` component outputs WebP automatically. For images not run through
  `<Image>`, ensure the source is already WebP or AVIF.

### 7.7 Build Verification

Before declaring the project complete:

1. Confirm all pages import `Base.astro` (or a layout that extends it).
2. Confirm `src/styles/global.css` has the tokens import before the brand override block.
3. Confirm no raw hex placeholder values (`#1a1a1a`, `#c9a96e`, `#fbfbf8`) appear in CSS other
   than inside `tokens.css` itself.
4. Confirm no spacing values outside the 11-stop scale appear in CSS.
5. Confirm every `<img>` has an `alt` attribute.
6. Confirm `sitemap.xml` and `robots.txt` exist in `public/`.
7. The build pipeline will run: `pnpm install && pnpm exec astro check && pnpm exec astro build`.
   Your output must pass all three commands without errors or TypeScript warnings.

Quality checks (`quality-checks.ts`) will then validate:
- Lighthouse mobile Performance ≥ 90, Accessibility ≥ 90, SEO ≥ 90, Best Practices ≥ 90
- Breakpoint reflow at 320/375/768/1024/1440px: no horizontal overflow
- Every `<img>` has non-empty `alt`
- Every internal link `href` resolves to an existing page
- All meta tags present per §7.3
- No spacing values outside the 11-stop scale
- No `font-size` outside `--text-*` tokens
- No animation durations outside 150/300/600ms
- `LocalBusiness` JSON-LD present and valid
- `--brand-*` tokens not set to placeholder hex values

---

## 8. Closing

When the project is complete and all files are written, exit. The deployer will run
`pnpm install && pnpm exec astro check && pnpm exec astro build`, execute quality checks against
`dist/`, and either deploy to Cloudflare Pages or hand back structured failure feedback for one
regeneration pass.

Do not attempt to start a dev server, open a browser, or interact with any external service. Your
job is to produce a complete, buildable Astro 5+ project in the working directory. Nothing more.
