-- Migration: enable Row Level Security on all public tables
-- Fixes: Supabase security alerts — RLS not enabled, sensitive data publicly accessible via API
-- Applied: 2026-04-01

-- ---------------------------------------------------------------------------
-- Step 1: Enable RLS on ALL tables
-- When RLS is enabled with no policies, the default is DENY for all roles
-- except the Supabase service_role, which bypasses RLS entirely.
-- ---------------------------------------------------------------------------
ALTER TABLE pdps ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE change_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE peppol_aps ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE cross_registry_links ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Step 2: Public read-only policies for registry/audit tables (anon role)
-- These tables contain data sourced from public government/Peppol registries.
-- SELECT is granted to the anonymous role; INSERT/UPDATE/DELETE are implicitly
-- denied — all writes go through the server-side service_role which bypasses RLS.
-- ---------------------------------------------------------------------------
CREATE POLICY "pdps_public_read"
  ON pdps FOR SELECT TO anon USING (true);
--> statement-breakpoint

CREATE POLICY "change_events_public_read"
  ON change_events FOR SELECT TO anon USING (true);
--> statement-breakpoint

CREATE POLICY "scrape_runs_public_read"
  ON scrape_runs FOR SELECT TO anon USING (true);
--> statement-breakpoint

CREATE POLICY "peppol_aps_public_read"
  ON peppol_aps FOR SELECT TO anon USING (true);
--> statement-breakpoint

CREATE POLICY "cross_registry_links_public_read"
  ON cross_registry_links FOR SELECT TO anon USING (true);

-- ---------------------------------------------------------------------------
-- Step 3: subscribers — zero public access
-- This table contains PII (email) and a security-sensitive token used for
-- double opt-in confirmation and unsubscribe flows.
-- NO policies are created for the anon role. When RLS is enabled with no
-- matching policy, PostgreSQL denies the request by default.
-- Server-side code uses the service_role credential which bypasses RLS.
-- ---------------------------------------------------------------------------
-- *** Intentionally no policies for subscribers — default DENY for anon ***

