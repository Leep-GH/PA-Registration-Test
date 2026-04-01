-- Migration: add peppol_aps and cross_registry_links tables
-- Generated: 2026-03-30

CREATE TABLE IF NOT EXISTS "peppol_aps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text,
	"ap_certified" boolean DEFAULT false NOT NULL,
	"smp_certified" boolean DEFAULT false NOT NULL,
	"contact_name" text,
	"contact_email" text,
	"authority" text,
	"first_seen_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "peppol_aps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cross_registry_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"pdp_id" integer NOT NULL,
	"peppol_ap_id" integer NOT NULL,
	"match_score" integer NOT NULL,
	"matched_at" text NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_registry_links" ADD CONSTRAINT "cross_registry_links_pdp_id_pdps_id_fk" FOREIGN KEY ("pdp_id") REFERENCES "pdps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_registry_links" ADD CONSTRAINT "cross_registry_links_peppol_ap_id_peppol_aps_id_fk" FOREIGN KEY ("peppol_ap_id") REFERENCES "peppol_aps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
