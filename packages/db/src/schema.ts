import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

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

export const leads = sqliteTable("leads", {
  id:                               text("id").primaryKey(),
  slug:                             text("slug").notNull().unique(),
  status:                           text("status", { enum: leadStatusValues }).notNull(),
  businessName:                     text("business_name").notNull(),
  phone:                            text("phone"),
  email:                            text("email"),
  address:                          text("address"),
  city:                             text("city").notNull(),
  postalCode:                       text("postal_code"),
  googleMapsPlaceId:                text("google_maps_place_id").unique(),
  googleMapsUrl:                    text("google_maps_url"),
  existingWebsiteUrl:               text("existing_website_url"),
  websiteStalnessScore:             integer("website_staleness_score"),
  industryKey:                      text("industry_key").notNull(),
  industryClassificationConfidence: real("industry_classification_confidence"),
  language:                         text("language").default("nl"),
  createdAt:                        integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch('now') * 1000)`).$defaultFn(() => new Date()),
  updatedAt:                        integer("updated_at", { mode: "timestamp_ms" }).default(sql`(unixepoch('now') * 1000)`).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  approvedAt:                       integer("approved_at", { mode: "timestamp_ms" }),
  sentAt:                           integer("sent_at", { mode: "timestamp_ms" }),
  respondedAt:                      integer("responded_at", { mode: "timestamp_ms" }),
});

// ── brand_profiles ───────────────────────────────────────────────────────────

export const brandProfiles = sqliteTable("brand_profiles", {
  id:                text("id").primaryKey(),
  leadId:            text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  logoPath:          text("logo_path"),
  extractedPalette:  text("extracted_palette", { mode: "json" }).$type<string[]>(),
  primaryColor:      text("primary_color"),
  secondaryColor:    text("secondary_color"),
  accentColor:       text("accent_color"),
  fontsDetected:     text("fonts_detected", { mode: "json" }).$type<{ heading: string; body: string }>(),
  toneOfVoiceSummary: text("tone_of_voice_summary"),
  socialLinks:       text("social_links", { mode: "json" }).$type<Record<string, string>>(),
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

export const siteInventories = sqliteTable("site_inventories", {
  id:        text("id").primaryKey(),
  leadId:    text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  crawledAt: integer("crawled_at", { mode: "timestamp_ms" }).default(sql`(unixepoch('now') * 1000)`).$defaultFn(() => new Date()),
  pages:     text("pages", { mode: "json" }).$type<InventoryPage[]>(),
  assets:    text("assets", { mode: "json" }).$type<InventoryAsset[]>(),
});

// ── competitors ───────────────────────────────────────────────────────────────

export const competitors = sqliteTable("competitors", {
  id:               text("id").primaryKey(),
  leadId:           text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  competitorUrl:    text("competitor_url").notNull(),
  competitorName:   text("competitor_name"),
  selectionReason:  text("selection_reason"),
  structureSummary: text("structure_summary", { mode: "json" }).$type<Record<string, unknown>>(),
  learnings:        text("learnings"),
});

// ── generated_sites ───────────────────────────────────────────────────────────

export const generatedSiteCreatedViaValues = [
  "initial_generation",
  "prompt_edit",
] as const;

export const generatedSites = sqliteTable("generated_sites", {
  id:                       text("id").primaryKey(),
  leadId:                   text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  version:                  integer("version").notNull().default(1),
  astroProjectPath:         text("astro_project_path"),
  cloudflareProjectName:    text("cloudflare_project_name"),
  cloudflarePreviewUrl:     text("cloudflare_preview_url"),
  cloudflareDeploymentId:   text("cloudflare_deployment_id"),
  lighthouseScores:         text("lighthouse_scores", { mode: "json" }).$type<Record<string, number>>(),
  designSystemVersion:      text("design_system_version"),
  industryGuideVersion:     text("industry_guide_version"),
  createdAt:                integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch('now') * 1000)`).$defaultFn(() => new Date()),
  createdVia:               text("created_via", { enum: generatedSiteCreatedViaValues }).notNull(),
  promptUsed:               text("prompt_used"),
});

// ── outreach_messages ─────────────────────────────────────────────────────────

export const outreachDirectionValues = ["outbound", "inbound"] as const;
export const outreachStatusValues = ["draft", "sent", "bounced", "replied"] as const;

export const outreachMessages = sqliteTable("outreach_messages", {
  id:             text("id").primaryKey(),
  leadId:         text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  direction:      text("direction", { enum: outreachDirectionValues }).notNull(),
  subject:        text("subject"),
  body:           text("body"),
  gmailThreadId:  text("gmail_thread_id"),
  gmailMessageId: text("gmail_message_id"),
  status:         text("status", { enum: outreachStatusValues }).notNull().default("draft"),
  sentAt:         integer("sent_at", { mode: "timestamp_ms" }),
});

// ── pipeline_jobs ─────────────────────────────────────────────────────────────

export const pipelineJobStatusValues = [
  "queued",
  "running",
  "succeeded",
  "failed",
] as const;

export const pipelineJobs = sqliteTable("pipeline_jobs", {
  id:              text("id").primaryKey(),
  leadId:          text("lead_id").references(() => leads.id, { onDelete: "cascade" }),
  pipelineStep:    text("pipeline_step").notNull(),
  status:          text("status", { enum: pipelineJobStatusValues }).notNull().default("queued"),
  startedAt:       integer("started_at", { mode: "timestamp_ms" }),
  finishedAt:      integer("finished_at", { mode: "timestamp_ms" }),
  errorMessage:    text("error_message"),
  payload:         text("payload", { mode: "json" }).$type<Record<string, unknown>>(),
  attemptCount:    integer("attempt_count").notNull().default(0),
  lastHeartbeatAt: integer("last_heartbeat_at", { mode: "timestamp_ms" }),
  createdAt:       integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch('now') * 1000)`).$defaultFn(() => new Date()),
});

// ── inbound_inquiries ─────────────────────────────────────────────────────────

export const inboundInquiryStatusValues = [
  "new",
  "read",
  "replied",
  "archived",
] as const;

export const inboundInquiries = sqliteTable("inbound_inquiries", {
  id:        text("id").primaryKey(),
  name:      text("name"),
  email:     text("email"),
  message:   text("message"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(unixepoch('now') * 1000)`).$defaultFn(() => new Date()),
  status:    text("status", { enum: inboundInquiryStatusValues }).notNull().default("new"),
});
