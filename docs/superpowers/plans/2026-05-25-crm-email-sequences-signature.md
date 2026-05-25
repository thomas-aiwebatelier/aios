# CRM + Email Sequences + Personal Signature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the admin Communication area into a lightweight CRM with a reviewed 3-step email sequence sent as personal HTML mail with a rounded photo signature.

**Architecture:** Postgres (Drizzle) gains contact/CRM columns + 3 tables (`sequenceSteps`, `leadActivities`, per-angle `email_templates`). Admin libs render per-angle drafts deterministically from research data, send multipart/related HTML+text mail with an inline CID photo, and track a sequence state machine. The `/communication/[leadId]` page becomes a two-column CRM record. No new cron — "due" is computed lazily; the existing reply-poll worker stops the sequence on reply.

**Tech Stack:** Next.js 15 (app router, server components + route handlers), Drizzle ORM + postgres-js, googleapis (Gmail), vitest, Tailwind (stone palette).

**Spec:** `docs/superpowers/specs/2026-05-25-crm-email-sequences-signature-design.md`

**Conventions (read once):**
- ESM relative imports use `.js` extensions (e.g. `./sequence.js`). DB tables imported from `@atelier/db`.
- DB handle: `getDb()` from `@/lib/db`. Logger: `logger` from `@/lib/logger`.
- API routes: `export const runtime = "nodejs"; export const dynamic = "force-dynamic";` admin-only via existing middleware.
- IDs: `nanoid()`. Run tests from `apps/admin` with `pnpm exec vitest run <file>`.
- After DB schema edits: `pnpm --filter @atelier/db generate` then `pnpm --filter @atelier/db build`.
- Existing analogs to mirror: composer `apps/admin/app/(admin)/communication/[leadId]/_components/Composer.tsx`; editor `apps/admin/app/(admin)/settings/_components/TemplateEditor.tsx`; send route `apps/admin/app/api/leads/[id]/outreach/send/route.ts`; worker `apps/admin/workers/outreach.ts`.

---

## Phase 1 — DB foundation

### Task 1: Schema — CRM columns, enums, new tables, migration 0005

**Files:**
- Modify: `packages/db/src/schema.ts`
- Modify: `packages/db/src/index.ts`
- Create: `packages/db/drizzle/0005_*.sql` (generated)

- [ ] **Step 1: Add enum value arrays** to `schema.ts` (near other enum arrays):

```ts
export const salesStageValues = [
  "new", "contacted", "follow_up", "in_gesprek", "won", "lost",
] as const;
export type SalesStage = (typeof salesStageValues)[number];

export const sequenceAngleValues = ["reveal", "social_proof", "breakup"] as const;
export type SequenceAngle = (typeof sequenceAngleValues)[number];

export const sequenceStepStatusValues = [
  "pending", "drafted", "sent", "skipped", "cancelled",
] as const;
export type SequenceStepStatus = (typeof sequenceStepStatusValues)[number];

export const activityTypeValues = [
  "email_sent", "email_replied", "stage_change", "note",
  "sequence_enrolled", "step_skipped", "call_logged",
] as const;
export type ActivityType = (typeof activityTypeValues)[number];
```

- [ ] **Step 2: Add columns to the `leads` table** (inside the existing `pgTable("leads", {...})`):

```ts
  contactName:    text("contact_name"),
  contactRole:    text("contact_role"),
  contactEmail:   text("contact_email"),
  mobilePhone:    text("mobile_phone"),
  whatsapp:       text("whatsapp"),
  salesStage:     text("sales_stage").$type<SalesStage>(),
  nextActionAt:   timestamp("next_action_at", { withTimezone: true, mode: "date" }),
  nextActionNote: text("next_action_note"),
```

- [ ] **Step 3: Add `angle` to `email_templates`** (existing table): add column

```ts
  angle: text("angle").$type<SequenceAngle>(),
```

- [ ] **Step 4: Add the two new tables** at the end of `schema.ts`:

