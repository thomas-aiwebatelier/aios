/**
 * Postgres schema — ported from SQLite (Migration Plan A).
 *
 * Type mapping (vs prior sqlite-core schema):
 *   sqlite text                                  → pg text
 *   sqlite text(enum: ...)                       → pg text + zod-validated app-side enums
 *                                                  (kept as text rather than pgEnum to avoid
 *                                                  drift between code-defined unions and DB enum
 *                                                  types when statuses evolve — application
 *                                                  guards them already)
 *   sqlite integer(mode: "timestamp_ms")         → pg timestamp({ withTimezone: true, mode: "date" })
 *                                                  with defaultNow() where applicable
 *   sqlite text(mode: "json")                    → pg jsonb with $type<T>()
 *   sqlite real                                  → pg doublePrecision
 *   sqlite integer (counter / score)             → pg integer
 *   FK with onDelete: "cascade"                  → same syntax
 */

import {
  pgTable,
  text,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

// ── leads ────────────────────────────────────────────────────────────────────

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

export const leadStatusValues = [
  "discovered",
  "researching",
  "awaiting_approval",
  "approved",
  "generating",
  "generated",
  "generation_failed",
  "deployed",
  "email_drafted",
  "email_sent",
  "accepted",
  "declined",
  "archived",
] as const;
export type LeadStatus = (typeof leadStatusValues)[number];

export const leads = pgTable("leads", {
  id:                               text("id").primaryKey(),
  slug:                             text("slug").notNull().unique(),
  status:                           text("status").$type<LeadStatus>().notNull(),
  businessName:                     text("business_name").notNull(),
  phone:                            text("phone"),
  email:                            text("email"),
  address:                          text("address"),
  city:                             text("city").notNull(),
  postalCode:                       text("postal_code"),
  googleMapsPlaceId:                text("google_maps_place_id").unique(),
  googleMapsUrl:                    text("google_maps_url"),
  existingWebsiteUrl:               text("existing_website_url"),
  // Google Places API v1 photo resource names (e.g. "places/XXX/photos/YYY")
  // captured during research for no-website leads. Used to (re)download the
  // actual storefront/product imagery via the Places photo-media endpoint.
  googlePhotoRefs:                  jsonb("google_photo_refs").$type<string[]>(),
  websiteStalenessScore:            integer("website_staleness_score"),
  industryKey:                      text("industry_key").notNull(),
  industryClassificationConfidence: doublePrecision("industry_classification_confidence"),
  language:                         text("language").default("nl"),
  createdAt:                        timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:                        timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
  approvedAt:                       timestamp("approved_at", { withTimezone: true, mode: "date" }),
  sentAt:                           timestamp("sent_at", { withTimezone: true, mode: "date" }),
  respondedAt:                      timestamp("responded_at", { withTimezone: true, mode: "date" }),
  contactName:                      text("contact_name"),
  contactRole:                      text("contact_role"),
  contactEmail:                     text("contact_email"),
  mobilePhone:                      text("mobile_phone"),
  whatsapp:                         text("whatsapp"),
  salesStage:                       text("sales_stage").$type<SalesStage>(),
  nextActionAt:                     timestamp("next_action_at", { withTimezone: true, mode: "date" }),
  nextActionNote:                   text("next_action_note"),
});

// ── brand_profiles ───────────────────────────────────────────────────────────

export const brandProfiles = pgTable("brand_profiles", {
  id:                 text("id").primaryKey(),
  leadId:             text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  logoPath:           text("logo_path"),
  extractedPalette:   jsonb("extracted_palette").$type<string[]>(),
  primaryColor:       text("primary_color"),
  secondaryColor:     text("secondary_color"),
  accentColor:        text("accent_color"),
  fontsDetected:      jsonb("fonts_detected").$type<{ heading: string; body: string }>(),
  toneOfVoiceSummary: text("tone_of_voice_summary"),
  socialLinks:        jsonb("social_links").$type<Record<string, string>>(),
  // Downloaded local image file paths (repo-relative, forward-slash) of real
  // brand photos — Google Maps Place Photos plus any best-effort Instagram /
  // Facebook images. Generation copies these into the Astro project and uses
  // them as hero/section imagery instead of stock photos.
  photoPaths:         jsonb("photo_paths").$type<string[]>(),
  // Where the resolved logo came from: 'website' (scraped <img>/favicon),
  // 'instagram' / 'facebook' (profile og:image), 'wordmark' (no image — render
  // a styled text logo), or 'none'. Drives generation's logo handling.
  logoSource:         text("logo_source").$type<LogoSource>(),
});

export const logoSourceValues = [
  "website",
  "instagram",
  "facebook",
  "wordmark",
  "none",
] as const;
export type LogoSource = (typeof logoSourceValues)[number];

// ── site_inventories ─────────────────────────────────────────────────────────

export type InventoryPage = {
  url: string;
  title: string;
  metaDescription?: string;
  sections?: string[];
  images?: string[];
  ctas?: string[];
  forms?: string[];
  language?: string;
};

export type InventoryAsset = {
  originalUrl: string;
  type: string;
  alt?: string;
  localPath?: string;
  downloadedBytes?: number;
};

export const siteInventories = pgTable("site_inventories", {
  id:        text("id").primaryKey(),
  leadId:    text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  crawledAt: timestamp("crawled_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  pages:     jsonb("pages").$type<InventoryPage[]>(),
  assets:    jsonb("assets").$type<InventoryAsset[]>(),
});

// ── competitors ───────────────────────────────────────────────────────────────

export const competitors = pgTable("competitors", {
  id:               text("id").primaryKey(),
  leadId:           text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  competitorUrl:    text("competitor_url").notNull(),
  competitorName:   text("competitor_name"),
  selectionReason:  text("selection_reason"),
  structureSummary: jsonb("structure_summary").$type<Record<string, unknown>>(),
  learnings:        text("learnings"),
});

// ── generated_sites ───────────────────────────────────────────────────────────

export const generatedSiteCreatedViaValues = [
  "initial_generation",
  "prompt_edit",
] as const;
export type GeneratedSiteCreatedVia = (typeof generatedSiteCreatedViaValues)[number];

export const generatedSites = pgTable("generated_sites", {
  id:                       text("id").primaryKey(),
  leadId:                   text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  version:                  integer("version").notNull().default(1),
  astroProjectPath:         text("astro_project_path"),
  cloudflareProjectName:    text("cloudflare_project_name"),
  cloudflarePreviewUrl:     text("cloudflare_preview_url"),
  cloudflareDeploymentId:   text("cloudflare_deployment_id"),
  lighthouseScores:         jsonb("lighthouse_scores").$type<Record<string, number>>(),
  designSystemVersion:      text("design_system_version"),
  industryGuideVersion:     text("industry_guide_version"),
  createdAt:                timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  createdVia:               text("created_via").$type<GeneratedSiteCreatedVia>().notNull(),
  promptUsed:               text("prompt_used"),
});

// ── outreach_messages ─────────────────────────────────────────────────────────

export const outreachDirectionValues = ["outbound", "inbound"] as const;
export type OutreachDirection = (typeof outreachDirectionValues)[number];

export const outreachStatusValues = ["draft", "sent", "bounced", "replied", "archived"] as const;
export type OutreachStatus = (typeof outreachStatusValues)[number];

export const outreachMessages = pgTable("outreach_messages", {
  id:                text("id").primaryKey(),
  leadId:            text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  direction:         text("direction").$type<OutreachDirection>().notNull(),
  subject:           text("subject"),
  body:              text("body"),
  gmailThreadId:     text("gmail_thread_id"),
  gmailMessageId:    text("gmail_message_id"),
  status:            text("status").$type<OutreachStatus>().notNull().default("draft"),
  sentAt:            timestamp("sent_at", { withTimezone: true, mode: "date" }),
  // Reply-poll bookkeeping (Migration Plan B). Tracks per-thread Gmail
  // message count so the poller can detect new replies without re-pulling
  // every message. replyBody / replyReceivedAt capture the first inbound
  // reply that flips lead.status to 'accepted' or surfaces in the inbox.
  gmailMessageCount: integer("gmail_message_count").notNull().default(1),
  replyBody:         text("reply_body"),
  replyReceivedAt:   timestamp("reply_received_at", { withTimezone: true, mode: "date" }),
});

// ── pipeline_jobs ─────────────────────────────────────────────────────────────

export const pipelineJobStatusValues = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type PipelineJobStatus = (typeof pipelineJobStatusValues)[number];

export const pipelineJobs = pgTable("pipeline_jobs", {
  id:              text("id").primaryKey(),
  leadId:          text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  // Self-serve AI Marketing jobs are brand-scoped instead of lead-scoped.
  // Exactly one of leadId / brandId is set per job.
  brandId:         text("brand_id").references(() => brands.id, { onDelete: "cascade" }),
  pipelineStep:    text("pipeline_step").notNull(),
  status:          text("status").$type<PipelineJobStatus>().notNull().default("queued"),
  startedAt:       timestamp("started_at", { withTimezone: true, mode: "date" }),
  finishedAt:      timestamp("finished_at", { withTimezone: true, mode: "date" }),
  errorMessage:    text("error_message"),
  payload:         jsonb("payload").$type<Record<string, unknown>>(),
  attemptCount:    integer("attempt_count").notNull().default(0),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true, mode: "date" }),
  createdAt:       timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// ── worker_heartbeats ─────────────────────────────────────────────────────────
//
// Liveness tracking for long-running worker processes (Migration Plan C — the
// local-worker daemon on Thomas's machine). The local-worker upserts its row
// every 30s; the admin UI surfaces `last_seen_at` so we know whether the
// laptop is currently polling. PRIMARY KEY = worker_name so the worker can
// safely upsert without coordinating IDs.

export interface WorkerHostInfo {
  nodeVersion: string;
  hostname: string;
  platform: string;
  arch: string;
  /** package.json version of the worker app. */
  appVersion?: string;
  /** Absolute path of the resolved `claude` CLI, if discoverable. */
  claudePath?: string;
  /** Absolute path of the resolved `wrangler` CLI, if discoverable. */
  wranglerPath?: string;
}

export const workerHeartbeats = pgTable("worker_heartbeats", {
  workerName:      text("worker_name").primaryKey(),
  lastSeenAt:      timestamp("last_seen_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  hostInfo:        jsonb("host_info").$type<WorkerHostInfo>(),
  claimedJobs24h:  integer("claimed_jobs_24h").notNull().default(0),
});

// ── inbound_inquiries ─────────────────────────────────────────────────────────

export const inboundInquiryStatusValues = [
  "new",
  "read",
  "replied",
  "archived",
] as const;
export type InboundInquiryStatus = (typeof inboundInquiryStatusValues)[number];

export const inboundInquiries = pgTable("inbound_inquiries", {
  id:        text("id").primaryKey(),
  name:      text("name"),
  email:     text("email"),
  message:   text("message"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  status:    text("status").$type<InboundInquiryStatus>().notNull().default("new"),
});

// ── email_templates ───────────────────────────────────────────────────────────
//
// Admin-editable outreach email templates. Each row stores a subject + body with
// {{placeholder}} tokens that apps/admin/lib/email-template.ts interpolates with
// per-lead data gathered during the research phase (business name, city,
// industry, the computed "observation" line, the generated-site preview URL +
// Lighthouse score). One row is active at a time (isActive=true). If no row
// exists the renderer falls back to the built-in DEFAULT template, so the
// composer keeps working before any template has been saved. The single active
// row uses a fixed id ("default") so the Settings editor can upsert it.

export const emailTemplates = pgTable("email_templates", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull().default("default"),
  subject:   text("subject").notNull(),
  body:      text("body").notNull(),
  isActive:  boolean("is_active").notNull().default(true),
  angle:     text("angle").$type<SequenceAngle>(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

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

// =====================================================================
// Blog
// =====================================================================
//
// Shared blog table used by admin (Next.js editor) and the agency-site
// (Astro). IDs are assigned app-side as text to stay consistent with the
// rest of the schema (see file header re: avoiding pgEnum / native uuid
// types). `status` is a text column constrained by an app-side TS union
// rather than a pgEnum, matching every other status field above.

export const blogPostStatusValues = ["draft", "published"] as const;
export type BlogPostStatus = (typeof blogPostStatusValues)[number];

export type BlogDiagram = {
  slug: string;
  alt: string;
  svgPath: string;
};

export const blogPosts = pgTable("blog_posts", {
  id:                    text("id").primaryKey(),
  slug:                  text("slug").notNull().unique(),
  title:                 text("title").notNull(),
  excerpt:               text("excerpt"),
  bodyMarkdown:          text("body_markdown").notNull(),
  language:              text("language").notNull().default("nl-BE"),
  status:                text("status").$type<BlogPostStatus>().notNull().default("draft"),
  publishedAt:           timestamp("published_at", { withTimezone: true, mode: "date" }),
  seoTitle:              text("seo_title"),
  seoDescription:        text("seo_description"),
  ogImagePath:           text("og_image_path"),
  attributionName:       text("attribution_name"),
  attributionFramework:  text("attribution_framework"),
  attributionUrl:        text("attribution_url"),
  diagrams:              jsonb("diagrams").$type<BlogDiagram[]>(),
  createdAt:             timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:             timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
  authorId:              text("author_id"),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;

// =====================================================================
// AI Marketing — self-serve "Market" product
// =====================================================================
//
// Self-serve customers (Supabase Auth users) own a `brand` workspace, SEPARATE
// from cold-outreach `leads`. Optional `lead_id` links a self-serve brand to an
// existing lead when they're the same business (coexistence, per product
// decision). The brand-identification job REUSES the lead-gen extraction logic
// (Playwright render + node-vibrant palette + Claude) but persists here:
// structured signals in `brands.extracted_signals` (mirrors the brand_profiles
// shape), human-editable docs in `brand_kit_files`, real images in
// `brand_kit_assets`. Row-level security (restrict to owner_user_id =
// auth.uid()) is added in the migration SQL — it can't be expressed in Drizzle.

export const brandStatusValues = [
  "queued", "scraping", "generating", "ready", "failed",
] as const;
export type BrandStatus = (typeof brandStatusValues)[number];

// Structured brand signals — mirrors the lead-gen `brand_profiles` shape so the
// same extraction logic can populate either store.
export interface BrandSignals {
  palette?: string[];
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fonts?: { heading: string; body: string };
  toneOfVoiceSummary?: string;
  socialLinks?: Record<string, string>;
  products?: { name: string; description?: string; price?: string }[];
  positioning?: string;
  audience?: string;
}

export const brands = pgTable("brands", {
  id:               text("id").primaryKey(),
  ownerUserId:      text("owner_user_id").notNull(), // Supabase auth.users.id
  leadId:           text("lead_id").references(() => leads.id, { onDelete: "set null" }),
  sourceUrl:        text("source_url").notNull(),
  status:           text("status").$type<BrandStatus>().notNull().default("queued"),
  extractedSignals: jsonb("extracted_signals").$type<BrandSignals>(),
  errorMessage:     text("error_message"),
  createdAt:        timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const brandKitFileTypeValues = [
  "visual-identity", "voice-and-messaging", "business",
] as const;
export type BrandKitFileType = (typeof brandKitFileTypeValues)[number];

// One row per markdown doc. `content` is the editable source of truth shown in
// the Brand Guidelines tab and re-read at generation time; `storage_path` is an
// optional mirror in Supabase Storage.
export const brandKitFiles = pgTable("brand_kit_files", {
  id:          text("id").primaryKey(),
  brandId:     text("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  type:        text("type").$type<BrandKitFileType>().notNull(),
  content:     text("content").notNull(),
  storagePath: text("storage_path"),
  updatedAt:   timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export const brandKitAssetRoleValues = ["logo", "product", "hero", "other"] as const;
export type BrandKitAssetRole = (typeof brandKitAssetRoleValues)[number];
export const brandKitAssetSourceValues = ["scraped", "uploaded"] as const;
export type BrandKitAssetSource = (typeof brandKitAssetSourceValues)[number];

export const brandKitAssets = pgTable("brand_kit_assets", {
  id:          text("id").primaryKey(),
  brandId:     text("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  role:        text("role").$type<BrandKitAssetRole>().notNull().default("other"),
  source:      text("source").$type<BrandKitAssetSource>().notNull(),
  storagePath: text("storage_path").notNull(),
  originalUrl: text("original_url"),
  createdAt:   timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type BrandKitFile = typeof brandKitFiles.$inferSelect;
export type NewBrandKitFile = typeof brandKitFiles.$inferInsert;
export type BrandKitAsset = typeof brandKitAssets.$inferSelect;

// ── profiles — unified Supabase Auth identity ──────────────────────────────────
//
// 1:1 extension of auth.users (Supabase-managed, `auth` schema). `id` equals the
// auth user id. `role` drives access: 'customer' for self-serve users, 'admin'
// for the operator. The auth.users FK + the on-signup trigger that inserts this
// row live in the hand-written sql/rls-and-auth.sql (Drizzle can't express
// cross-schema FKs or triggers).

export const userRoleValues = ["customer", "admin"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const profiles = pgTable("profiles", {
  id:        text("id").primaryKey(), // = auth.users.id
  email:     text("email"),
  fullName:  text("full_name"),
  role:      text("role").$type<UserRole>().notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

// ── operate_projects — Operate product (intake-only v1) ────────────────────────

export const operateProjectStatusValues = [
  "submitted", "reviewing", "scoped", "building", "live",
] as const;
export type OperateProjectStatus = (typeof operateProjectStatusValues)[number];

export interface OperateIntake {
  toolsUsed?: string[];
  tasksToAutomate?: string;
  systemsToConnect?: string[];
  volume?: string;
  notes?: string;
}

export const operateProjects = pgTable("operate_projects", {
  id:        text("id").primaryKey(),
  brandId:   text("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  status:    text("status").$type<OperateProjectStatus>().notNull().default("submitted"),
  intake:    jsonb("intake").$type<OperateIntake>(),
  brief:     text("brief"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type OperateProject = typeof operateProjects.$inferSelect;
export type NewOperateProject = typeof operateProjects.$inferInsert;

// ── ad_assets — Market creative (ad objects: copy + media together) ────────────

export const adAssetStatusValues = [
  "queued", "generating", "ready", "failed",
] as const;
export type AdAssetStatus = (typeof adAssetStatusValues)[number];

export const adAssetStateValues = ["draft", "approved", "rejected"] as const;
export type AdAssetState = (typeof adAssetStateValues)[number];

export const adAssets = pgTable("ad_assets", {
  id:          text("id").primaryKey(),
  brandId:     text("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  prompt:      text("prompt").notNull(),
  placement:   text("placement"), // feed | story | reels
  format:      text("format"),    // image | video
  aspectRatio: text("aspect_ratio"),
  // generation lifecycle
  status:       text("status").$type<AdAssetStatus>().notNull().default("queued"),
  errorMessage: text("error_message"),
  // generated content
  headline:    text("headline"),
  primaryText: text("primary_text"),
  description: text("description"),
  mediaUrl:    text("media_url"),
  // approval state (independent of generation status)
  state:       text("state").$type<AdAssetState>().notNull().default("draft"),
  createdAt:   timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
});

export type AdAsset = typeof adAssets.$inferSelect;
export type NewAdAsset = typeof adAssets.$inferInsert;
