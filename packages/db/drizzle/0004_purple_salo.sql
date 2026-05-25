CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