```ts
// ── sequence_steps ─────────────────────────────────────────────────────────────
export const sequenceSteps = pgTable("sequence_steps", {
  id:                text("id").primaryKey(),
  leadId:            text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  stepNumber:        integer("step_number").notNull(),
  angle:             text("angle").$type<SequenceAngle>().notNull(),
  status:            text("status").$type<SequenceStepStatus>().notNull().default("pending"),
  scheduledAt:       timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
  subject:           text("subject"),
  body:              text("body"),
  outreachMessageId: text("outreach_message_id").references(() => outreachMessages.id, { onDelete: "set null" }),
  sentAt:            timestamp("sent_at", { withTimezone: true, mode: "date" }),
  createdAt:         timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:         timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

// ── lead_activities ────────────────────────────────────────────────────────────
export const leadActivities = pgTable("lead_activities", {
  id:        text("id").primaryKey(),
  leadId:    text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type:      text("type").$type<ActivityType>().notNull(),
  body:      text("body"),
  metadata:  jsonb("metadata").$type<Record<string, unknown>>(),
  author:    text("author").notNull().default("thomas"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});
```

- [ ] **Step 5: Export** from `index.ts` — add `sequenceSteps`, `leadActivities` to the table re-export block and the enum arrays/types (`salesStageValues`, `sequenceAngleValues`, `sequenceStepStatusValues`, `activityTypeValues`, and the `type` exports `SalesStage`, `SequenceAngle`, `SequenceStepStatus`, `ActivityType`).

- [ ] **Step 6: Generate migration**

Run: `pnpm --filter @atelier/db generate`
Expected: new `packages/db/drizzle/0005_*.sql` creating `sequence_steps` + `lead_activities` and altering `leads` + `email_templates`.

- [ ] **Step 7: Build db package**

Run: `pnpm --filter @atelier/db build`
Expected: no TS errors.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/schema.ts packages/db/src/index.ts packages/db/drizzle/0005_* packages/db/drizzle/meta
git commit -m "feat(db): CRM fields, sequence_steps, lead_activities, per-angle templates"
```

---

## Phase 2 — Signature + HTML email

### Task 2: Signature renderer

**Files:**
- Create: `apps/admin/lib/email-signature.ts`
- Create: `apps/admin/lib/email-signature.test.ts`

- [ ] **Step 1: Write the failing test** (`email-signature.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { renderSignatureHtml, composeEmailParts, SIGNATURE_TEXT, SIGNATURE_PHOTO } from "./email-signature.js";

describe("signature", () => {
  it("renders HTML with the photo CID when photo present", () => {
    const html = renderSignatureHtml({ withPhoto: true });
    expect(html).toContain(`cid:${SIGNATURE_PHOTO.cid}`);
    expect(html).toContain("Thomas Cortebeeck");
    expect(html).toContain("+32 476 38 92 42");
  });
  it("omits the img tag when no photo", () => {
    const html = renderSignatureHtml({ withPhoto: false });
    expect(html).not.toContain("<img");
    expect(html).toContain("Thomas Cortebeeck");
  });
  it("text signature has name + contacts", () => {
    expect(SIGNATURE_TEXT).toContain("Thomas Cortebeeck");
    expect(SIGNATURE_TEXT).toContain("aiwebatelier.com");
  });
  it("composeEmailParts wraps plain body to html (nl->br, linkify) + appends signature", () => {
    const { textBody, htmlBody } = composeEmailParts("Hallo\nzie https://x.be", { withPhoto: true });
    expect(textBody).toContain("Hallo");
    expect(textBody).toContain("Thomas Cortebeeck");      // text signature appended
    expect(htmlBody).toContain("<br");                      // newline -> br
    expect(htmlBody).toContain('href="https://x.be"');     // linkified
    expect(htmlBody).toContain(`cid:${SIGNATURE_PHOTO.cid}`); // html signature appended
  });
});
```

Add `composeEmailParts` to the import in this test file.

- [ ] **Step 2: Run → fail.** `pnpm exec vitest run lib/email-signature.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** `email-signature.ts`:

