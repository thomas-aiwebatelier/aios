# Phase C — Admin "Edit a Generated Site" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin edit an already-generated client site from the Sites tab by submitting a natural-language prompt plus optional image/video uploads, which re-runs Claude Code in-place on the local project and auto-redeploys to the same Cloudflare preview URL.

**Architecture:** The cloud admin uploads assets to a private Supabase Storage bucket and enqueues an `edit` pipeline job (no DB migration — `generated_sites` already has `version`/`created_via:"prompt_edit"`/`prompt_used`, and `pipeline_jobs.pipeline_step` is free text). The local-worker gains an `edit` step processor that mirrors generation but edits the live project in place (no dir wipe), feeding `EDIT_MODE.md` to the `claude` CLI, then enqueues the existing `deploy` step. Asset files travel cloud→local via Supabase Storage download.

**Tech Stack:** TypeScript, pnpm workspaces, drizzle-orm (postgres-js + pglite for tests), vitest, Next.js 15 App Router, `@supabase/supabase-js`, the local `claude` CLI.

**Reference files (read before starting):**
- `skills/atelier-design-system/EDIT_MODE.md` — the edit-subprocess contract Claude must follow.
- `apps/local-worker/src/generation.ts` — the processor to mirror.
- `apps/local-worker/src/deploy.ts` — how deploy is enqueued + how it finds the project (`generated_sites.astroProjectPath`).
- `apps/local-worker/src/integration.test.ts` — the boundary-mock test template.
- `apps/local-worker/src/poll-loop.test.ts` — the unit-test template.
- `apps/admin/app/api/leads/[id]/approve/route.ts` — the API-route + `enqueue` pattern to mirror.
- `apps/admin/app/api/__tests__/workers.test.ts` — the `@/lib/db` mock pattern for route tests.

**Conventions to follow:**
- Worker imports use explicit `.js` extensions (e.g. `from "./lib/queue.js"`).
- Run worker tests: `pnpm --filter local-worker test`. Single file: `pnpm --filter local-worker exec vitest run src/<file>.test.ts`. By name: append `-t "<title>"`.
- Run admin tests: `pnpm --filter admin test`. Single file: `pnpm --filter admin exec vitest run app/api/__tests__/<file>.test.ts`.
- Typecheck: `pnpm --filter local-worker typecheck` / `pnpm --filter admin typecheck`.
- Commit after every task. Stage only the files the task touched (the repo has unrelated in-progress changes — never `git add -A`).

**Payload contract (the seam between admin and worker):**
```ts
// pipeline_jobs.payload for step "edit"
{ leadId: string; prompt: string; assetKeys: string[]; baseVersion: number; editId: string }
// assetKeys are Supabase Storage object keys in the "edit-assets" bucket,
// shaped "<leadId>/<editId>/<filename>".
```

---

## Task 0: Infra + dependencies (Supabase Storage)

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/local-worker/package.json`
- Modify: `.env` (gitignored — manual, do NOT commit)
- Modify: `apphosting.yaml`

This task is mostly manual setup; it has no automated test. Verify with the typecheck/install at the end.

- [ ] **Step 1: Create the Supabase Storage bucket (manual, one-time)**

In the Supabase dashboard for project `owooqqxnuluddvizkrzt` → Storage → New bucket:
- Name: `edit-assets`
- Public: **OFF** (private). The worker downloads with the service-role key.

- [ ] **Step 2: Add Supabase env vars to `.env` (manual, do NOT commit)**

Append to `C:\Users\ThomasCortebeeck\aiwebatelier\.env`:
```
SUPABASE_URL=https://owooqqxnuluddvizkrzt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<the sb_secret_… service role key>
```
(The service-role key is the `sb_secret_…` value already on file. Keep it only in `.env` and Cloud Secret Manager — never in git.)

- [ ] **Step 3: Create the Cloud Secret Manager secret for the admin (manual)**

```bash
printf '%s' 'https://owooqqxnuluddvizkrzt.supabase.co' | gcloud secrets create supabase-url --data-file=- --project=aiwebatelier-spine
printf '%s' '<service-role-key>' | gcloud secrets create supabase-service-role-key --data-file=- --project=aiwebatelier-spine
```
(If the secrets already exist, use `gcloud secrets versions add <name> --data-file=-` instead.)

- [ ] **Step 4: Reference the secrets in `apphosting.yaml`**

Add under the "Secret env vars" section (after the `WORKER_AUTH_SECRET` block):
```yaml
  - variable: SUPABASE_URL
    secret: supabase-url
    availability:
      - RUNTIME

  - variable: SUPABASE_SERVICE_ROLE_KEY
    secret: supabase-service-role-key
    availability:
      - RUNTIME
```

- [ ] **Step 5: Add the dependency to both packages**

In `apps/admin/package.json` dependencies add:
```json
"@supabase/supabase-js": "^2.45.0",
```
In `apps/local-worker/package.json` dependencies add:
```json
"@supabase/supabase-js": "^2.45.0",
```

- [ ] **Step 6: Install**

Run: `pnpm install`
Expected: completes without error; `@supabase/supabase-js` resolves in both packages.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/package.json apps/local-worker/package.json apphosting.yaml pnpm-lock.yaml
git commit -m "chore: add Supabase Storage deps + secrets for edit-asset upload"
```

