PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_generated_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`astro_project_path` text,
	`cloudflare_project_name` text,
	`cloudflare_preview_url` text,
	`cloudflare_deployment_id` text,
	`lighthouse_scores` text,
	`design_system_version` text,
	`industry_guide_version` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000),
	`created_via` text NOT NULL,
	`prompt_used` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_generated_sites`("id", "lead_id", "version", "astro_project_path", "cloudflare_project_name", "cloudflare_preview_url", "cloudflare_deployment_id", "lighthouse_scores", "design_system_version", "industry_guide_version", "created_at", "created_via", "prompt_used") SELECT "id", "lead_id", "version", "astro_project_path", "cloudflare_project_name", "cloudflare_preview_url", "cloudflare_deployment_id", "lighthouse_scores", "design_system_version", "industry_guide_version", "created_at", "created_via", "prompt_used" FROM `generated_sites`;--> statement-breakpoint
DROP TABLE `generated_sites`;--> statement-breakpoint
ALTER TABLE `__new_generated_sites` RENAME TO `generated_sites`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_inbound_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`message` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000),
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_inbound_inquiries`("id", "name", "email", "message", "created_at", "status") SELECT "id", "name", "email", "message", "created_at", "status" FROM `inbound_inquiries`;--> statement-breakpoint
DROP TABLE `inbound_inquiries`;--> statement-breakpoint
ALTER TABLE `__new_inbound_inquiries` RENAME TO `inbound_inquiries`;--> statement-breakpoint
CREATE TABLE `__new_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`status` text NOT NULL,
	`business_name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`city` text NOT NULL,
	`postal_code` text,
	`google_maps_place_id` text,
	`google_maps_url` text,
	`existing_website_url` text,
	`website_staleness_score` integer,
	`industry_key` text NOT NULL,
	`industry_classification_confidence` real,
	`language` text DEFAULT 'nl',
	`created_at` integer DEFAULT (unixepoch('now') * 1000),
	`updated_at` integer DEFAULT (unixepoch('now') * 1000),
	`approved_at` integer,
	`sent_at` integer,
	`responded_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_leads`("id", "slug", "status", "business_name", "phone", "email", "address", "city", "postal_code", "google_maps_place_id", "google_maps_url", "existing_website_url", "website_staleness_score", "industry_key", "industry_classification_confidence", "language", "created_at", "updated_at", "approved_at", "sent_at", "responded_at") SELECT "id", "slug", "status", "business_name", "phone", "email", "address", "city", "postal_code", "google_maps_place_id", "google_maps_url", "existing_website_url", "website_staleness_score", "industry_key", "industry_classification_confidence", "language", "created_at", "updated_at", "approved_at", "sent_at", "responded_at" FROM `leads`;--> statement-breakpoint
DROP TABLE `leads`;--> statement-breakpoint
ALTER TABLE `__new_leads` RENAME TO `leads`;--> statement-breakpoint
CREATE UNIQUE INDEX `leads_slug_unique` ON `leads` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `leads_google_maps_place_id_unique` ON `leads` (`google_maps_place_id`);--> statement-breakpoint
CREATE TABLE `__new_pipeline_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`pipeline_step` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`error_message` text,
	`payload` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`last_heartbeat_at` integer,
	`created_at` integer DEFAULT (unixepoch('now') * 1000),
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_pipeline_jobs`("id", "lead_id", "pipeline_step", "status", "started_at", "finished_at", "error_message", "payload", "attempt_count", "last_heartbeat_at", "created_at") SELECT "id", "lead_id", "pipeline_step", "status", "started_at", "finished_at", "error_message", "payload", "attempt_count", "last_heartbeat_at", "created_at" FROM `pipeline_jobs`;--> statement-breakpoint
DROP TABLE `pipeline_jobs`;--> statement-breakpoint
ALTER TABLE `__new_pipeline_jobs` RENAME TO `pipeline_jobs`;--> statement-breakpoint
CREATE TABLE `__new_site_inventories` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`crawled_at` integer DEFAULT (unixepoch('now') * 1000),
	`pages` text,
	`assets` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_site_inventories`("id", "lead_id", "crawled_at", "pages", "assets") SELECT "id", "lead_id", "crawled_at", "pages", "assets" FROM `site_inventories`;--> statement-breakpoint
DROP TABLE `site_inventories`;--> statement-breakpoint
ALTER TABLE `__new_site_inventories` RENAME TO `site_inventories`;