```ts
/** Personal email signature (style C) + inline photo metadata. */
export const SIGNATURE_PHOTO = {
  /** repo-relative file read at send time */
  path: "apps/admin/public/thomas.jpg",
  cid: "thomasphoto",
  mime: "image/jpeg",
} as const;

const NAME = "Thomas Cortebeeck";
const TITLE = "AI-engineer & oprichter";
const COMPANY = "AI Web Atelier";
const EMAIL = "thomas@aiwebatelier.com";
const PHONE = "+32 476 38 92 42";
const SITE = "aiwebatelier.com";
const TAGLINE = "vakwerk websites, gebouwd met AI";

export const SIGNATURE_TEXT = `—
${NAME} · ${TITLE}
${COMPANY}
${EMAIL} · ${PHONE}
https://${SITE}
${TAGLINE}`;

export function renderSignatureHtml(opts: { withPhoto: boolean }): string {
  const photo = opts.withPhoto
    ? `<td style="vertical-align:top;padding-right:16px;">
         <img src="cid:${SIGNATURE_PHOTO.cid}" width="72" height="72" alt="${NAME}"
              style="width:72px;height:72px;border-radius:9999px;border:3px solid #fde68a;object-fit:cover;display:block;" />
       </td>`
    : "";
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1917;font-size:14px;">
  <tr>
    ${photo}
    <td style="vertical-align:top;">
      <div style="font-weight:700;font-size:16px;">${NAME}</div>
      <div style="color:#b45309;font-weight:600;">${TITLE}</div>
      <div style="color:#57534e;margin-top:6px;">✉︎ <a href="mailto:${EMAIL}" style="color:#0e7490;text-decoration:none;">${EMAIL}</a></div>
      <div style="color:#57534e;">☎ ${PHONE} &nbsp; 🌐 <a href="https://${SITE}" style="color:#0e7490;text-decoration:none;">${SITE}</a></div>
      <div style="color:#a8a29e;font-style:italic;margin-top:6px;">${TAGLINE}</div>
    </td>
  </tr>
</table>`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Turn a plain-text body into matching text + HTML parts, each with the signature. */
export function composeEmailParts(plainBody: string, opts: { withPhoto: boolean }): {
  textBody: string; htmlBody: string;
} {
  const textBody = `${plainBody}\n\n${SIGNATURE_TEXT}`;
  const htmlEscaped = escapeHtml(plainBody)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0e7490;">$1</a>')
    .replace(/\n/g, "<br>\n");
  const htmlBody =
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1c1917;font-size:14px;line-height:1.5;">` +
    `${htmlEscaped}${renderSignatureHtml({ withPhoto: opts.withPhoto })}</div>`;
  return { textBody, htmlBody };
}
```

- [ ] **Step 4: Run → pass.** `pnpm exec vitest run lib/email-signature.test.ts` → PASS.

- [ ] **Step 5: Commit** `git add apps/admin/lib/email-signature.* && git commit -m "feat(admin): personal HTML email signature (style C)"`

### Task 3: Gmail HTML/multipart + inline photo

**Files:**
- Modify: `apps/admin/lib/gmail.ts`
- Create: `apps/admin/lib/gmail.test.ts`

- [ ] **Step 1: Write failing test** (`gmail.test.ts`) — test the exported pure builder `buildRaw` (export it from gmail.ts):

```ts
import { describe, it, expect } from "vitest";
import { buildRaw } from "./gmail.js";