---

## Task 1: Add `editing` / `edit_failed` lead statuses

No DB migration: `leads.status` is a text column; statuses are an app-side union.

**Files:**
- Modify: `packages/db/src/schema.ts:31-45`
- Test: `packages/db/tests/lead-status.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `packages/db/tests/lead-status.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { leadStatusValues } from "../src/schema.js";

describe("leadStatusValues", () => {
  it("includes the edit lifecycle statuses", () => {
    expect(leadStatusValues).toContain("editing");
    expect(leadStatusValues).toContain("edit_failed");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @atelier/db exec vitest run tests/lead-status.test.ts`
Expected: FAIL — `editing`/`edit_failed` not present.

- [ ] **Step 3: Add the values**

In `packages/db/src/schema.ts`, edit the `leadStatusValues` array to insert the two new statuses after `"deployed"`:
```ts
export const leadStatusValues = [
  "discovered",
  "researching",
  "awaiting_approval",
  "approved",
  "generating",
  "generated",
  "generation_failed",
  "deployed",
  "editing",
  "edit_failed",
  "email_drafted",
  "email_sent",
  "accepted",
  "declined",
  "archived",
] as const;
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @atelier/db exec vitest run tests/lead-status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src/schema.ts packages/db/tests/lead-status.test.ts
git commit -m "feat(db): add editing/edit_failed lead statuses"
```

---

## Task 2: Worker — Supabase Storage download helper

Isolates Supabase access so the processor test can mock this module (mirrors how `lib/cloudflare.js` is mocked).

**Files:**
- Create: `apps/local-worker/src/lib/edit-assets.ts`
- Test: `apps/local-worker/src/lib/edit-assets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/local-worker/src/lib/edit-assets.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const downloadMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    storage: { from: () => ({ download: downloadMock }) },
  }),
}));

import { downloadEditAssets } from "./edit-assets.js";

