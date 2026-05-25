# Design: CRM + Email Sequences + Personal Signature

**Date:** 2026-05-25
**Module:** `apps/admin` communication / outreach + `packages/db`
**Status:** Approved (design)

## 1. Goal & Context

Turn the admin "Communication" area into a lightweight CRM and replace the single
cold email with a reviewed 3-step sales sequence sent as personal-looking HTML
mail with a photo signature.

Three coordinated capabilities:

1. **CRM** — capture richer contact info (populated from research where found),
   manage a sales funnel stage + next action, and keep a per-lead activity
   timeline with manual notes. Two-column record page (layout A).
2. **Email sequence** — a 3-step lean cadence with distinct sales angles, sent
   **review-each-step** (no auto-send), stopping automatically on reply.
3. **Signature** — emails render as normal personal HTML mail ending in
   "Signature C": a rounded profile photo + name/title/contact/tagline.

Builds on the prior fix (deterministic, research-data email rendering + admin-
editable template; no `claude` CLI in cloud). Gmail send (`thomas@aiwebatelier.com`,
OAuth) and the reply-poll worker already exist.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Sending mode | **Review each step before send** (auto-draft + queue when due; operator approves each send; keeps 30s undo) |
| Sequence length | **3 emails (lean)** |
| Angles | ① Reveal (site + offer) · ② Value + social proof · ③ Friendly breakup |
| CRM data | **All** (contact person+role, extra channels, pipeline stage + next action, activity timeline + notes), populated from research where available |
| Record layout | **A** — two-column |
| Signature | **C** — Met accent (larger rounded photo + accent border + title + tagline) |
| Phone | `+32 476 38 92 42` |
| Photo embedding | **Inline CID** (multipart/related) — no external hosting, not blocked by auth-gated admin domain |

## 3. Data model (`packages/db/src/schema.ts`, migration 0005)

### 3.1 `leads` — new nullable columns
- `contactName` text — person you email
- `contactRole` text — their title (e.g. "zaakvoerder")
- `contactEmail` text — person's email (distinct from business `email`)
- `mobilePhone` text
- `whatsapp` text
- `salesStage` text `$type<SalesStage>()` — sales funnel (see 3.2)
- `nextActionAt` timestamp (tz) — when the next manual action is due
- `nextActionNote` text — short description of the next action

Socials (Instagram/Facebook) are read from existing `brandProfiles.socialLinks`.

### 3.2 `salesStageValues` (new enum)
`new | contacted | follow_up | in_gesprek | won | lost`

- **Separate from** `leads.status` (build/automation lifecycle — unchanged).
- Auto-seeded from events: 1st email sent → `contacted`; a follow-up step sent →
  `follow_up`; reply detected → `in_gesprek`; status `accepted` → `won`;
  status `declined` → `lost`.
- Operator can override manually (stage picker). One field, auto + manual writes.

### 3.3 `sequenceSteps` (new table)
```
id            text pk
leadId        text fk → leads.id (cascade)
stepNumber    integer            -- 1 | 2 | 3
angle         text $type<SequenceAngle> -- reveal | social_proof | breakup
status        text $type<SequenceStepStatus> default 'pending'
                                 -- pending | drafted | sent | skipped | cancelled
scheduledAt   timestamp(tz)      -- when this step becomes "ready to review"
subject       text               -- drafted subject (editable)
body          text               -- drafted body (editable)
outreachMessageId text fk → outreach_messages.id (nullable; set on send)
sentAt        timestamp(tz)
createdAt     timestamp(tz) default now
updatedAt     timestamp(tz) default now $onUpdate
```
- `sequenceAngleValues` = `reveal | social_proof | breakup`
- `sequenceStepStatusValues` = `pending | drafted | sent | skipped | cancelled`
- Unique (leadId, stepNumber).

### 3.4 `leadActivities` (new table)
```
id          text pk
leadId      text fk → leads.id (cascade)
type        text $type<ActivityType>
                -- email_sent | email_replied | stage_change | note
                -- | sequence_enrolled | step_skipped | call_logged
body        text            -- note text or human description
metadata    jsonb           -- {fromStage,toStage} / {stepNumber} / {messageId} etc.
author      text            -- 'thomas' | 'system'
createdAt   timestamp(tz) default now
```
- `activityTypeValues` enum as above.

### 3.5 `email_templates` — add `angle`
- Add `angle` text column. Replace single id="default" model with **one active row
  per angle** (`reveal`, `social_proof`, `breakup`). Built-in defaults per angle
  in code; Settings edits each.
- Backward compat: migration converts/extends; renderer falls back to built-in
  default per angle when no row exists.

### 3.6 Index exports
Export new tables + enum value arrays + types from `packages/db/src/index.ts`.

## 4. Email flow engine

### 4.1 Files
- `apps/admin/lib/email-template.ts` — `renderOutreachEmail(input, angle)`; per-angle
  default subject/body + per-angle observation. Pure interpolation retained.
- `apps/admin/lib/sequence.ts` (new) — `enrollLead(db, leadId)`, `getSteps(db, leadId)`,
  `scheduleNextStep(db, leadId, afterStepNumber)`, `cancelRemainingSteps(db, leadId, reason)`,
  `skipStep(db, stepId)`. Weekday-aware `addWeekdays(date, n)`.
