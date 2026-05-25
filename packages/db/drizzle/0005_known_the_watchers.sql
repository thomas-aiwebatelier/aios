CREATE TABLE "lead_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"type" text NOT NULL,
	"body" text,
	"metadata" jsonb,
	"author" text DEFAULT 'thomas' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequence_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"step_number" integer NOT NULL,
	"angle" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"subject" text,
	"body" text,
	"outreach_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "angle" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_role" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "mobile_phone" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "sales_stage" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "next_action_note" text;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_outreach_message_id_outreach_messages_id_fk" FOREIGN KEY ("outreach_message_id") REFERENCES "public"."outreach_messages"("id") ON DELETE set null ON UPDATE no action;