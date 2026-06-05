CREATE TABLE "ad_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"prompt" text NOT NULL,
	"placement" text,
	"format" text,
	"aspect_ratio" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"headline" text,
	"primary_text" text,
	"description" text,
	"media_url" text,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_assets" ADD CONSTRAINT "ad_assets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;