describe("downloadEditAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  });

  it("downloads each key into destDir and returns web paths", async () => {
    downloadMock.mockResolvedValue({
      data: new Blob([Buffer.from("PNGDATA")]),
      error: null,
    });
    const destDir = mkdtempSync(path.join(tmpdir(), "edit-assets-"));

    const webPaths = await downloadEditAssets(
      ["lead1/edit1/hero.png", "lead1/edit1/clip.mp4"],
      destDir,
    );

    expect(webPaths).toEqual(["/uploads/hero.png", "/uploads/clip.mp4"]);
    expect(existsSync(path.join(destDir, "hero.png"))).toBe(true);
    expect(readFileSync(path.join(destDir, "hero.png")).toString()).toBe("PNGDATA");
  });

  it("returns [] for an empty key list and does not call storage", async () => {
    const destDir = mkdtempSync(path.join(tmpdir(), "edit-assets-"));
    const webPaths = await downloadEditAssets([], destDir);
    expect(webPaths).toEqual([]);
    expect(downloadMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter local-worker exec vitest run src/lib/edit-assets.test.ts`
Expected: FAIL — `./edit-assets.js` not found / `downloadEditAssets` undefined.

- [ ] **Step 3: Implement the helper**

Create `apps/local-worker/src/lib/edit-assets.ts`:
```ts
/**
 * edit-assets.ts — download operator-uploaded edit assets from the private
 * Supabase Storage "edit-assets" bucket onto the local project's public/
 * folder so the claude CLI edit subprocess can reference them.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "edit-assets";

/**
 * Download each storage object key into destDir. Returns the site-relative
 * web paths (e.g. "/uploads/hero.png") to feed into the edit prompt.
 * destDir is expected to be "<project>/public/uploads".
 */
export async function downloadEditAssets(
  keys: string[],
  destDir: string,
): Promise<string[]> {
  if (keys.length === 0) return [];

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "downloadEditAssets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set",
    );
  }

  const supa = createClient(url, key);
  mkdirSync(destDir, { recursive: true });

  const webPaths: string[] = [];
  for (const objectKey of keys) {
    const { data, error } = await supa.storage.from(BUCKET).download(objectKey);
    if (error || !data) {
      throw new Error(`downloadEditAssets: failed to download ${objectKey}: ${error?.message}`);
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const base = path.basename(objectKey);
    writeFileSync(path.join(destDir, base), buf);
    webPaths.push(`/uploads/${base}`);
  }
  return webPaths;
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter local-worker exec vitest run src/lib/edit-assets.test.ts`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add apps/local-worker/src/lib/edit-assets.ts apps/local-worker/src/lib/edit-assets.test.ts
git commit -m "feat(local-worker): Supabase Storage edit-asset download helper"
```

---

## Task 3: Worker — export reusable helpers from `generation.ts`

`edit.ts` reuses `loadContext`, `runBuildAndChecks`, `BuildStepError`, `getNextVersion`, `readSkillFile`, and the `GenerationContext` type. Currently they are module-private. Export them (no behavior change).

**Files:**
- Modify: `apps/local-worker/src/generation.ts`

- [ ] **Step 1: Add `export` to the shared declarations**

In `apps/local-worker/src/generation.ts`, add the `export` keyword to these existing declarations (do not change their bodies):
- `interface GenerationContext` (line ~54) → `export interface GenerationContext`
- `async function loadContext` (line ~70) → `export async function loadContext`
- `function readSkillFile` (line ~183) → `export function readSkillFile`
- `class BuildStepError` (line ~307) → `export class BuildStepError`
- `async function runBuildAndChecks` (line ~319) → `export async function runBuildAndChecks`
- `async function getNextVersion` (line ~383) → `export async function getNextVersion`

- [ ] **Step 2: Typecheck + confirm existing tests still pass**

Run: `pnpm --filter local-worker typecheck`
Expected: no errors.
Run: `pnpm --filter local-worker exec vitest run src/integration.test.ts`
Expected: PASS (generation path unchanged).

- [ ] **Step 3: Commit**

```bash
git add apps/local-worker/src/generation.ts
git commit -m "refactor(local-worker): export generation helpers for reuse by edit"
```

---

## Task 4: Worker — build the EDIT prompt bundle

**Files:**
- Create: `apps/local-worker/src/edit-prompt.ts`
- Test: `apps/local-worker/src/edit-prompt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/local-worker/src/edit-prompt.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildEditPromptBundle } from "./edit-prompt.js";
import type { GenerationContext } from "./generation.js";

const ctx: GenerationContext = {
  lead: {
    id: "lead1",
    slug: "test-slug",
    businessName: "Test Bakkerij",
    city: "Antwerpen",
    industryKey: "bakery-restaurant",
    language: "nl",
    existingWebsiteUrl: null,
  },
  brandProfile: { primaryColor: "#f8a940" },
  siteInventory: null,
  competitor: null,
};

describe("buildEditPromptBundle", () => {
  it("includes the EDIT_MODE contract, the prompt, and asset paths", () => {
    const bundle = buildEditPromptBundle(ctx, "Make the hero bigger", ["/uploads/new-hero.jpg"]);
    // EDIT_MODE.md content marker:
    expect(bundle).toContain("EDIT_MODE");
    expect(bundle).toContain("Make the hero bigger");
    expect(bundle).toContain("/uploads/new-hero.jpg");
    expect(bundle).toContain("Test Bakkerij");
  });

  it("appends failure feedback when provided", () => {
    const bundle = buildEditPromptBundle(ctx, "edit", [], "astro build failed: X");
    expect(bundle).toContain("Previous Attempt Failure");
    expect(bundle).toContain("astro build failed: X");
  });

  it("states no new assets when the asset list is empty", () => {
    const bundle = buildEditPromptBundle(ctx, "edit", []);
    expect(bundle).toContain("No new assets were uploaded");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter local-worker exec vitest run src/edit-prompt.test.ts`
Expected: FAIL — `./edit-prompt.js` not found.

- [ ] **Step 3: Implement the builder**

Create `apps/local-worker/src/edit-prompt.ts`:
```ts
/**
 * edit-prompt.ts — compose the stdin bundle for an edit subprocess.
 *
 * Reuses readSkillFile from generation.ts to load EDIT_MODE.md (the editor
 * contract) and appends the lead/brand context, the operator's edit prompt,
 * the uploaded asset paths, and optional failure feedback for a retry.
 */

import {
  readSkillFile,
  type GenerationContext,
} from "./generation.js";

export function buildEditPromptBundle(
  ctx: GenerationContext,
  editPrompt: string,
  assetWebPaths: string[],
  failureFeedback?: string,
): string {
  const { lead, brandProfile } = ctx;
  const editMode = readSkillFile("skills/atelier-design-system/EDIT_MODE.md");

  const lines: string[] = [
    `# Edit Existing Site — ${lead.businessName}`,
    "",
    "You are editing the existing Astro project in the current working directory.",
    "Follow the EDIT_MODE contract below exactly. Work the minimum diff.",
    "",
    "---",
    "",
    "## EDIT_MODE Contract",
    "",
    editMode,
    "",
    "---",
    "",
    "## Lead (context only — do NOT regenerate copy)",
    "",
    "```json",
    JSON.stringify(lead, null, 2),
    "```",
    "",
    "## Brand Profile (context only — do NOT re-derive tokens)",
    "",
    "```json",
    JSON.stringify(brandProfile, null, 2),
    "```",
    "",
    "---",
    "",
    "## Requested Edit",
    "",
    editPrompt,
    "",
    "## Newly Uploaded Assets",
    "",
    ...(assetWebPaths.length > 0
      ? [
          "The operator uploaded these files; they are already in the project's public/uploads/ folder. Reference them by these absolute paths where the edit calls for them:",
          ...assetWebPaths.map((p) => `- ${p}`),
        ]
      : ["No new assets were uploaded with this edit."]),
    "",
  ];

  if (failureFeedback) {
    lines.push(
      "---",
      "",
      "## Previous Attempt Failure",
      "",
      `Your previous attempt failed:\n\n${failureFeedback}\n\nFix only the cause of this failure. Do not refactor unrelated code.`,
      "",
    );
  }

  lines.push(
    "---",
    "",
    "## Output Instruction",
    "",
    "Apply the requested edit to the existing project, ensure `astro build` passes, then exit.",
    "",
  );

  return lines.join("\n");
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter local-worker exec vitest run src/edit-prompt.test.ts`
Expected: PASS (all three cases). The `EDIT_MODE` marker comes from the real `EDIT_MODE.md` heading `# EDIT_MODE — AI Web Atelier Site Editor`.

- [ ] **Step 5: Commit**

```bash
git add apps/local-worker/src/edit-prompt.ts apps/local-worker/src/edit-prompt.test.ts
git commit -m "feat(local-worker): EDIT_MODE prompt bundle builder"
```

---

## Task 5: Worker — `processEditJob` processor

Mirrors `processGenerationJob` but edits in place (no `resetProjectDir`), downloads assets, feeds the EDIT bundle, inserts a `prompt_edit` version, and enqueues deploy.

**Files:**
- Create: `apps/local-worker/src/edit.ts`
- Test: `apps/local-worker/src/edit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/local-worker/src/edit.test.ts`:
```ts
/**
 * edit.test.ts — processEditJob against pglite with mocked boundaries
 * (claude CLI, pnpm/astro subprocess, quality-checks, asset download,
 * project path). Mirrors integration.test.ts conventions.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getTestDb, leads, generatedSites, pipelineJobs } from "@atelier/db";

// A real temp dir that looks like a built Astro project (has package.json).
const projectDir = mkdtempSync(path.join(tmpdir(), "edit-proj-"));
writeFileSync(path.join(projectDir, "package.json"), '{"name":"test-slug"}');

vi.mock("node:child_process", () => ({
  execSync: vi.fn().mockReturnValue(Buffer.from("ok")),
}));
vi.mock("./lib/claude-code.js", () => ({
  runClaudeCode: vi.fn().mockResolvedValue("edited"),
}));
vi.mock("../../../skills/atelier-design-system/quality-checks.js", () => ({
  runQualityChecks: vi.fn().mockResolvedValue({ ok: true, failures: [], details: {} }),
}));
vi.mock("./lib/edit-assets.js", () => ({
  downloadEditAssets: vi.fn().mockResolvedValue([]),
}));

import { processEditJob } from "./edit.js";
import * as fsMod from "./lib/generated-sites-fs.js";

async function seedLeadWithSite(db: Awaited<ReturnType<typeof getTestDb>>) {
  const leadId = nanoid();
  await db.insert(leads).values({
    id: leadId, slug: "test-slug", status: "deployed",
    businessName: "Test Bakkerij", city: "Antwerpen",
    industryKey: "bakery-restaurant", language: "nl",
  });
  await db.insert(generatedSites).values({
    id: nanoid(), leadId, version: 1,
    astroProjectPath: projectDir, createdVia: "initial_generation",
  });
  return leadId;
}

describe("processEditJob", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;
  beforeEach(async () => {
    db = await getTestDb();
    vi.clearAllMocks();
    vi.spyOn(fsMod, "getProjectPath").mockReturnValue(projectDir);
  });

  it("edits in place, inserts a prompt_edit version, enqueues deploy", async () => {
    const leadId = await seedLeadWithSite(db);
    await processEditJob(db, {
      id: nanoid(),
      leadId,
      payload: { leadId, prompt: "Make hero bigger", assetKeys: [], baseVersion: 1, editId: "e1" },
    });

    const sites = await db.select().from(generatedSites)
      .where(eq(generatedSites.leadId, leadId)).orderBy(generatedSites.version);
    expect(sites).toHaveLength(2);
    expect(sites[1].version).toBe(2);
    expect(sites[1].createdVia).toBe("prompt_edit");
    expect(sites[1].promptUsed).toBe("Make hero bigger");

    const deploys = await db.select().from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "deploy"));
    expect(deploys).toHaveLength(1);
    expect((deploys[0].payload as Record<string, unknown>).generatedSiteId).toBe(sites[1].id);
  });

  it("fails with a clear error when the local project dir is missing", async () => {
    const leadId = await seedLeadWithSite(db);
    const missing = path.join(tmpdir(), "does-not-exist-" + nanoid());
    vi.spyOn(fsMod, "getProjectPath").mockReturnValue(missing);

    await expect(
      processEditJob(db, {
        id: nanoid(), leadId,
        payload: { leadId, prompt: "x", assetKeys: [], baseVersion: 1, editId: "e2" },
      }),
    ).rejects.toThrow(/regenerate/i);

    const lead = ((await db.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead.status).toBe("edit_failed");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter local-worker exec vitest run src/edit.test.ts`
Expected: FAIL — `./edit.js` not found.

- [ ] **Step 3: Implement the processor**

Create `apps/local-worker/src/edit.ts`:
```ts
/**
 * edit.ts — Pipeline Step "edit": apply an operator-authored change to an
 * already-generated site, in place, then redeploy.
 *
 * Unlike generation.ts this does NOT wipe the project dir — it edits the live
 * project at GENERATED_SITES_DIR/{slug}/. On success it inserts a new
 * generated_sites row (version+1, created_via "prompt_edit") and enqueues the
 * existing deploy step, which redeploys to the same Cloudflare project (same
 * preview URL) per EDIT_MODE.md.
 *
 * The poll-loop marks the job succeeded/failed; this processor throws only on
 * final-attempt failure (mirrors generation.ts).
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { leads, generatedSites } from "@atelier/db";
import type { Db } from "@atelier/db";
import { heartbeat, enqueue } from "./lib/queue.js";
import { runClaudeCode } from "./lib/claude-code.js";
import { logger } from "./logger.js";
import { getProjectPath } from "./lib/generated-sites-fs.js";
import { downloadEditAssets } from "./lib/edit-assets.js";
import { buildEditPromptBundle } from "./edit-prompt.js";
import {
  loadContext,
  runBuildAndChecks,
  BuildStepError,
  getNextVersion,
} from "./generation.js";

export interface EditJob {
  id: string;
  payload: unknown;
  leadId: string | null;
}

interface EditPayload {
  leadId: string;
  prompt: string;
  assetKeys: string[];
  baseVersion: number;
  editId: string;
}

export async function processEditJob(db: Db, job: EditJob): Promise<void> {
  const payload = job.payload as EditPayload;
  const { leadId, prompt, assetKeys } = payload;

  const hbInterval = setInterval(async () => {
    try {
      await heartbeat(db, job.id);
    } catch (err) {
      logger.warn("heartbeat_failed", { error: String(err) });
    }
  }, 30_000);

  try {
    logger.info("edit_start", { jobId: job.id, leadId });

    const ctx = await loadContext(db, leadId);
    const projectPath = getProjectPath(ctx.lead.slug);

    // The edit operates on the live project. If it isn't on disk (machine
    // cleaned, MAX_PATH cleanup, etc.), fail loudly rather than rebuild.
    if (!existsSync(projectPath) || !existsSync(path.join(projectPath, "package.json"))) {
      await db.update(leads).set({ status: "edit_failed" }).where(eq(leads.id, leadId));
      throw new Error(
        `[edit] no local project at ${projectPath} for lead ${leadId} — regenerate the site first`,
      );
    }

    await db.update(leads).set({ status: "editing" }).where(eq(leads.id, leadId));

    // Download uploaded assets into public/uploads/.
    const assetWebPaths = await downloadEditAssets(
      assetKeys ?? [],
      path.join(projectPath, "public", "uploads"),
    );
    logger.info("edit_assets_downloaded", { count: assetWebPaths.length });

    const version = await getNextVersion(db, leadId);
    let lastFailure: string | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      logger.info("edit_attempt", { attempt, of: 2, slug: ctx.lead.slug });

      const bundle = buildEditPromptBundle(
        ctx,
        prompt,
        assetWebPaths,
        lastFailure ?? undefined,
      );

      await runClaudeCode(bundle, {
        args: ["--dangerously-skip-permissions"],
        cwd: projectPath,
        timeoutMs: 30 * 60 * 1000,
      });

      try {
        await runBuildAndChecks(projectPath);

        const siteId = nanoid();
        await db.insert(generatedSites).values({
          id: siteId,
          leadId,
          version,
          astroProjectPath: projectPath,
          createdVia: "prompt_edit",
          promptUsed: prompt,
        });

        await db.update(leads).set({ status: "generated" }).where(eq(leads.id, leadId));

        await enqueue(db, {
          leadId,
          step: "deploy",
          payload: { leadId, generatedSiteId: siteId },
        });

        logger.info("edit_done", { slug: ctx.lead.slug, siteId, version });
        return;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const errOutput = err instanceof BuildStepError ? err.output : "";
        lastFailure = `(attempt ${attempt}) ${errMsg}\n${errOutput}`.slice(0, 4000);
        logger.warn("edit_attempt_failed", {
          attempt,
          slug: ctx.lead.slug,
          error: errMsg,
          step: err instanceof BuildStepError ? err.step : "unknown",
        });

        if (attempt === 2) {
          await db.update(leads).set({ status: "edit_failed" }).where(eq(leads.id, leadId));
          logger.error("edit_final_failure", { slug: ctx.lead.slug, leadId });
          throw err;
        }
      }
    }
  } finally {
    clearInterval(hbInterval);
  }
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter local-worker exec vitest run src/edit.test.ts`
Expected: PASS (both cases). Note the happy-path sets lead status to `generated`; the subsequent deploy job (not run in this test) flips it to `deployed`.

- [ ] **Step 5: Commit**

```bash
git add apps/local-worker/src/edit.ts apps/local-worker/src/edit.test.ts
git commit -m "feat(local-worker): processEditJob — in-place edit + redeploy"
```

---

## Task 6: Worker — register the `edit` step

**Files:**
- Modify: `apps/local-worker/src/index.ts:37` (imports) and `:96` (STEPS) and `:192-196` (processors)
- Test: `apps/local-worker/src/poll-loop.test.ts` (add one case)

- [ ] **Step 1: Add a failing dispatch test**

Append this case inside the `describe("pollOnce", …)` block in `apps/local-worker/src/poll-loop.test.ts`:
```ts
  it("claims an edit job and dispatches to the edit processor", async () => {
    const jobId = await enqueueJob(db, "edit", { leadId: "l1", prompt: "x" });
    const editProc: Processor = vi.fn().mockResolvedValue(undefined);

    await pollOnce(db, {
      steps: ["edit", "generate", "deploy"],
      workerName: "test",
      processors: { edit: editProc, generate: vi.fn(), deploy: vi.fn() },
    });

    expect(editProc).toHaveBeenCalledOnce();
    const row = ((await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId))))[0];
    expect(row.status).toBe("succeeded");
  });
```

- [ ] **Step 2: Run it (should already pass — poll-loop is generic)**

Run: `pnpm --filter local-worker exec vitest run src/poll-loop.test.ts -t "edit job"`
Expected: PASS. (This guards against future regressions in step dispatch; poll-loop already dispatches by map key.)

- [ ] **Step 3: Wire the processor into the entrypoint**

In `apps/local-worker/src/index.ts`:

Add the import alongside the other processor imports (near line 37):
```ts
import { processEditJob } from "./edit.js";
```

Change the STEPS constant (line ~96) so `edit` is first (operator edits preempt the pipeline):
```ts
const STEPS = ["edit", "research", "generation", "deploy"];
```

Add `edit` to the processors map passed to `startPollLoop` (lines ~192-196):
```ts
  processors: {
    edit: processEditJob,
    research: processResearchJob,
    generation: processGenerationJob,
    deploy: processDeployJob,
  },
```

- [ ] **Step 4: Typecheck + full worker test run**

Run: `pnpm --filter local-worker typecheck`
Expected: no errors.
Run: `pnpm --filter local-worker test`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/local-worker/src/index.ts apps/local-worker/src/poll-loop.test.ts
git commit -m "feat(local-worker): register edit step (highest priority)"
```

---

## Task 7: Admin — Supabase Storage upload helper

**Files:**
- Create: `apps/admin/lib/edit-assets-storage.ts`
- Test: `apps/admin/lib/edit-assets-storage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/lib/edit-assets-storage.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

const uploadMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: { from: () => ({ upload: uploadMock }) } }),
}));

