CREATE TABLE "brand_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"logo_path" text,
	"extracted_palette" jsonb,
	"primary_color" text,
	"secondary_color" text,
	"accent_color" text,
	"fonts_detected" jsonb,
	"tone_of_voice_summary" text,
	"social_links" jsonb
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"competitor_url" text NOT NULL,
	"competitor_name" text,
	"selection_reason" text,
	"structure_summary" jsonb,
	"learnings" text
);
--> statement-breakpoint
CREATE TABLE "generated_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"astro_project_path" text,
	"cloudflare_project_name" text,
	"cloudflare_preview_url" text,
	"cloudflare_deployment_id" text,
	"lighthouse_scores" jsonb,
	"design_system_version" text,
	"industry_guide_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_via" text NOT NULL,
	"prompt_used" text
);
--> statement-breakpoint
CREATE TABLE "inbound_inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"business_name" text NOT NULL,
	"phone" text,
	"email" text,
	"address" text,
	"city" text NOT NULL,
	"postal_code" text,
	"google_maps_place_id" text,
	"google_maps_url" text,
	"existing_website_url" text,
	"website_staleness_score" integer,
	"industry_key" text NOT NULL,
	"industry_classification_confidence" double precision,
	"language" text DEFAULT 'nl',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	CONSTRAINT "leads_slug_unique" UNIQUE("slug"),
	CONSTRAINT "leads_google_maps_place_id_unique" UNIQUE("google_maps_place_id")
);
--> statement-breakpoint
CREATE TABLE "outreach_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"direction" text NOT NULL,
	"subject" text,
	"body" text,
	"gmail_thread_id" text,
	"gmail_message_id" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pipeline_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text,
	"pipeline_step" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error_message" text,
	"payload" jsonb,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_inventories" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"crawled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pages" jsonb,
	"assets" jsonb
);
--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD CONSTRAINT "brand_profiles_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_sites" ADD CONSTRAINT "generated_sites_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_jobs" ADD CONSTRAINT "pipeline_jobs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_inventories" ADD CONSTRAINT "site_inventories_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;