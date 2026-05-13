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
} from "drizzle-orm/pg-core";

// ── leads ────────────────────────────────────────────────────────────────────

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
  websiteStalenessScore:            integer("website_staleness_score"),
  industryKey:                      text("industry_key").notNull(),
  industryClassificationConfidence: doublePrecision("industry_classification_confidence"),
  language:                         text("language").default("nl"),
  createdAt:                        timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:                        timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
  approvedAt:                       timestamp("approved_at", { withTimezone: true, mode: "date" }),
  sentAt:                           timestamp("sent_at", { withTimezone: true, mode: "date" }),
  respondedAt:                      timestamp("responded_at", { withTimezone: true, mode: "date" }),
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
});

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
