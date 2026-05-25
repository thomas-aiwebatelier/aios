# Design: More custom site generation + admin site editing

Date: 2026-05-25
Status: Approved (design) — ready for implementation planning

## Problem

Two gaps in the current AI Web Atelier pipeline:

1. **Generated sites feel template-like, and often lack imagery.** Each site is
   built from scratch by Claude Code, but three constraint layers
   (`skills/atelier-design-system/SYSTEM.md`, the per-industry style guides, and
   `quality-checks.ts`) enforce a fixed spacing/type/motion scale and only **four**
   color tokens. These guarantee accessibility/performance but also produce visual
   sameness. Separately, the generation prompt currently says *"do not fetch
   external images… leave placeholders"*, so sites without captured photos ship
   image-less.

2. **Research misses obvious social media.** Discovery only uses website/social
   links that Google Maps already returns. Broodatelier Antwerpen has no Maps link,
   so its Instagram (`broodatelier.antwerpen`) — which is the top Google result for
   the business name — was never found, and its logo/photos/colors were missed.

3. **No way to iterate on a generated site.** After generation there is no admin
   affordance to tweak a site. `EDIT_MODE.md` already specifies the editor contract
   ("Task 4.5"), and the Sites tab has a disabled "Edit" button, but the pipeline
   was never wired up.

## Goals

- Research actively discovers a business's real online presence (website /
  Instagram / Facebook) even when Google Maps has no direct link.
- Every generated first version has real imagery wherever it can be sourced;
  tasteful CSS only as a true last resort.
- Generated sites are more visually distinctive per-business while keeping the
  accessibility / performance / responsive / SEO guarantees.
- Admin can edit a generated site from the Sites tab via a natural-language prompt
  plus optional uploaded images/video, which rebuilds and auto-redeploys.

## Non-goals

- No paid generative-AI image generation (explicit user decision — avoid per-image
  cost). Imagery comes from the business's own media or license-free sources.
- No change to the cloud-admin / local-worker split. Generation/edit stay local
  (Claude Code Max plan); admin stays in the cloud.
- No "preview-then-promote" review step for edits — edits auto-deploy to the same
  preview URL (user decision). Prior versions remain as rows for rollback.
- No expansion of the design-system token set in the first cut (see Phase B2 —
  deferred).

## Key facts confirmed in code

- **No DB migration required.** `generated_sites` already has `version`,
  `created_via ("initial_generation" | "prompt_edit")`, `prompt_used`.
  `brand_profiles` already has `photo_paths`, `logo_source`, `social_links`.
  `pipeline_jobs.pipeline_step` is free text; `enqueue()` and `claimNext(step)`
  already accept arbitrary steps. Lead statuses are stored as text (not a pg enum),
  so adding `"editing"`/`"edit_failed"` is a code-only change.
- The worker spawns the `claude` CLI via `runClaudeCode(prompt, { args, cwd,
  timeoutMs })` (`apps/local-worker/src/lib/claude-code.ts`). Generation passes
  `--dangerously-skip-permissions` and `cwd` = project path.
- Generation already copies local brand assets into the project
  (`copyBrandAssets`) and references them by web path. Fetching happens upstream in
  research; generation reads only local files. This boundary must be preserved.
- `EDIT_MODE.md` already documents the edit subprocess contract and ends with
  *"the pipeline will redeploy to the same Cloudflare Pages project and create a new
  version row."*

---

## Phase A — Research: social discovery + guaranteed imagery

### A1. Social discovery via local Claude CLI web search

Add a discovery step to the research flow. When a lead has no website/social from
Google Maps, or is missing Instagram/Facebook, spawn a focused `claude` subprocess
that web-searches `"{businessName} {city}"` and returns **strict JSON**:

```json
{ "website": "url|null", "instagram": "url|null", "facebook": "url|null",
  "confidence": "high|medium|low", "reasoning": "short" }
```

Each returned URL is **validated before use**: fetch it and confirm the page's
`og:title` / visible name actually matches the business (reuse existing
`fetchSocialOgImage` / og-scraping). Validated links are written to
`brand_profiles.social_links` and feed the existing branding + photo capture.

**Spike (first task):** verify `claude --print` can run WebSearch
non-interactively. If it cannot, fall back to Playwright-driven DuckDuckGo search
parsing. Do not build the rest of A1 until this is confirmed.

**Safety — prompt injection:** web pages returned by search are untrusted. The
subprocess output is consumed **only** as structured candidate URLs, each
re-validated against the known business name. No instruction text from any fetched
page is acted upon. A wrong/hostile guess simply fails validation and is dropped.

### A2. Guaranteed real imagery

After social discovery, existing branding/photo capture pulls logo (og:image),
colors, and photos from the discovered website/Instagram/Facebook, in addition to
Google Maps Place Photos. Then, **only if zero usable photos remain**, an optional
Claude-CLI-assisted sourcing step finds and downloads license-appropriate images
locally (into `data/assets/{leadId}/...`, recorded in `brand_profiles.photo_paths`).

