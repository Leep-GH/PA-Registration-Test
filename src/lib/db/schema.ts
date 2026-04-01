import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// pdps — current state of each platform
// ---------------------------------------------------------------------------
export const pdps = pgTable('pdps', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  /** 'registered' | 'candidate' | 'removed' */
  status: text('status', { enum: ['registered', 'candidate', 'removed'] }).notNull(),
  /** Full status text for tooltips, e.g. "Complete file — awaiting interoperability tests" */
  statusText: text('status_text'),
  registrationNumber: text('registration_number'),
  registrationDate: text('registration_date'),
  websiteUrl: text('website_url'),
  physicalAddress: text('physical_address'),
  contactEmail: text('contact_email'),
  /** ISO 8601 — set on INSERT, never updated */
  firstSeenAt: text('first_seen_at').notNull(),
  /** ISO 8601 — updated to run_at on every successful scrape where PDP appears */
  lastSeenAt: text('last_seen_at').notNull(),
  /** true = on registry; false = soft-deleted */
  isActive: boolean('is_active').notNull().default(true),
});

// ---------------------------------------------------------------------------
// change_events — immutable audit log
// ---------------------------------------------------------------------------
export const changeEvents = pgTable('change_events', {
  id: serial('id').primaryKey(),
  pdpId: integer('pdp_id')
    .notNull()
    .references(() => pdps.id),
  eventType: text('event_type', {
    enum: ['added', 'removed', 'status_changed'],
  }).notNull(),
  /** JSON snapshot of previous state; null for 'added' events */
  oldValue: text('old_value'),
  /** JSON snapshot of new state; null for 'removed' events */
  newValue: text('new_value'),
  /** ISO 8601 — timestamp of the scrape run that detected this change */
  detectedAt: text('detected_at').notNull(),
});

// ---------------------------------------------------------------------------
// scrape_runs — operational audit trail
// ---------------------------------------------------------------------------
export const scrapeRuns = pgTable('scrape_runs', {
  id: serial('id').primaryKey(),
  /** ISO 8601 — when the run started */
  runAt: text('run_at').notNull(),
  /** null = in-progress sentinel; 'success' | 'failed' | 'no_change' = completed */
  status: text('status', { enum: ['success', 'failed', 'no_change'] }),
  /** PDPs returned by parser; null if fetch/parse did not complete */
  pdpsFound: integer('pdps_found'),
  changesDetected: integer('changes_detected').default(0),
  errorMessage: text('error_message'),
  rawHtmlPath: text('raw_html_path'),
});

// ---------------------------------------------------------------------------
// subscribers — newsletter opt-in (GDPR-compliant)
// ---------------------------------------------------------------------------
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  /** PII — never logged, never returned in API responses */
  email: text('email').notNull().unique(),
  /** 0 = pending double opt-in; 1 = confirmed */
  confirmed: boolean('confirmed').notNull().default(false),
  /** crypto.randomBytes(32).toString('hex') — used for confirm + unsubscribe */
  token: text('token').notNull().unique(),
  subscribedAt: text('subscribed_at').notNull(),
  /** ISO 8601; null = still subscribed */
  unsubscribedAt: text('unsubscribed_at'),
});

// ---------------------------------------------------------------------------
// peppol_aps — certified Peppol Access Points from peppol.org
// ---------------------------------------------------------------------------
export const peppolAps = pgTable('peppol_aps', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  /** Country/territory of legal residence */
  country: text('country'),
  /** Is certified as an Access Point */
  apCertified: boolean('ap_certified').notNull().default(false),
  /** Is certified as a Service Metadata Publisher */
  smpCertified: boolean('smp_certified').notNull().default(false),
  /** PII — never logged */
  contactName: text('contact_name'),
  /** PII — never logged, never returned to clients */
  contactEmail: text('contact_email'),
  /** Peppol Authority code, e.g. 'DGFIP', 'BOSA', 'AGID', 'KoSIT' */
  authority: text('authority'),
  /** ISO 8601 — set on INSERT, immutable */
  firstSeenAt: text('first_seen_at').notNull(),
  /** ISO 8601 — updated on every scrape where AP appears */
  lastSeenAt: text('last_seen_at').notNull(),
  /** true = on registry; false = soft-deleted */
  isActive: boolean('is_active').notNull().default(true),
});

// ---------------------------------------------------------------------------
// cross_registry_links — fuzzy-matched links between pdps and peppol_aps
// ---------------------------------------------------------------------------
export const crossRegistryLinks = pgTable('cross_registry_links', {
  id: serial('id').primaryKey(),
  pdpId: integer('pdp_id')
    .notNull()
    .references(() => pdps.id),
  peppolApId: integer('peppol_ap_id')
    .notNull()
    .references(() => peppolAps.id),
  /** Normalised similarity score 0–100 */
  matchScore: integer('match_score').notNull(),
  /** ISO 8601 — when this match was computed */
  matchedAt: text('matched_at').notNull(),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript types
// ---------------------------------------------------------------------------
export type Pdp = typeof pdps.$inferSelect;
export type NewPdp = typeof pdps.$inferInsert;
export type ChangeEvent = typeof changeEvents.$inferSelect;
export type NewChangeEvent = typeof changeEvents.$inferInsert;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type NewScrapeRun = typeof scrapeRuns.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
export type PeppolAp = typeof peppolAps.$inferSelect;
export type NewPeppolAp = typeof peppolAps.$inferInsert;
export type CrossRegistryLink = typeof crossRegistryLinks.$inferSelect;
export type NewCrossRegistryLink = typeof crossRegistryLinks.$inferInsert;