- `apps/admin/lib/activity.ts` (new) — `logActivity(db, {...})`, `listActivities(db, leadId)`.

### 4.2 Cadence
- Enroll → create 3 `sequenceSteps`. Step 1 `status='drafted'`, `scheduledAt=now`.
  Steps 2/3 `status='pending'`, `scheduledAt` provisional.
- On step N **send**: mark step sent + link `outreachMessageId`; set step N+1
  `scheduledAt` = sent + offset (step2 = +3 weekdays, step3 = +4 weekdays);
  draft step N+1 lazily when displayed/due.
- **Due** = `scheduledAt <= now AND status IN (pending,drafted)`. Computed lazily
  on the CRM page + surfaced as a "ready to review" flag on the list. No new cron.

### 4.3 Stop conditions (extend reply-poll worker)
- On reply detected, or status → `accepted`/`declined`: `cancelRemainingSteps`,
  `logActivity('email_replied'/...)`, set `salesStage` (`in_gesprek`/`won`/`lost`).

## 5. Signature + HTML email

### 5.1 Files
- `apps/admin/lib/email-signature.ts` (new) — `renderSignatureHtml()`,
  `SIGNATURE_TEXT`, `SIGNATURE_PHOTO` ({ path, cid, mime }). Signature field values
  (name/title/phone/site/tagline) as module constants.
- `apps/admin/lib/gmail.ts` — `buildRaw` → MIME `multipart/related`:
  - `multipart/alternative`
    - `text/plain` — body + text signature
    - `text/html` — body (nl→`<br>`, preview URL linkified) + Signature C HTML
  - `image/jpeg` part, `Content-ID: <thomasphoto>`, `Content-Disposition: inline`,
    base64 of `apps/admin/public/thomas.jpg` (read at send; if missing → omit image
    part and render text-only/no-photo signature, never throw).
- `sendEmail(args)` accepts optional `html`; builds both parts.

### 5.2 Prerequisite
Headshot dropped at `apps/admin/public/thomas.jpg` before real sends. Until then the
signature renders without the photo.

## 6. CRM page (layout A) + API

### 6.1 `communication/[leadId]/page.tsx` (rebuild, server component)
Loads lead, brandProfile (socials), sequenceSteps, activities, latest generatedSite.
Two columns:
- **Left** — `ContactPanel` (editable: contactName/role, channels, address) +
  `StagePicker` (salesStage) + `NextAction` (date + note).
- **Right** — `SequenceStepper` (3 dots: sent/ready/todo) + active-step `Composer`
  (Review & send / Edit / Skip — reuses existing composer behaviour + 30s undo) +
  `ActivityTimeline` (+ add-note box).
- If lead not yet enrolled: "Start sequence" button → enroll.

### 6.2 `communication/page.tsx` (list)
Add columns: Contact person, Sales stage, Next action (with due highlight).

### 6.3 API routes (admin-only via existing middleware)
- `POST /api/leads/[id]/sequence/enroll`
- `POST /api/leads/[id]/sequence/skip` `{ stepId }`
- `PUT  /api/leads/[id]/contact` `{ contactName, contactRole, contactEmail, mobilePhone, whatsapp, address }`
- `PUT  /api/leads/[id]/stage` `{ salesStage }` (logs `stage_change`)
- `PUT  /api/leads/[id]/next-action` `{ nextActionAt, nextActionNote }`
- `POST /api/leads/[id]/notes` `{ body }` (logs `note`)
- `POST /api/leads/[id]/outreach/send` — **extend** to accept `{ stepId, subject, body }`;
  on success mark step sent, schedule next, log `email_sent`, advance stage.
- `PUT/GET /api/settings/email-template?angle=` — per-angle editing.

### 6.4 Settings
`TemplateEditor` → 3 tabs (reveal / social_proof / breakup), each editing that
angle's template; placeholder legend + sample preview per angle.

## 7. Phasing (implementation order)
1. **DB** — schema columns/enums/tables + migration 0005 + exports + build.
2. **Signature + HTML email** — `email-signature.ts`, `gmail.ts` MIME, tests.
3. **Per-angle templates + sequence engine** — `email-template.ts`, `sequence.ts`,
   `activity.ts`, template seeds, tests.
4. **CRM page + APIs** — record page, list columns, all routes, Settings tabs.
5. **Stop-on-reply + activity logging** — extend reply-poll worker.

## 8. Testing
Vitest pure-function units:
- per-angle render (correct template/observation per angle)
- signature HTML + text rendering (with/without photo file)
- MIME `buildRaw` structure (multipart/related; CID present; plain+html parts)
- `addWeekdays` cadence math
- sequence state transitions (enroll → send → schedule next → cancel)
DB-touching logic covered where a test DB is available; otherwise pure units.

## 9. Out of scope (YAGNI)
- No new cron/scheduler (lazy due-check).
- Signature field values stay in config (not yet Settings-editable).
- No A/B testing, no open/click tracking, no attachments beyond the inline photo.
- `salesStage` and `status` stay independent (documented mapping), not merged.

## 10. Prerequisites / follow-ups
- Provide `apps/admin/public/thomas.jpg` (headshot) before live sends.
- Migration 0005 auto-applies at boot (`DIRECT_URL` available); deploy to ship.
