ALTER TABLE "outreach_messages" ADD COLUMN "gmail_message_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "reply_body" text;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "reply_received_at" timestamp with time zone;