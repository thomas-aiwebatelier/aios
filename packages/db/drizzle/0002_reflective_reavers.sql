CREATE TABLE "worker_heartbeats" (
	"worker_name" text PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"host_info" jsonb,
	"claimed_jobs_24h" integer DEFAULT 0 NOT NULL
);
