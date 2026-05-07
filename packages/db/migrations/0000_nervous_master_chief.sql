CREATE TABLE `brand_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`logo_path` text,
	`extracted_palette` text,
	`primary_color` text,
	`secondary_color` text,
	`accent_color` text,
	`fonts_detected` text,
	`tone_of_voice_summary` text,
	`social_links` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `competitors` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`competitor_url` text NOT NULL,
	`competitor_name` text,
	`selection_reason` text,
	`structure_summary` text,
	`learnings` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `generated_sites` (
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
	`created_at` integer,
	`created_via` text NOT NULL,
	`prompt_used` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inbound_inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`message` text,
	`created_at` integer,
	`status` text DEFAULT 'new' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
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
	`created_at` integer,
	`updated_at` integer,
	`approved_at` integer,
	`sent_at` integer,
	`responded_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_slug_unique` ON `leads` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `leads_google_maps_place_id_unique` ON `leads` (`google_maps_place_id`);--> statement-breakpoint
CREATE TABLE `outreach_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`direction` text NOT NULL,
	`subject` text,
	`body` text,
	`gmail_thread_id` text,
	`gmail_message_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pipeline_jobs` (
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
	`created_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `site_inventories` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`crawled_at` integer,
	`pages` text,
	`assets` text,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