function decode(b64url: string) {
  return Buffer.from(b64url.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

describe("buildRaw", () => {
  it("builds multipart/alternative with text + html and From signature address", () => {
    const raw = decode(buildRaw({ to: "x@y.be", subject: "Hé", textBody: "Hallo", htmlBody: "<p>Hallo</p>" }));
    expect(raw).toContain("From: AI Web Atelier <thomas@aiwebatelier.com>");
    expect(raw).toContain("multipart/alternative");
    expect(raw).toContain("text/plain");
    expect(raw).toContain("text/html");
  });
  it("wraps in multipart/related with an inline image part when photo provided", () => {
    const raw = decode(buildRaw({ to: "x@y.be", subject: "s", textBody: "t", htmlBody: "<p>t</p>",
      inlineImage: { cid: "thomasphoto", mime: "image/jpeg", base64: "AAAA" } }));
    expect(raw).toContain("multipart/related");
    expect(raw).toContain("Content-ID: <thomasphoto>");
    expect(raw).toContain("Content-Disposition: inline");
  });
});
```

- [ ] **Step 2: Run → fail.** `pnpm exec vitest run lib/gmail.test.ts`.

- [ ] **Step 3: Implement** — rewrite `buildRaw` in `gmail.ts` to this exported signature and MIME structure; keep the RFC2047 subject encoding. Boundaries via `nanoid()` or a counter.

```ts
export interface BuildRawArgs {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  threadId?: string;       // (threadId is applied at send, not in raw)
  inReplyTo?: string;
  inlineImage?: { cid: string; mime: string; base64: string };
}

export function buildRaw(args: BuildRawArgs): string {
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(args.subject, "utf8").toString("base64")}?=`;
  const altBoundary = "alt_" + Math.random().toString(36).slice(2);
  const relBoundary = "rel_" + Math.random().toString(36).slice(2);

  const alt =
`Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n\r\n` +
`--${altBoundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${args.textBody}\r\n\r\n` +
`--${altBoundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${args.htmlBody}\r\n\r\n` +
`--${altBoundary}--`;

  const topHeaders = [
    `From: AI Web Atelier <thomas@aiwebatelier.com>`,
    `To: ${args.to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
  ];
  if (args.inReplyTo) { topHeaders.push(`In-Reply-To: ${args.inReplyTo}`, `References: ${args.inReplyTo}`); }

  let body: string;
  if (args.inlineImage) {
    topHeaders.push(`Content-Type: multipart/related; boundary="${relBoundary}"`);
    body =
`--${relBoundary}\r\n${alt}\r\n\r\n` +
`--${relBoundary}\r\nContent-Type: ${args.inlineImage.mime}\r\nContent-Transfer-Encoding: base64\r\n` +
`Content-ID: <${args.inlineImage.cid}>\r\nContent-Disposition: inline\r\n\r\n${args.inlineImage.base64}\r\n\r\n` +
`--${relBoundary}--`;
  } else {
    topHeaders.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
    body =
`--${altBoundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${args.textBody}\r\n\r\n` +
`--${altBoundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${args.htmlBody}\r\n\r\n` +
`--${altBoundary}--`;
  }

  const rfc = topHeaders.join("\r\n") + "\r\n\r\n" + body;
  return Buffer.from(rfc, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
```

- [ ] **Step 4: Update `sendEmail` internals only — keep its public signature `{ to, subject, body, threadId? }`** so existing callers (outreach worker, reply-poll) need NO changes. Inside: read the photo file once (try/catch → none if missing), call `composeEmailParts(body, { withPhoto: !!inlineImage })`, then `buildRaw`. Import from `./email-signature.js`.

```ts
import { readFile } from "node:fs/promises";
import { SIGNATURE_PHOTO, composeEmailParts } from "./email-signature.js";
// ... inside sendEmail (args: { to, subject, body, threadId? }):
let inlineImage: BuildRawArgs["inlineImage"] | undefined;
try {
  const buf = await readFile(SIGNATURE_PHOTO.path);
  inlineImage = { cid: SIGNATURE_PHOTO.cid, mime: SIGNATURE_PHOTO.mime, base64: buf.toString("base64") };
} catch { inlineImage = undefined; }
const { textBody, htmlBody } = composeEmailParts(args.body, { withPhoto: !!inlineImage });
const raw = buildRaw({ to: args.to, subject: args.subject, textBody, htmlBody, inlineImage });
```

Keep `SendEmailArgs` as `{ to; subject; body; threadId? }` (unchanged). `createDraft`/`getThread`/`SENDER_ADDRESS` stay as-is.

- [ ] **Step 5: Run → pass.** `pnpm exec vitest run lib/gmail.test.ts`.

- [ ] **Step 6: Commit** `git commit -am "feat(admin): multipart HTML email with inline photo"`

### Task 4: Public asset dir for the photo

**Files:** Create `apps/admin/public/README.md`

- [ ] **Step 1:** Create `apps/admin/public/README.md` with one line: `Place thomas.jpg (square headshot) here — used as the inline email signature photo (cid:thomasphoto).`
- [ ] **Step 2: Commit** `git add apps/admin/public/README.md && git commit -m "chore(admin): public dir for signature photo"`

> **Prerequisite for live sends:** drop the real `apps/admin/public/thomas.jpg`. Until then signature renders text-only (no crash).

---

## Phase 3 — Per-angle templates + sequence engine

### Task 5: Per-angle email rendering

**Files:**
- Modify: `apps/admin/lib/email-template.ts`
- Modify: `apps/admin/lib/email-template.test.ts`

- [ ] **Step 1:** Add `SequenceAngle` import from `@atelier/db`. Define three default templates `DEFAULT_TEMPLATES: Record<SequenceAngle, { subject: string; body: string }>`:
  - `reveal` = the current `DEFAULT_SUBJECT_TEMPLATE`/`DEFAULT_BODY_TEMPLATE` (move existing copy here).
  - `social_proof` = short bump; subject `"Even kort over je nieuwe website, {{businessName}}"`; body references other local cases + `{{previewUrl}}`, soft ask.
  - `breakup` = friendly close; subject `"Laatste mailtje over {{businessName}}"`; body: no pressure, "zal ik je dossier sluiten?", `{{previewUrl}}`.
  (Full Dutch copy: follow the reveal tone; keep `{{observation}}` only in `reveal`.)

- [ ] **Step 2:** Add per-angle observation: `buildObservation(input, angle)` — `reveal` keeps current logic; `social_proof` returns a social-proof sentence; `breakup` returns a low-pressure sentence. Keep deterministic + pure.

- [ ] **Step 3:** Change `loadActiveEmailTemplate(angle)` to query `where(and(eq(emailTemplates.isActive,true), eq(emailTemplates.angle, angle)))`; fallback to `DEFAULT_TEMPLATES[angle]`. Change `renderOutreachEmail(input, angle: SequenceAngle = "reveal")` to use them. Keep `interpolate`, `buildTemplateVars`.

- [ ] **Step 4:** Update tests: existing reveal tests pass with default `angle`; add a test that `renderOutreachEmail(input, "breakup")` subject contains "Laatste" and `social_proof` differs from `reveal`. Run `pnpm exec vitest run lib/email-template.test.ts` → PASS.

- [ ] **Step 5: Commit** `git commit -am "feat(admin): per-angle outreach templates + observations"`

### Task 6: Sequence engine

**Files:**
- Create: `apps/admin/lib/sequence.ts`
- Create: `apps/admin/lib/sequence.test.ts`

- [ ] **Step 1: Write failing test** for the pure `addWeekdays` helper:

```ts
import { describe, it, expect } from "vitest";
import { addWeekdays } from "./sequence.js";
describe("addWeekdays", () => {
  it("skips weekends", () => {
    // Fri 2026-05-22 + 1 weekday = Mon 2026-05-25
    const fri = new Date("2026-05-22T09:00:00Z");
    expect(addWeekdays(fri, 1).getUTCDate()).toBe(25);
  });
  it("adds within the week", () => {
    const mon = new Date("2026-05-25T09:00:00Z");
    expect(addWeekdays(mon, 3).getUTCDate()).toBe(28); // Thu
  });
});
```

- [ ] **Step 2: Run → fail.**

- [ ] **Step 3: Implement** `sequence.ts`. `addWeekdays` is pure; the rest take `(db, ...)`.

```ts
import { and, eq, inArray, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import { sequenceSteps, type Db, type SequenceAngle } from "@atelier/db";

const STEP_ANGLES: SequenceAngle[] = ["reveal", "social_proof", "breakup"];
const STEP_OFFSET_WEEKDAYS = [0, 3, 4]; // step1 now; step2 +3 after step1 sent; step3 +4 after step2 sent

export function addWeekdays(from: Date, n: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export async function enrollLead(db: Db, leadId: string): Promise<void> {
  const existing = await db.select().from(sequenceSteps).where(eq(sequenceSteps.leadId, leadId)).limit(1);
  if (existing.length) return; // idempotent
  const now = new Date();
  for (let i = 0; i < STEP_ANGLES.length; i++) {
    await db.insert(sequenceSteps).values({
      id: nanoid(),
      leadId,
      stepNumber: i + 1,
      angle: STEP_ANGLES[i],
      status: i === 0 ? "drafted" : "pending",
      scheduledAt: i === 0 ? now : null,
    });
  }
}

export async function getSteps(db: Db, leadId: string) {
  return db.select().from(sequenceSteps).where(eq(sequenceSteps.leadId, leadId));
}

export async function scheduleNextStep(db: Db, leadId: string, afterStepNumber: number): Promise<void> {
  const next = afterStepNumber + 1;
  if (next > STEP_ANGLES.length) return;
  const due = addWeekdays(new Date(), STEP_OFFSET_WEEKDAYS[next - 1]);
  await db.update(sequenceSteps)
    .set({ scheduledAt: due })
    .where(and(eq(sequenceSteps.leadId, leadId), eq(sequenceSteps.stepNumber, next)));
}

export async function cancelRemainingSteps(db: Db, leadId: string): Promise<void> {
  await db.update(sequenceSteps)
    .set({ status: "cancelled" })
    .where(and(eq(sequenceSteps.leadId, leadId), inArray(sequenceSteps.status, ["pending", "drafted"])));
}

export async function skipStep(db: Db, stepId: string): Promise<void> {
  await db.update(sequenceSteps).set({ status: "skipped" }).where(eq(sequenceSteps.id, stepId));
}
```

- [ ] **Step 4: Run → pass** (addWeekdays test). `pnpm exec vitest run lib/sequence.test.ts`.

- [ ] **Step 5: Commit** `git commit -am "feat(admin): 3-step sequence engine (enroll/schedule/cancel/skip)"`

### Task 7: Activity log

**Files:**
- Create: `apps/admin/lib/activity.ts`

- [ ] **Step 1: Implement** `activity.ts`:

```ts
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { leadActivities, type Db, type ActivityType } from "@atelier/db";

export async function logActivity(db: Db, a: {
  leadId: string; type: ActivityType; body?: string;
  metadata?: Record<string, unknown>; author?: string;
}): Promise<void> {
  await db.insert(leadActivities).values({
    id: nanoid(), leadId: a.leadId, type: a.type, body: a.body ?? null,
    metadata: a.metadata ?? null, author: a.author ?? "thomas",
  });
}

export async function listActivities(db: Db, leadId: string) {
  return db.select().from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.createdAt));
}
```

- [ ] **Step 2: Commit** `git commit -am "feat(admin): lead activity log helpers"`

---

## Phase 4 — APIs + CRM UI

### Task 8: CRM mutation API routes

**Files (create each as `route.ts`):**
- `apps/admin/app/api/leads/[id]/sequence/enroll/route.ts`
- `apps/admin/app/api/leads/[id]/sequence/skip/route.ts`
- `apps/admin/app/api/leads/[id]/contact/route.ts`
- `apps/admin/app/api/leads/[id]/stage/route.ts`
- `apps/admin/app/api/leads/[id]/next-action/route.ts`
- `apps/admin/app/api/leads/[id]/notes/route.ts`

Each mirrors the existing `outreach/send/route.ts` shape (`params: Promise<{id}>`, `await req.json().catch`, validate, `getDb()`, return `NextResponse.json`). `runtime="nodejs"`, `dynamic="force-dynamic"`.

- [ ] **Step 1: enroll** — `POST`: `await enrollLead(db, id)`; `logActivity(db,{leadId:id,type:"sequence_enrolled"})`; return `{ ok:true }`.
- [ ] **Step 2: skip** — `POST {stepId}`: validate stepId; `skipStep`; `logActivity(type:"step_skipped", metadata:{stepId})`; `{ ok:true }`.
- [ ] **Step 3: contact** — `PUT {contactName,contactRole,contactEmail,mobilePhone,whatsapp,address}`: `db.update(leads).set({...defined fields, updatedAt:new Date()}).where(eq(leads.id,id))`; `{ ok:true }`. Only set keys present in body.
- [ ] **Step 4: stage** — `PUT {salesStage}`: validate against `salesStageValues`; read current stage; update; `logActivity(type:"stage_change", metadata:{from,to})`; `{ ok:true }`.
- [ ] **Step 5: next-action** — `PUT {nextActionAt,nextActionNote}`: parse `nextActionAt` to `new Date()` or null; update; `{ ok:true }`.
- [ ] **Step 6: notes** — `POST {body}`: require non-empty; `logActivity(type:"note", body)`; `{ ok:true }`.
- [ ] **Step 7: Typecheck** `pnpm --filter admin typecheck`. **Commit** `git commit -am "feat(admin): CRM mutation API routes"`

### Task 9: Extend outreach/send for sequence steps

**Files:** Modify `apps/admin/app/api/leads/[id]/outreach/send/route.ts`

- [ ] **Step 1:** Accept optional `stepId` in the body. Keep current insert of `outreachMessages` draft + enqueue delayed outreach job. Additionally, when `stepId` present: update that `sequenceSteps` row `{ status:"sent", subject, body, outreachMessageId, sentAt:new Date() }`; `scheduleNextStep(db, id, stepNumber)` (read stepNumber from the row); `logActivity(type:"email_sent", metadata:{stepId, outreachMessageId})`; set `leads.salesStage` (`contacted` if step1 else `follow_up`) only if not already further along.
- [ ] **Step 2: Typecheck + commit** `git commit -am "feat(admin): link outreach send to sequence step + activity"`

### Task 10: Settings — per-angle template editing

**Files:**
- Modify: `apps/admin/app/api/settings/email-template/route.ts`
- Modify: `apps/admin/app/(admin)/settings/page.tsx`
- Modify: `apps/admin/app/(admin)/settings/_components/TemplateEditor.tsx`

- [ ] **Step 1: API** — `GET ?angle=` returns that angle's active template (or default); `PUT {angle,subject,body}` upserts a row keyed by `id = "tmpl_"+angle` with `angle` set + `isActive:true` (onConflictDoUpdate on id). Validate `angle ∈ sequenceAngleValues`.
- [ ] **Step 2: page** — load all three angle templates server-side; pass to `TemplateEditor` as `templates: {angle, subject, body, defaultSubject, defaultBody}[]` + placeholders.
- [ ] **Step 3: TemplateEditor** — add a 3-tab switcher (reveal / social_proof / breakup). Reuse the existing subject/body/preview/save UI per active tab; PUT includes `angle`. Mirror current component patterns.
- [ ] **Step 4: Typecheck + commit** `git commit -am "feat(admin): per-angle template editor (3 tabs)"`

### Task 11: CRM record page (layout A)

**Files:**
- Modify: `apps/admin/app/(admin)/communication/[leadId]/page.tsx`
- Create components under `apps/admin/app/(admin)/communication/[leadId]/_components/`:
  `ContactPanel.tsx`, `StagePicker.tsx`, `NextAction.tsx`, `SequenceStepper.tsx`, `ActivityTimeline.tsx` (reuse existing `Composer.tsx`).

- [ ] **Step 1: page.tsx (server)** — load `lead`, `brandProfile` (socials), `getSteps`, `listActivities`, latest `generatedSite`. If no steps → show "Start sequence" button (calls enroll). Else compute the active step = lowest stepNumber with status in (drafted,pending) and `scheduledAt<=now`; render its draft via `renderOutreachEmail(input, step.angle)` if subject/body empty. Two-column grid (`md:grid-cols-[minmax(280px,360px)_1fr]`, stone palette).
- [ ] **Step 2: ContactPanel (client)** — editable fields (businessName read-only; contactName, contactRole, contactEmail, mobilePhone, whatsapp, address) with a Save → `PUT /contact`. Show socials (read-only) from brandProfile.socialLinks. Mirror `TemplateEditor` save/status pattern.
- [ ] **Step 3: StagePicker (client)** — `<select>` of `salesStageValues` (Dutch labels) → `PUT /stage`.
- [ ] **Step 4: NextAction (client)** — date input + note → `PUT /next-action`.
- [ ] **Step 5: SequenceStepper (server-rendered)** — 3 dots with status (sent/ready/todo/skipped/cancelled) + labels.
- [ ] **Step 6: Active-step Composer** — reuse `Composer.tsx`; pass `leadId`, `to`, `initialSubject`, `initialBody`, and **new prop `stepId`** so its send POST includes `stepId`. Add `stepId` to Composer props + include in the send fetch body. Add a "Skip" button → `POST /sequence/skip`.
- [ ] **Step 7: ActivityTimeline (client)** — render `activities` (icon per type, relative time, body) + an "add note" textarea → `POST /notes` then refresh.
- [ ] **Step 8: Typecheck + commit** `git commit -am "feat(admin): CRM record page (contact, stage, sequence, timeline)"`

### Task 12: Communication list columns

**Files:** Modify `apps/admin/app/(admin)/communication/page.tsx`

- [ ] **Step 1:** Extend the outreach query select to include `contactName`, `salesStage`, `nextActionAt`. Add table columns: Contact, Stage (badge), Next action (highlight red if `nextActionAt <= now`). Keep existing Compose/View action.
- [ ] **Step 2: Typecheck + commit** `git commit -am "feat(admin): contact/stage/next-action columns in communication list"`

---

## Phase 5 — Stop-on-reply wiring

### Task 13: Reply-poll cancels sequence + logs activity

**Files:** Modify the reply-poll worker (locate via grep `reply` / `getThread` in `apps/admin/workers`). `sendEmail`'s public signature is unchanged (Task 3), so callers need no signature edits — HTML + signature are applied centrally inside `sendEmail`.

- [ ] **Step 1:** When a reply is detected for a lead: `cancelRemainingSteps(db, leadId)`; `logActivity(db, {leadId, type:"email_replied", body: replySnippet, author:"system"})`; set `leads.salesStage = "in_gesprek"` (only if not already `won`/`lost`).
- [ ] **Step 2:** Where lead status flips to `accepted` → also set `salesStage="won"`; `declined` → `salesStage="lost"`; log `stage_change` with `{from,to}`. (If accept/decline lives elsewhere, apply there.)
- [ ] **Step 3: Typecheck + commit** `git commit -am "feat(admin): stop sequence on reply + stage transitions"`

---

## Final verification

### Task 14: Full typecheck + build

- [ ] **Step 1:** `pnpm --filter @atelier/db build && pnpm --filter admin typecheck` → no errors.
- [ ] **Step 2:** `cd apps/admin && pnpm exec vitest run lib/` → all unit tests pass.
- [ ] **Step 3:** `pnpm --filter admin build` → compiles (Windows standalone symlink EPERM at the very end is a known local-only issue; "Compiled successfully" + route emission is the pass signal).
- [ ] **Step 4: Commit** any fixups.

---

## Notes for the executor
- The composer's existing 30s-undo send flow is unchanged; sequence linkage rides on the same route.
- `salesStage` and `leads.status` are intentionally independent (see spec §3.2). Never block sends on `salesStage`.
- All new API routes are admin-protected by existing middleware — no per-route auth needed.
- Keep every new lib function pure where possible and DB-thin; put copy in `DEFAULT_TEMPLATES`.
- Prerequisite for live email: `apps/admin/public/thomas.jpg`.