All fetching stays in the **research** phase. Generation continues to read only
local files, preserving deterministic/offline builds and clean retries.

**Safety — copyright:** image sourcing is restricted to (1) the business's own
media (their site/Instagram/Facebook) and (2) explicitly license-free sources
(e.g. Pexels / Unsplash / Openverse). Arbitrary copyrighted web images are never
scraped. This constraint is encoded in the sourcing prompt and enforced by the
allowed-source list.

---

## Phase B — Generation: less template, always imagery

Keep the quality-enforcing rules (a11y / performance / responsive / SEO); break the
visual sameness.

### B1 (first cut, recommended)

- **Creative-direction step** in `generation-prompt.md`: before writing code,
  Claude must choose a distinctive concept + layout archetype for *this* business
  (from a small per-industry menu, e.g. editorial / full-bleed-imagery /
  warm-artisan), justify it from the brand profile + competitor learnings, and
  intentionally **differentiate** from the competitor rather than echo it.
- **Bolder use of brand color** via `color-mix()` derivatives of the existing four
  tokens (no new tokens yet).
- **Replace the placeholder rule**: §3.2 greenfield asset rule changes from "leave
  `<figure>` placeholders" to "**always use the real images provided in brand
  assets**"; CSS/gradient treatment is only the last resort when research truly
  found nothing.

### B2 (deferred — only if B1 is still too samey)

Expand the token system: a neutral color ramp + 1–2 additional brand/surface tokens
and 1–2 extra display type stops. This touches the `SYSTEM.md` + `tokens.css` +
`quality-checks.ts` "contract trio" together and requires re-validation, so it is
out of scope for the first cut.

---

## Phase C — Admin edit pipeline (wires up EDIT_MODE.md)

1. **Sites tab UI** — enable the existing disabled "Edit" button → an edit panel
   (client component; the rest of the tab stays a server component) with:
   - prompt textarea,
   - drag-drop uploader for images/video,
   - edit/version history from `generated_sites` rows (`version`, `prompt_used`,
     `created_via`, `created_at`).
2. **Asset upload → Supabase Storage** — admin uploads files to a private bucket
   (`edit-assets/{leadId}/{jobId}/...`). The job payload stores their object URLs.
3. **API route** `POST /api/leads/[id]/edit` →
   `enqueue(db, { step: "edit", leadId, payload: { prompt, assetUrls, baseVersion } })`.
4. **Worker processor `processEditJob`** (new `apps/local-worker/src/edit.ts`),
   mirroring generation but **editing in place (no dir wipe)**:
   - load the live project at `GENERATED_SITES_DIR/{slug}/`,
   - download Supabase assets into the project's `public/`,
   - feed `EDIT_MODE.md` + the edit prompt to `claude` with `cwd` = project path
     and `--dangerously-skip-permissions`,
   - run build + quality checks (reuse `runBuildAndChecks`),
   - on success: insert a new `generated_sites` row (`version+1`,
     `created_via:"prompt_edit"`, `prompt_used`), then enqueue a `deploy` job →
     same Cloudflare project → same preview URL,
   - one retry on failure with failure feedback, then `edit_failed`.
5. **Register the step** — add `"edit"` to `STEPS` in `index.ts` (high priority so
   operator edits are responsive) and to the processors map.
6. **Edge case** — if the local project dir is missing (machine cleaned, MAX_PATH
   cleanup, etc.), the edit job fails with a clear "regenerate first" message rather
   than silently rebuilding from scratch.
7. **Statuses** — add `"editing"` / `"edit_failed"` to `leadStatusValues`
   (code-only; statuses are text, no migration).

**Infra setup:** create a private Supabase Storage bucket; wire the Supabase
storage key into the admin (Firebase secret) and the worker (`.env`); add
`@supabase/supabase-js` (or use the storage REST API) on both sides.

**Safety:** the edit prompt is authored by the trusted operator via the admin UI —
not by web content. Uploaded files are the operator's own assets in the operator's
own private bucket; the worker downloading them is an operator-initiated action.
Claude treats uploaded file contents as data, not instructions.

---

## Sequencing

1. **Phase C** — most self-contained, immediately useful, zero migration.
2. **Phase A** — fixes the Broodatelier social/image gap.
3. **Phase B** — polish toward less-templatey output (B1 only; B2 deferred).

## Open risks

- **A1 spike:** `claude --print` WebSearch support is unverified. Mitigation:
  Playwright DuckDuckGo fallback.
- **Image sourcing quality/licensing:** mitigated by the allowed-source allowlist;
  worst case, fall back to CSS treatment.
- **Cloud→local asset transfer latency:** large video uploads to Supabase then
  re-download on the worker may be slow; acceptable for the operator-facing edit
  flow. Consider a size cap in the uploader.