import { uploadEditAsset, EDIT_ASSETS_BUCKET } from "./edit-assets-storage.js";

describe("uploadEditAsset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
  });

  it("uploads to the edit-assets bucket at the given key", async () => {
    uploadMock.mockResolvedValue({ data: { path: "lead1/e1/a.png" }, error: null });
    await uploadEditAsset("lead1/e1/a.png", Buffer.from("x"), "image/png");
    expect(EDIT_ASSETS_BUCKET).toBe("edit-assets");
    expect(uploadMock).toHaveBeenCalledWith(
      "lead1/e1/a.png",
      expect.anything(),
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    );
  });

  it("throws when storage returns an error", async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(uploadEditAsset("k", Buffer.from("x"), "image/png")).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter admin exec vitest run lib/edit-assets-storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `apps/admin/lib/edit-assets-storage.ts`:
```ts
/**
 * edit-assets-storage.ts — server-only helper to upload operator-provided
 * edit assets to the private Supabase Storage "edit-assets" bucket using the
 * service-role key. The worker later downloads them by object key.
 */
import { createClient } from "@supabase/supabase-js";

export const EDIT_ASSETS_BUCKET = "edit-assets";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("uploadEditAsset: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  return createClient(url, key);
}

export async function uploadEditAsset(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const { error } = await client()
    .storage.from(EDIT_ASSETS_BUCKET)
    .upload(key, body, { contentType, upsert: true });
  if (error) {
    throw new Error(`uploadEditAsset: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter admin exec vitest run lib/edit-assets-storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/lib/edit-assets-storage.ts apps/admin/lib/edit-assets-storage.test.ts
git commit -m "feat(admin): Supabase Storage edit-asset upload helper"
```

---

## Task 8: Admin — `POST /api/leads/[id]/edit` route

**Files:**
- Create: `apps/admin/app/api/leads/[id]/edit/route.ts`
- Test: `apps/admin/app/api/leads/[id]/edit/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/app/api/leads/[id]/edit/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getTestDb, leads, generatedSites, pipelineJobs } from "@atelier/db";

