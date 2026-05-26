ALTER TABLE "brand_profiles" ADD COLUMN "photo_paths" jsonb;--> statement-breakpoint
ALTER TABLE "brand_profiles" ADD COLUMN "logo_source" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "google_photo_refs" jsonb;