CREATE TABLE "operate_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_id" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"intake" jsonb,
	"brief" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"full_name" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "operate_projects" ADD CONSTRAINT "operate_projects_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;