let currentDb: Awaited<ReturnType<typeof getTestDb>>;
vi.mock("@/lib/db", () => ({ getDb: () => currentDb }));
vi.mock("@/lib/edit-assets-storage", () => ({
  EDIT_ASSETS_BUCKET: "edit-assets",
  uploadEditAsset: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from "./route.js";
import { uploadEditAsset } from "@/lib/edit-assets-storage";

async function seed() {
  const leadId = nanoid();
  await currentDb.insert(leads).values({
    id: leadId, slug: "test-slug", status: "deployed",
    businessName: "Test Bakkerij", city: "Antwerpen",
    industryKey: "bakery-restaurant", language: "nl",
  });
  await currentDb.insert(generatedSites).values({
    id: nanoid(), leadId, version: 1,
    astroProjectPath: "C:/atl/test-slug", createdVia: "initial_generation",
  });
  return leadId;
}

describe("POST /api/leads/[id]/edit", () => {
  beforeEach(async () => {
    currentDb = await getTestDb();
    vi.clearAllMocks();
  });

  it("enqueues an edit job with the prompt + uploads files, flips lead to editing", async () => {
    const leadId = await seed();
    const fd = new FormData();
    fd.set("prompt", "Make the hero bigger");
    fd.set("files", new File([Buffer.from("PNG")], "hero.png", { type: "image/png" }));

    const req = new Request("http://x/api/leads/x/edit", { method: "POST", body: fd });
    const res = await POST(req, { params: Promise.resolve({ id: leadId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(uploadEditAsset).toHaveBeenCalledOnce();

    const jobs = await currentDb.select().from(pipelineJobs)
      .where(eq(pipelineJobs.pipelineStep, "edit"));
    expect(jobs).toHaveLength(1);
    const p = jobs[0].payload as Record<string, unknown>;
    expect(p.prompt).toBe("Make the hero bigger");
    expect((p.assetKeys as string[])[0]).toMatch(/hero\.png$/);
    expect(p.baseVersion).toBe(1);

    const lead = ((await currentDb.select().from(leads).where(eq(leads.id, leadId))))[0];
    expect(lead.status).toBe("editing");
  });

  it("400s when prompt is empty", async () => {
    const leadId = await seed();
    const fd = new FormData();
    fd.set("prompt", "   ");
    const res = await POST(new Request("http://x", { method: "POST", body: fd }), {
      params: Promise.resolve({ id: leadId }),
    });
    expect(res.status).toBe(400);
  });

  it("409s when the lead has no generated site", async () => {
    const leadId = nanoid();
    await currentDb.insert(leads).values({
      id: leadId, slug: "no-site", status: "approved",
      businessName: "X", city: "Y", industryKey: "bakery-restaurant", language: "nl",
    });
    const fd = new FormData();
    fd.set("prompt", "edit");
    const res = await POST(new Request("http://x", { method: "POST", body: fd }), {
      params: Promise.resolve({ id: leadId }),
    });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter admin exec vitest run app/api/leads/[id]/edit/route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement the route**

Create `apps/admin/app/api/leads/[id]/edit/route.ts`:
```ts
import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { leads, generatedSites } from "@atelier/db";
import { enqueue } from "@/lib/queue";
import { uploadEditAsset } from "@/lib/edit-assets-storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();

  const lead = ((await db.select().from(leads).where(eq(leads.id, id))))[0];
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const form = await req.formData();
  const prompt = String(form.get("prompt") ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Must have an existing generated site to edit.
  const latestSite = ((await db
    .select({ version: generatedSites.version })
    .from(generatedSites)
    .where(eq(generatedSites.leadId, id))
    .orderBy(desc(generatedSites.version))
    .limit(1)
    ))[0];
  if (!latestSite) {
    return NextResponse.json(
      { error: "No generated site to edit — generate it first" },
      { status: 409 },
    );
  }

  // Upload any attached files to Supabase Storage under <leadId>/<editId>/.
  const editId = nanoid();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const assetKeys: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${id}/${editId}/${safeName}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await uploadEditAsset(key, buf, file.type || "application/octet-stream");
    assetKeys.push(key);
  }

  const jobId = await enqueue(db, {
    leadId: id,
    step: "edit",
    payload: { leadId: id, prompt, assetKeys, baseVersion: latestSite.version, editId },
  });

  await db
    .update(leads)
    .set({ status: "editing", updatedAt: new Date() })
    .where(eq(leads.id, id));

  return NextResponse.json({ ok: true, jobId });
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter admin exec vitest run app/api/leads/[id]/edit/route.test.ts`
Expected: PASS (all three cases).

- [ ] **Step 5: Commit**

```bash
git add "apps/admin/app/api/leads/[id]/edit/route.ts" "apps/admin/app/api/leads/[id]/edit/route.test.ts"
git commit -m "feat(admin): POST /api/leads/[id]/edit — upload assets + enqueue edit job"
```

---

## Task 9: Admin — Sites tab Edit UI

Replace the disabled "Edit" button with a working client-component dialog. No automated test (UI) — verified by build + manual test in Task 10.

**Files:**
- Create: `apps/admin/app/(admin)/sites/_components/EditSiteButton.tsx`
- Modify: `apps/admin/app/(admin)/sites/page.tsx` (import + badge config + button swap + status list)

- [ ] **Step 1: Create the client component**

Create `apps/admin/app/(admin)/sites/_components/EditSiteButton.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EditSiteButton({
  leadId,
  hasSite,
}: {
  leadId: string;
  hasSite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasSite) {
    return <span className="text-stone-300 text-xs">—</span>;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("prompt", prompt);
      if (files) {
        for (const f of Array.from(files)) fd.append("files", f);
      }
      const res = await fetch(`/api/leads/${leadId}/edit`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      setOpen(false);
      setPrompt("");
      setFiles(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2"
      >
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold text-stone-900">Edit site</h2>
            <p className="text-sm text-stone-500">
              Describe the change. Optionally attach images or video to use. The site
              rebuilds and redeploys to the same preview URL.
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="e.g. Make the hero image full-width and add a testimonials section after Diensten."
              className="w-full border border-stone-300 rounded p-2 text-sm"
            />
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full text-sm text-stone-600"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting || prompt.trim().length === 0}
                className="px-3 py-1.5 text-sm rounded bg-stone-900 text-white disabled:opacity-40"
              >
                {submitting ? "Applying…" : "Apply edit & redeploy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Wire it into the Sites page**

In `apps/admin/app/(admin)/sites/page.tsx`:

Add the import at the top (after the existing imports):
```tsx
import { EditSiteButton } from "./_components/EditSiteButton";
```

Add two badge entries to `STATUS_BADGE` (after the `deployed` entry):
```tsx
  editing: {
    label: "Editing…",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  edit_failed: {
    label: "Edit failed",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
```

Add the two statuses to `PIPELINE_STATUSES` (so editing/edit_failed leads still show):
```tsx
  const PIPELINE_STATUSES = [
    "approved",
    "generating",
    "generated",
    "generation_failed",
    "deployed",
    "editing",
    "edit_failed",
  ] as const;
```

Replace the disabled `<button … title="Coming in Task 4.5">Edit</button>` (lines ~215-221) with:
```tsx
                        <EditSiteButton leadId={lead.id} hasSite={!!site} />
```

- [ ] **Step 3: Typecheck + build the admin**

Run: `pnpm --filter admin typecheck`
Expected: no errors.
Run: `pnpm --filter admin build`
Expected: build succeeds (the new client component compiles).

- [ ] **Step 4: Commit**

```bash
git add "apps/admin/app/(admin)/sites/page.tsx" "apps/admin/app/(admin)/sites/_components/EditSiteButton.tsx"
git commit -m "feat(admin): enable Sites-tab Edit dialog (prompt + asset upload)"
```

---

## Task 10: End-to-end manual verification

No code; confirms the wired system works against the real services. Run with the local-worker running and the admin reachable.

- [ ] **Step 1: Restart the local-worker so it loads the new `edit` step + Supabase env**

Run (from repo root, with the worker stopped): `pnpm --filter local-worker start`
Expected boot log includes the new STEPS and `generatedSitesDir: C:\atl`. Confirm no `SUPABASE_URL` warnings.

- [ ] **Step 2: Pick a deployed lead and submit an edit**

In the admin Sites tab, click **Edit** on a lead whose status is `generated`/`deployed`. Enter a small, verifiable prompt (e.g. "Change the hero headline to 'Vers brood, elke dag'"). Optionally attach one image. Click **Apply edit & redeploy**.
Expected: the row flips to `Editing…`.

- [ ] **Step 3: Watch the worker process it**

Expected worker logs in order: `poll_claimed step=edit`, `edit_start`, `edit_assets_downloaded`, `edit_attempt`, `edit_done`, then `poll_claimed step=deploy`, `deploy_done`.

- [ ] **Step 4: Verify the result**

- The Sites row shows a new version (`v2`) and status `Deployed`.
- Opening the Preview URL shows the requested change live (same URL as before).
- A new `generated_sites` row exists with `created_via = 'prompt_edit'` and `prompt_used` set.
- If an asset was attached, it is present at `C:\atl\<slug>\public\uploads\` and referenced where appropriate.

- [ ] **Step 5: Verify the failure path (optional)**

Temporarily rename `C:\atl\<slug>\` and submit an edit. Expected: the lead flips to `Edit failed`, the worker logs `edit` failing with a "regenerate the site first" message, and the job row is `failed`.

---

## Self-Review (completed during plan authoring)

- **Spec coverage (Phase C):** Sites-tab Edit UI → Task 9; Supabase upload → Tasks 0/7/8; `POST /edit` route + enqueue → Task 8; `processEditJob` in-place edit + deploy → Tasks 3/4/5; register `edit` step (high priority) → Task 6; missing-dir edge case → Task 5 (test + impl); `editing`/`edit_failed` statuses → Task 1; auto-redeploy to same URL → Task 5 enqueues existing deploy step (unchanged). No DB migration → confirmed (Task 1 note). All covered.
- **Placeholder scan:** none — every code/test step contains full content and exact commands.
- **Type consistency:** payload `{ leadId, prompt, assetKeys, baseVersion, editId }` is identical across the route (Task 8), the processor `EditPayload` (Task 5), and the manual flow; `EDIT_ASSETS_BUCKET = "edit-assets"` is shared; `downloadEditAssets(keys, destDir) → string[]` and `uploadEditAsset(key, body, contentType)` signatures match their call sites; reused exports (`loadContext`, `runBuildAndChecks`, `BuildStepError`, `getNextVersion`, `readSkillFile`, `GenerationContext`) are added in Task 3 before Tasks 4/5 consume them.

## Notes / follow-ups (out of scope for Phase C)

- Edit history UI (listing prior versions/prompts from `generated_sites`) is not included — the schema supports it; add later if useful.
- An uploader size cap and a rollback-to-previous-version action are natural follow-ups.
- Phases A (research social discovery + imagery) and B (less-templatey generation) get their own plans; Phase A should be planned after the `claude --print` WebSearch spike.
