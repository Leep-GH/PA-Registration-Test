CREATE TABLE IF NOT EXISTS "change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"pdp_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"detected_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pdps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"registration_number" text,
	"registration_date" text,
	"website_url" text,
	"first_seen_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "pdps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scrape_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_at" text NOT NULL,
	"status" text,
	"pdps_found" integer,
	"changes_detected" integer DEFAULT 0,
	"error_message" text,
	"raw_html_path" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL,
	"token" text NOT NULL,
	"subscribed_at" text NOT NULL,
	"unsubscribed_at" text,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "subscribers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "change_events" ADD CONSTRAINT "change_events_pdp_id_pdps_id_fk" FOREIGN KEY ("pdp_id") REFERENCES "pdps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
