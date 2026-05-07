# Atelier Design System — Technical Constitution

This document defines what must be consistent across every AI Web Atelier client website. It is read by Claude Code during site generation and editing, and enforced programmatically by `quality-checks.ts`. Every rule here maps to a testable check. Rules apply without exception unless this document is explicitly updated.

**What this document is NOT**: component shape rules (button radius, card padding, form field height). Those are per-industry. If a rule could vary by industry, it does not belong here.

**Contract pair**: this document and `tokens.css` must stay in sync. Any change to a token value or scale requires updating both files together.

---

## 1. Spacing Scale

**Base unit**: 4px (0.25rem).

**Allowed values** (the only valid spacing values — no others, ever):

| Stop | px  | rem    | CSS token    |
|------|-----|--------|--------------|
| 1    | 4   | 0.25   | `--space-1`  |
| 2    | 8   | 0.5    | `--space-2`  |
| 3    | 12  | 0.75   | `--space-3`  |
| 4    | 16  | 1      | `--space-4`  |
| 6    | 24  | 1.5    | `--space-6`  |
| 8    | 32  | 2      | `--space-8`  |
| 12   | 48  | 3      | `--space-12` |
| 16   | 64  | 4      | `--space-16` |
| 24   | 96  | 6      | `--space-24` |
| 32   | 128 | 8      | `--space-32` |
| 48   | 192 | 12     | `--space-48` |

**Naming convention**: stops are named by their Tailwind-equivalent multiplier (e.g. `--space-6` = 6 × 4px = 24px). This matches Tailwind's spacing scale and makes values predictable.

**Rules**:
- All `margin`, `padding`, `gap`, `top/right/bottom/left` values must resolve to one of the 11 stops above.
- `px`, `em`, or arbitrary `rem` values that don't correspond to a stop are a violation.
- Exception: `border-width` values (1px, 2px) are exempt from this scale.
- `quality-checks.ts` scans generated CSS for spacing values not in `{4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192}px` and flags them as errors.

---

## 2. Type Scale

**Ratio**: 1.250 (Major Third). Base = 1rem (assumed 16px browser default).

**Named tokens**:

| Token       | rem    | px (approx) | CSS token      |
|-------------|--------|-------------|----------------|
| `xs`        | 0.64   | 10.2        | `--text-xs`    |
| `sm`        | 0.8    | 12.8        | `--text-sm`    |
| `base`      | 1      | 16          | `--text-base`  |
| `lg`        | 1.25   | 20          | `--text-lg`    |
| `xl`        | 1.563  | 25          | `--text-xl`    |
| `2xl`       | 1.953  | 31.2        | `--text-2xl`   |
| `3xl`       | 2.441  | 39          | `--text-3xl`   |
| `4xl`       | 3.052  | 48.8        | `--text-4xl`   |
| `5xl`       | 3.815  | 61          | `--text-5xl`   |

**Rules**:
- All `font-size` declarations must use one of the 9 named tokens via `var(--text-*)`.
- Hardcoded `px` or arbitrary `rem` font sizes are a violation.
- Font family and weight are per-industry — not defined here.
- Line-height and letter-spacing are per-site — not defined here.
- `quality-checks.ts` scans for `font-size` values not referencing `--text-*` tokens.

---

## 3. Layout Primitives

**Max content width**: 1280px (`var(--max-w)`). No content container exceeds this width.

**Breakpoints**:

| Name | px   | CSS token  | `@media` usage       |
|------|------|------------|----------------------|
| `sm` | 640  | `--bp-sm`  | `@media (min-width: 640px)`  |
| `md` | 768  | `--bp-md`  | `@media (min-width: 768px)`  |
| `lg` | 1024 | `--bp-lg`  | `@media (min-width: 1024px)` |
| `xl` | 1280 | `--bp-xl`  | `@media (min-width: 1280px)` |

Note: `var()` does not work inside `@media` queries. Use the pixel values directly in media queries. The `--bp-*` tokens exist for JavaScript consumption only (e.g. `getComputedStyle(root).getPropertyValue('--bp-lg')`).

**Grid**:
- 12-column grid.
- Gutter width: 24px (= `var(--space-6)` = `--gutter`).
- All generated sites use CSS Grid or Flexbox with `gap: var(--gutter)` for multi-column layouts.
- No fixed-width columns that ignore the grid (except UI elements with intrinsic sizing like icons and badges).

**Rules**:
- Every page has exactly one `.container` (or equivalent) wrapper with `max-width: var(--max-w)` and `margin-inline: auto`.
- No content bleeds beyond `--max-w` except intentional full-bleed backgrounds.
- No arbitrary breakpoints outside the 4 defined above.
- `quality-checks.ts` checks for containers missing `max-width: var(--max-w)` and for `@media` queries using breakpoint values other than 640/768/1024/1280.

---

## 4. Motion Language

