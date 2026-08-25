CREATE TABLE "lead_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"user_id" text,
	"status" text DEFAULT 'new' NOT NULL,
	"source_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_deliverables" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'requested' NOT NULL,
	"duration_seconds" integer,
	"video_url" text,
	"poster_url" text,
	"notes" text,
	"studio_project_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "lead_intents_status_idx" ON "lead_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_intents_service_idx" ON "lead_intents" USING btree ("service");--> statement-breakpoint
CREATE INDEX "lead_intents_user_idx" ON "lead_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lead_intents_email_idx" ON "lead_intents" USING btree ("email");--> statement-breakpoint
CREATE INDEX "video_deliverables_owner_idx" ON "video_deliverables" USING btree ("owner_user_id");