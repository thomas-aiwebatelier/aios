---
name: brand-kit
description: Use when generating a customer's brand kit from their website (Market self-serve) — defines how to analyse a site and which brand signals to extract (tone, positioning, audience, products)
---

## What this skill is

The Market self-serve flow turns a customer's website URL into a **brand kit** (three
markdown docs: visual identity, tone of voice & messaging, business & offer). This skill
is the **single source of truth for the LLM part** of that flow — the prompt that reads a
site's visible text and returns structured brand signals.

Tune the brand-kit output by editing the prompt here, not the worker code. The worker
(`apps/local-worker/src/brand-kit.ts`, `brand-kit` pipeline step) loads
`analysis-prompt.md` at runtime, the same way the Build pipeline loads
`skills/atelier-design-system/generation-prompt.md`.

## When to read each file

- **`analysis-prompt.md`** — the prompt template sent to the LLM. Placeholders `{{URL}}`
  and `{{PAGE_TEXT}}` are substituted by the worker before the call. Read/edit this to
  change tone, add fields, or sharpen the analysis.

## What stays in code (deliberately NOT in this skill)

These are deterministic and must not vary run-to-run, so they live in code, not a prompt:

- **Palette** — extracted from a screenshot via `node-vibrant` (primary/secondary/accent + full palette).
- **Fonts** — read from the rendered DOM (`getComputedStyle`).
- **Social links** — parsed from `<a href>`.
- **Logo & visuals** — scraped (icon / `og:image` / largest in-page images) into `brand_kit_assets`.
- **The three markdown docs** — rendered deterministically by `renderBrandKit()` in `@atelier/db` (unit-tested).

The LLM only supplies the *interpretive* fields below; everything else is measured.

## Output contract (the LLM MUST return ONLY this JSON)

```json
{
  "toneOfVoiceSummary": "1–2 zinnen over de tone of voice",
  "positioning": "1 zin: wat doet dit bedrijf en voor wie",
  "audience": "korte beschrijving van de doelgroep",
  "products": [{ "name": "...", "description": "...", "price": "... of leeg" }]
}
```

- Language: **Dutch (nl-BE), informal je/jij**.
- No prose, no markdown code fence — raw JSON only (the worker extracts the first `{…}` block and `JSON.parse`s it; malformed output degrades gracefully to empty fields).

## Local vs prod

Identical behaviour either way — the worker's `generateText()` runs the **Claude CLI (Max plan)**
locally and **OpenRouter** in prod. This skill is the prompt for both.