**Default easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (`var(--ease)`). Use for all transitions and animations unless a specific exception applies.

**Durations**:

| Name       | Value  | CSS token         | When to use                           |
|------------|--------|-------------------|---------------------------------------|
| `micro`    | 150ms  | `var(--dur-micro)`    | Hover states, focus rings, toggles    |
| `standard` | 300ms  | `var(--dur-standard)` | Panel opens, dropdowns, reveals       |
| `hero`     | 600ms  | `var(--dur-hero)`     | Page-entry animations, hero sequences |

**Rules**:
- All CSS `transition-duration` and `animation-duration` values must use one of the 3 duration tokens.
- Arbitrary duration values (e.g. `250ms`, `400ms`) are a violation.
- No `cubic-bezier` values with negative or >1 `y1`/`y2` parameters (no bouncy spring easing).
- No parallax effects that shift an element more than 20% of its own height/width.
- `prefers-reduced-motion`: all animations and transitions must be disabled or reduced to `opacity` fades when `@media (prefers-reduced-motion: reduce)` is active. This is a hard requirement, not a suggestion.
- `quality-checks.ts` checks for transition/animation durations not matching 150/300/600ms and for missing `prefers-reduced-motion` media query.

---

## 5. Accessibility Baseline

Standard: **WCAG 2.1 AA minimum**. No exceptions.

**Contrast**:
- Normal text (below `--text-lg`): minimum contrast ratio 4.5:1 against background.
- Large text (`--text-lg` and above) and UI components: minimum contrast ratio 3:1.
- Contrast is validated against the generated `--brand-*` color values at quality-check time.

**Focus**:
- All interactive elements (links, buttons, inputs, selects) must have a visible `:focus-visible` ring.
- The focus ring must have at minimum 3px outline and 3:1 contrast against adjacent colors.
- `outline: none` without a replacement focus indicator is a violation.

**Keyboard navigation**:
- All interactive elements reachable via `Tab` key in logical DOM order.
- No `tabindex` values greater than 0 (positive tabindex breaks natural order).
- Custom interactive components (dropdowns, modals, carousels) implement arrow-key navigation per ARIA Authoring Practices Guide patterns.

**Semantic HTML**:
- `<nav>` for navigation regions. One `<main>` per page. `<header>` and `<footer>` at page level.
- Headings (`h1`–`h6`) in hierarchical order — no skipped levels.
- Exactly one `<h1>` per page.
- Form inputs have associated `<label>` elements (not placeholder-only).

**Images**:
- Every `<img>` has an `alt` attribute.
- Decorative images: `alt=""`.
- Content images: descriptive alt text written by the generator.

**ARIA**:
- Use native HTML semantics before ARIA. Only add ARIA attributes when native semantics are insufficient.
- No redundant ARIA (e.g. `role="button"` on a `<button>`).

**quality-checks.ts** runs axe-core against the built site and fails on any WCAG AA violation.

---

## 6. Performance Baseline

All thresholds are measured on **mobile** (Lighthouse mobile preset, simulated 4G, Moto G4 equivalent). These are hard requirements — a site that fails any threshold is not deployable.

| Metric                       | Threshold  |
|------------------------------|------------|
| Lighthouse Performance score | ≥ 90       |
| Largest Contentful Paint (LCP) | < 2.5s   |
| Cumulative Layout Shift (CLS) | < 0.1     |
| Total Blocking Time (TBT)    | < 200ms    |

**Rules**:
- No render-blocking `<script>` in `<head>` without `defer` or `async`.
- No CSS `@import` inside stylesheets (use `<link>` in HTML head instead).
- Images: use `<img loading="lazy">` for below-the-fold images; LCP image must NOT be lazy-loaded.
- Images: served in WebP or AVIF format, with appropriate `width` and `height` attributes to prevent CLS.
- Fonts: use `font-display: swap` on all `@font-face` declarations.
- No layout shift from late-loading content — reserve space with aspect-ratio or explicit dimensions.
- Third-party scripts: loaded with `async` and deferred where possible.

**quality-checks.ts** runs Lighthouse CI in mobile mode and fails the build if any threshold is missed.

---

## 7. Responsive Baseline

Every generated site must render correctly (no overflow, no broken layout, no illegible text) at these viewport widths:

| Width  | Represents                    |
|--------|-------------------------------|
| 320px  | Smallest phones (iPhone SE 1) |
| 375px  | Standard phones (iPhone SE 2+) |
| 768px  | Tablets (iPad portrait)       |
| 1024px | Tablets landscape / small laptop |
| 1440px | Standard desktop              |

**Rules**:
- No horizontal scrollbar at any of the 5 test widths.
- No text below 12px (`--text-sm`) at any width.
- No overlapping elements at any width.
- Touch targets (buttons, links) must be at minimum 44×44px on mobile viewports (320–768px range).
- Images must not overflow their container at 320px.
- Mobile-first CSS: base styles target 320px, then progressively enhance via `min-width` media queries.

