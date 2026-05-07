---
name: atelier-design-system
description: Use when generating, editing, or quality-checking any AI Web Atelier client website — defines technical guardrails, tokens, and reference sites
---

## When to read each file

**Always read `SYSTEM.md` and `tokens.css` together** before generating or editing any client site. They are a contract pair: `SYSTEM.md` states the rules in prose; `tokens.css` is their CSS implementation. An apparent discrepancy between the two is a bug — stop and flag it.

**`SYSTEM.md`** — read this to know:
- Which spacing values are allowed (11 stops, no others)
- Which type scale tokens exist (9 named stops at 1.250 ratio)
- Which breakpoints to use in `@media` queries (640/768/1024/1280px only)
- Motion easing and duration rules
- Accessibility, performance, responsive, and SEO hard requirements
- How to apply per-site brand colors (the override protocol in §9)

**`tokens.css`** — import this in every generated site's global stylesheet as the first import. The per-site brand override `:root` block comes immediately after.

**`generation-prompt.md`** (Task A3, not yet written) — read this when generating a new site from scratch. It contains the full generation prompt template, industry guide integration points, and the output structure Claude Code must produce.

**`EDIT_MODE.md`** (Task A4, not yet written) — read this when editing an existing generated site. It defines how to modify content, layout, or brand settings without breaking system constraints.

**`industry-style-guides/<industry>.md`** — read the relevant guide after `SYSTEM.md` for aesthetic conventions, typography pairings, tone of voice in Dutch, and page structure patterns specific to the client's industry. System constraints take precedence over industry guide suggestions — the industry guide operates within the system's rules, not above them.

## Key rules to verify before submitting any generated site

1. Every spacing value in CSS resolves to one of: 4/8/12/16/24/32/48/64/96/128/192px.
2. Every `font-size` uses `var(--text-*)`.
3. `tokens.css` is imported before the brand override `:root` block.
4. Brand tokens (`--brand-primary`, `--brand-accent`, `--brand-bg`, `--brand-fg`) are set to client-specific values, not placeholder defaults.
5. `@media (prefers-reduced-motion: reduce)` block is present (or inherited from `tokens.css`).
6. Every `<img>` has an `alt` attribute.
7. Exactly one `<h1>` per page, headings in hierarchical order.
8. `LocalBusiness` JSON-LD structured data is present in `<head>`.
9. `sitemap.xml` and `robots.txt` exist at the site root.
10. Lighthouse Performance ≥ 90 on mobile before flagging as deploy-ready.