**quality-checks.ts** uses Playwright to screenshot the built site at all 5 widths and checks for horizontal overflow (`document.body.scrollWidth > window.innerWidth`).

---

## 8. SEO Baseline

Every generated page must pass all checks. These are hard requirements, not recommendations.

**Per-page requirements**:
- `<title>`: unique, 50–60 characters, contains the business name.
- `<meta name="description">`: unique, 120–160 characters, actionable.
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type` present on every page.
- Twitter Card: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` present on every page.
- Canonical `<link rel="canonical">` on every page.

**Site-wide requirements**:
- `sitemap.xml`: valid XML sitemap listing all public pages, submitted-date accurate.
- `robots.txt`: present at root, permits all crawlers unless specific paths need exclusion.
- Structured data: every client site includes `LocalBusiness` schema (JSON-LD in `<head>`). Minimum required fields: `@type`, `name`, `address`, `telephone`, `url`, `openingHours`.

**Naming**:
- All page URLs use kebab-case, no query parameters in canonical URLs, no trailing slashes inconsistency (pick one convention per site and be consistent).

**quality-checks.ts** validates meta tags presence, structured data via schema.org validator API, and sitemap validity.

---

## 9. Brand-Token Override System

### How it works

`tokens.css` declares brand tokens with neutral placeholder defaults:

```css
:root {
  --brand-primary: #1a1a1a;   /* Default: deep ink */
  --brand-accent:  #c9a96e;   /* Default: warm gold */
  --brand-bg:      #fbfbf8;   /* Default: off-white */
  --brand-fg:      #1a1a1a;   /* Default: deep ink */
}
```

At generation time, the generator emits a per-site override block in the global stylesheet **after** the `tokens.css` import:

```css
/* Auto-generated — DO NOT EDIT MANUALLY */
/* Site: [client-slug] */
@import url('/styles/tokens.css');

:root {
  --brand-primary: #2c5f2e;   /* Client-specific value */
  --brand-accent:  #97bc62;
  --brand-bg:      #f9f9f6;
  --brand-fg:      #1a1a1a;
}
```

**Load order is mandatory**: the per-site `:root` block must come AFTER the `@import` of `tokens.css` in the global stylesheet. This ensures overrides take precedence over defaults.

### Derivative token convention

Do not pre-emit derivative tokens. Instead, compute them at usage:

- **90% opacity variant**: `color-mix(in srgb, var(--brand-primary) 90%, transparent)`
- **Soft/tinted backgrounds**: `color-mix(in srgb, var(--brand-primary) 10%, var(--brand-bg))`
- **Hover darken**: `color-mix(in srgb, var(--brand-primary) 80%, black)`

Document the specific `color-mix` expression in the component where it's used — do not invent `--brand-primary-90` tokens or similar. This keeps the token namespace flat and prevents proliferation.

### Rules
- Generated sites must not hardcode the placeholder default values (`#1a1a1a`, `#c9a96e`, `#fbfbf8`) as literal hex in CSS — they must reference `var(--brand-*)` tokens.
- The 4 brand tokens (`--brand-primary`, `--brand-accent`, `--brand-bg`, `--brand-fg`) are the only color tokens defined here. All other colors are either derived via `color-mix()` or defined per-industry in industry style guides.
- Contrast ratios must be validated against the actual per-site values, not the placeholder defaults.
- `quality-checks.ts` checks that no hardcoded placeholder hex values appear in generated CSS.

---

## 10. How to Override Per-Site

The 4 brand tokens are the only intentional customization point at the token layer. All other system values are fixed.

**To apply a different color scheme for a client**:
1. Determine `--brand-primary`, `--brand-accent`, `--brand-bg`, `--brand-fg` from the lead intake (industry guide or Thomas's manual selection).
2. Validate contrast: `--brand-fg` on `--brand-bg` must be ≥ 4.5:1. `--brand-accent` on `--brand-bg` must be ≥ 3:1.
3. Emit the override `:root` block after `@import url('/styles/tokens.css')` in `src/styles/global.css`.
4. Do not modify `tokens.css` itself — it is shared across all sites.

---

## 11. How to Extend (Post-Spine)

Adding a new token or scale value requires updating **both** `SYSTEM.md` and `tokens.css` together. They are a contract pair — a token in one file that is absent from the other is a bug.

**Procedure**:
1. Propose the new token in `SYSTEM.md` with rationale (why the existing scale is insufficient).
2. Add the CSS custom property to `tokens.css` in the appropriate section with a comment.
3. Update `quality-checks.ts` to validate the new token where applicable.
4. If adding a spacing stop not in the current 11-stop scale: reconsider first. The scale was chosen deliberately. Off-scale values are almost always a sign of a component-shape decision, not a system decision.
