# PDP Registry Tracker — Technical Design

**Date:** 2026-03-26
**Author:** Architect Agent
**Status:** Draft
**Service Type:** Mixed (Web App + Scheduled ETL + Public REST API)

---

## Summary

PDP Registry Tracker is a public web application that monitors the DGFiP (Direction Générale des Finances Publiques) official list of certified e-invoicing platforms (Plateformes de Dématérialisation Partenaires). The application scrapes the DGFiP website once daily at 07:00 CET, persists a complete change history, and presents the data via a clean dashboard, a public REST API, and an RSS feed. The target audience is finance professionals, ERP vendors, and developers who need to track which platforms are currently registered, newly admitted, or revoked. The application has no authentication layer for public users — all public data is freely accessible.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GitHub Actions (Cron)                           │
│   schedule: '0 5 * * *'  (05:00 UTC ≡ ≥07:00 CET year-round)       │
│   POST /api/admin/trigger-scrape  (Bearer ADMIN_SCRAPE_TOKEN)        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Vercel — Next.js 14 App                          │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     Next.js App Router                         │  │
│  │  Pages:  /   /historique   /pdp/[slug]   /privacy             │  │
│  │  API:    /api/v1/*   /api/admin/*   /rss.xml                  │  │
│  └──────────────────┬──────────────────────────────┬─────────────┘  │
│                     │                              │                 │
│  ┌──────────────────┼──────────────────────────────┼─────────────┐  │
│  │                  ▼          src/lib/             ▼             │  │
│  │  ┌──────────────────────┐        ┌────────────────────────┐   │  │
│  │  │       Scraper        │        │    Notification Engine  │   │  │
│  │  │  fetcher.ts          │        │    interface.ts (stub)  │   │  │
│  │  │  parser.ts (Cheerio) ├──┐     │    rss.ts               │   │  │
│  │  │  playwright.ts (fbk) │  │     └────────────────────────┘   │  │
│  │  │  snapshot.ts         │  │                                   │  │
│  │  │  index.ts (orch.)    │  │     ┌────────────────────────┐   │  │
│  │  └──────────────────────┘  │     │      Safety Module      │   │  │
│  │                            │     │  empty list guard       │   │  │
│  │  ┌──────────────────────┐  │     │  >50% drop guard        │   │  │
│  │  │     Diff Engine      │◄─┘     └────────────────────────┘   │  │
│  │  │  index.ts            │                                      │  │
│  │  └────────┬─────────────┘                                      │  │
│  │           │ ChangeEvent[]                                       │  │
│  │           ▼                                                     │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │                  DB Layer (Drizzle ORM)                   │  │  │
│  │  │   pdps   change_events   scrape_runs   subscribers        │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Snapshot Storage:                                                   │
│    dev  → ./snapshots/{YYYY-MM-DD}.html   (local filesystem)        │
│    prod → Vercel Blob URL                 (SNAPSHOT_STORAGE=blob)   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ TLS
                               ▼
              ┌─────────────────────────────────┐
              │   PostgreSQL (prod)              │
              │   Railway or Supabase            │
              ├─────────────────────────────────┤
              │   SQLite (dev)                   │
              │   ./data/pdp-tracker.db          │
              └─────────────────────────────────┘

Outbound HTTP (scraper):
  GET https://www.impots.gouv.fr/{pdp-registry-path}
  User-Agent: SCRAPER_USER_AGENT  (includes operator contact)
  Fallback:  https://www.data.gouv.fr/  (structured dataset if available)
  Fallback parser: Playwright (if Cheerio returns empty result)
```

---

## Components

| Component | Type | Purpose | Dependencies |
|-----------|------|---------|-------------|
| `Scraper / Fetcher` | Library module | HTTP GET with configurable timeout, User-Agent header, and 4h-delayed retry signalling | Node.js native `fetch` |
| `Scraper / Parser` | Library module | Cheerio HTML parser; implements `ParserInterface`; isolated so it can be replaced without touching callers | `cheerio` |
| `Scraper / Playwright Fallback` | Library module | Browser-rendered HTML parser; implements `ParserInterface`; activated when Cheerio returns 0 results | `playwright` |
| `Scraper / Snapshot` | Library module | Writes raw HTML to local filesystem (dev) or Vercel Blob (prod); controlled by `SNAPSHOT_STORAGE` env var | `@vercel/blob` |
| `Scraper / Orchestrator` | Library module | Coordinates: fetch → parse → safety-check → snapshot → diff → persist; records `scrape_runs` entry | All scraper sub-modules |
| `Safety Module` | Library module | Two guards: (1) empty list aborts write, (2) >50% drop aborts write; both log and alert admin | DB repositories |
| `Diff Engine` | Library module | Compares freshly-parsed `PdpRecord[]` against current DB state; returns `ChangeEvent[]` | DB / `pdps` repository |
| `Notification Engine` | Library module | Provider-agnostic `NotificationService` interface; `ConsoleSink` stub in v1; real provider dropped in later | `NotificationService` interface |
| `RSS Generator` | Library module | Builds RSS 2.0 XML string from recent `change_events` | DB / `changes` repository |
| `DB Layer` | Drizzle ORM | Schema definitions, migrations, typed query helpers for all four tables | `drizzle-orm`, `postgres`, `better-sqlite3` |
| `Web Pages` | Next.js App Router | Dashboard (`/`), history (`/historique`), PDP detail (`/pdp/[slug]`), privacy (`/privacy`) | React, Tailwind CSS, DB layer |
| `Public API` | Next.js Route Handlers | `/api/v1/*` — read-only, no auth; standard JSON responses | DB layer |
| `Admin API` | Next.js Route Handler | `/api/admin/trigger-scrape` — token-protected POST | Scraper orchestrator |
| `Scheduler` | GitHub Actions workflow | Calls admin endpoint daily at 05:00 UTC; retry on failure (max 2, 4h apart) | ADMIN_SCRAPE_TOKEN (GH Secret) |

---

## Data Model

### `pdps` — current state of each platform

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK AUTOINCREMENT | Surrogate key |
| `name` | TEXT | NOT NULL | Display name exactly as published by DGFiP |
| `slug` | TEXT | UNIQUE NOT NULL | URL-safe kebab-case derived from `name`; stable across renames |
| `status` | TEXT | NOT NULL | `'registered'` \| `'candidate'` \| `'removed'` |
| `registration_number` | TEXT | nullable | Populated when DGFiP publishes it; nullable per Assumption #4 |
| `registration_date` | TEXT | nullable | ISO 8601; nullable per Assumption #4 |
| `website_url` | TEXT | nullable | Platform's public URL |
| `first_seen_at` | TEXT | NOT NULL | ISO 8601; set on INSERT, never updated |
| `last_seen_at` | TEXT | NOT NULL | ISO 8601; updated to `run_at` on every successful scrape where PDP appears |
| `is_active` | INTEGER | NOT NULL DEFAULT 1 | `1` = on registry; `0` = removed (soft-delete) |

**Rationale:** Soft-delete via `is_active` preserves full history and stable `/pdp/[slug]` URLs after removal. `slug` is derived once on first insertion; a rename creates a `status_changed` event but the slug remains stable to avoid breaking bookmarks.

### `change_events` — immutable audit log

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK AUTOINCREMENT | Surrogate key |
| `pdp_id` | INTEGER | FK → `pdps.id` | Which PDP changed |
| `event_type` | TEXT | NOT NULL | `'added'` \| `'removed'` \| `'status_changed'` |
| `old_value` | TEXT | nullable | JSON snapshot of previous state; `null` for `'added'` |
| `new_value` | TEXT | nullable | JSON snapshot of new state; `null` for `'removed'` |
| `detected_at` | TEXT | NOT NULL | ISO 8601; timestamp of the scrape run that detected this change |

**Rationale:** Storing `old_value`/`new_value` as JSON avoids schema migrations when PDP attributes are extended. The table is append-only; no UPDATE or DELETE operations are permitted by application logic.

### `scrape_runs` — operational audit trail

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK AUTOINCREMENT | Surrogate key |
| `run_at` | TEXT | NOT NULL | ISO 8601; when the run started |
| `status` | TEXT | NOT NULL | `'success'` \| `'failed'` \| `'no_change'` |
| `pdps_found` | INTEGER | nullable | PDPs returned by parser; `null` if fetch/parse did not complete |
| `changes_detected` | INTEGER | DEFAULT 0 | Count of `change_events` inserted this run |
| `error_message` | TEXT | nullable | Failure detail without stack trace; `null` on success |
| `raw_html_path` | TEXT | nullable | Filesystem path (dev) or Vercel Blob URL (prod); `null` if snapshot failed |

**Rationale:** Every run is recorded regardless of outcome. Used by dead man's switch, admin status endpoint, and post-hoc debugging.

### `subscribers` — newsletter opt-in (GDPR-compliant)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK AUTOINCREMENT | Surrogate key |
| `email` | TEXT | UNIQUE NOT NULL | PII — never logged, never returned in API responses |
| `confirmed` | INTEGER | NOT NULL DEFAULT 0 | `0` = pending double opt-in; `1` = confirmed |
| `token` | TEXT | UNIQUE NOT NULL | `crypto.randomBytes(32).toString('hex')`; used for confirm + unsubscribe links |
| `subscribed_at` | TEXT | NOT NULL | ISO 8601 |
| `unsubscribed_at` | TEXT | nullable | ISO 8601; soft-delete; `null` if still subscribed |

**Rationale:** Token-based unsubscribe requires no auth. Soft-delete preserves record for GDPR evidence of consent and withdrawal. Unconfirmed subscribers are purged after 48 hours by a cleanup job.

### Relationships

- `change_events.pdp_id` → `pdps.id` (FK; no CASCADE DELETE — history must outlive is_active=0 state)
- `scrape_runs` and `change_events` are correlated by `detected_at` timestamp (intentionally no FK — run record still created if scrape fails before any change is detected)

---

## API Surface

| Method | Path | Description | Auth | Notes |
|--------|------|-------------|------|-------|
| GET | `/api/v1/pdps` | List all PDPs (active and removed) | None | Query params: `status`, `is_active` |
| GET | `/api/v1/pdps/[slug]` | PDP detail + full change history | None | 404 if slug not found |
| GET | `/api/v1/changes` | Paginated change events | None | Query params: `since` (ISO 8601), `type`, `limit` (max 200, default 50), `offset` (default 0) |
| GET | `/api/v1/changes/latest` | Changes from most recent successful scrape run | None | Returns empty array if no changes in latest run |
| GET | `/api/v1/status` | Scraper health: last run, status, next expected run, dead man's switch state | None | Triggers dead man's switch check on each call |
| POST | `/api/admin/trigger-scrape` | Manually trigger a scrape run | Bearer `ADMIN_SCRAPE_TOKEN` | Returns 409 if run already in progress; idempotent otherwise |
| GET | `/rss.xml` | RSS 2.0 feed of change events (most recent 50) | None | `Content-Type: application/rss+xml` |

All API responses use `Content-Type: application/json`. Error responses: `{ "error": "...", "status": <code> }`. Stack traces are never included in responses.

---

## Project Directory Structure

```
pdp-tracker/
├── .github/
│   └── workflows/
│       └── scrape.yml               # Cron: 05:00 UTC daily; POST admin endpoint; retry x2 (4h apart)
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout: Tailwind, metadata, no tracking cookies
│   │   ├── page.tsx                 # Dashboard: PDP table + summary stats + newsletter signup
│   │   ├── historique/
│   │   │   └── page.tsx             # Changelog timeline
│   │   ├── pdp/
│   │   │   └── [slug]/
│   │   │       └── page.tsx         # PDP detail: info + change history
│   │   ├── privacy/
│   │   │   └── page.tsx             # GDPR privacy notice
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── pdps/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── changes/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── latest/
│   │   │   │   │       └── route.ts
│   │   │   │   └── status/
│   │   │   │       └── route.ts
│   │   │   └── admin/
│   │   │       └── trigger-scrape/
│   │   │           └── route.ts     # Token-protected; calls scraper orchestrator
│   │   └── rss.xml/
│   │       └── route.ts             # Dynamic RSS 2.0 feed
│   │
│   ├── lib/
│   │   ├── scraper/
│   │   │   ├── types.ts             # PdpRecord, ParserInterface, ScraperResult, ScrapeRun
│   │   │   ├── fetcher.ts           # fetch() with User-Agent, timeout (15s), failure signalling
│   │   │   ├── parser.ts            # Cheerio parser; implements ParserInterface
│   │   │   ├── playwright.ts        # Playwright fallback; implements ParserInterface
│   │   │   ├── snapshot.ts          # Storage abstraction: local | blob | db
│   │   │   └── index.ts             # Orchestrator: fetch → parse → safety → snapshot → diff → persist
│   │   ├── diff/
│   │   │   └── index.ts             # compare(scraped: PdpRecord[], current: Pdp[]) → ChangeEvent[]
│   │   ├── safety/
│   │   │   └── index.ts             # checkSafety(found, dbCount): throws SafetyCheckError on violation
│   │   ├── notifications/
│   │   │   ├── interface.ts         # NotificationService: send(subject, body, recipients)
│   │   │   ├── console.ts           # ConsoleSink: logs to stdout (v1 stub)
│   │   │   └── rss.ts               # buildRssFeed(changes: ChangeEvent[]): string
│   │   └── db/
│   │       ├── index.ts             # createDb(): returns Drizzle client (SQLite or PG based on env)
│   │       ├── schema.ts            # Drizzle table definitions for all 4 tables
│   │       ├── migrations/          # Generated by drizzle-kit; committed to source
│   │       └── repositories/
│   │           ├── pdps.ts          # upsertPdp, getAllPdps, getPdpBySlug, setPdpInactive
│   │           ├── changes.ts       # insertChangeEvent, getChanges, getLatestRunChanges
│   │           ├── runs.ts          # insertRun, updateRun, getLastSuccessfulRun
│   │           └── subscribers.ts   # insertSubscriber, confirmSubscriber, unsubscribe, purgeUnconfirmed
│   │
│   └── components/
│       ├── pdp-table.tsx            # Sortable data table for active PDPs
│       ├── change-timeline.tsx      # Timeline of ChangeEvent records
│       ├── stats-bar.tsx            # Summary: total active, added this month, removed this month
│       └── subscribe-form.tsx       # Newsletter signup; POST to subscribe server action
│
├── scripts/
│   └── run-scrape.ts                # Standalone: npx tsx scripts/run-scrape.ts (dev/CI)
│
├── snapshots/                       # Raw HTML files (dev only; gitignored)
├── data/                            # SQLite DB (dev only; gitignored)
├── .env.example                     # All env vars with descriptions and example values
├── .env.local                       # Git-ignored local overrides
├── drizzle.config.ts                # drizzle-kit config
├── next.config.ts                   # Next.js config (revalidation, headers)
├── tailwind.config.ts               # Tailwind config
├── tsconfig.json
├── package.json
└── README.md
```

---

## Configuration (Environment Variables)

| Variable | Required | Dev Default | Description |
|----------|----------|-------------|-------------|
| `DATABASE_URL` | Yes | `file:./data/pdp-tracker.db` | PostgreSQL connection string (prod) or SQLite path (dev) |
| `DATABASE_TYPE` | Yes | `sqlite` | `sqlite` or `postgresql` — selects Drizzle driver |
| `ADMIN_SCRAPE_TOKEN` | Yes | *(generate locally)* | Secret token for admin endpoint; min 32 chars; cryptographically random (`openssl rand -hex 32`) |
| `DGFIP_PDP_URL` | Yes | — | **Must be set at build time by Developer** — exact URL of DGFiP PDP registry page (see Assumption #2) |
| `SCRAPER_USER_AGENT` | Yes | — | UA string, e.g. `pdp-tracker/1.0 (https://yoursite.com; contact@yoursite.com)` |
| `SNAPSHOT_STORAGE` | No | `local` | `local` (dev) \| `blob` (Vercel Blob, prod) \| `db` (store in DB as fallback) |
| `BLOB_READ_WRITE_TOKEN` | Conditional | — | Required when `SNAPSHOT_STORAGE=blob` (from Vercel Blob settings) |
| `SNAPSHOT_RETENTION_DAYS` | No | `90` | Days to retain raw HTML snapshots; cleanup job honours this |
| `SAFETY_DROP_THRESHOLD` | No | `0.5` | Fraction (0–1); scrape is blocked if parsed count drops by more than this vs DB count |
| `SAFETY_CHECK_OVERRIDE` | No | `false` | Set `true` to bypass safety check for a single run (admin use only; never commit) |
| `NOTIFICATION_PROVIDER` | No | `console` | `console` \| `resend` \| `sendgrid` |
| `RESEND_API_KEY` | Conditional | — | Required when `NOTIFICATION_PROVIDER=resend` |
| `SENDGRID_API_KEY` | Conditional | — | Required when `NOTIFICATION_PROVIDER=sendgrid` |
| `FROM_EMAIL` | Conditional | — | Sender address for outbound emails; required when provider is not `console` |
| `ADMIN_ALERT_EMAIL` | Yes (prod) | — | Recipient for dead man's switch and safety-check alerts |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Canonical base URL; used in RSS links, unsubscribe URLs, OG tags |

---

## Error Handling Strategy

### Scraper Error Hierarchy

1. **Network failure / non-200 response (including 429, 503):**
   - Record `scrape_runs` entry with `status='failed'` and `error_message`.
   - Do not modify any `pdps` or `change_events` rows.
   - Signal failure to GitHub Actions step (exit non-zero); GH Actions retries after 4 hours (max 2 retries).
   - After all retries exhausted, dead man's switch starts 48h countdown.

2. **Parser returns empty list:**
   - `checkSafety()` throws `SafetyCheckError("Parser returned 0 PDPs")`.
   - Orchestrator catches, records `status='failed'`, sends alert to `ADMIN_ALERT_EMAIL`.
   - DB state is never modified.

3. **Parser returns >50% fewer PDPs than current DB count:**
   - `checkSafety()` throws `SafetyCheckError("Drop threshold exceeded: N found vs M in DB")`.
   - Same outcome as empty list: no DB write, admin alert.
   - Admin may set `SAFETY_CHECK_OVERRIDE=true` and re-trigger manually after reviewing source page.

4. **Cheerio returns 0 results, Playwright fallback attempted:**
   - Playwright is invoked only if Cheerio result is empty and `PLAYWRIGHT_FALLBACK=true` (env flag).
   - If Playwright also returns 0: safety check fires, run is `failed`.
   - Note: Playwright cannot run on Vercel serverless. If it becomes mandatory, move to Railway worker (see ADR-001).

5. **Snapshot write failure:**
   - Non-fatal. Wrapped in try/catch. Log warning: `"Snapshot write failed: {reason}"`.
   - Scrape run continues normally. `raw_html_path` recorded as `null`.

### API Error Responses

All route handlers return consistent JSON:

```json
{ "error": "Resource not found", "status": 404 }
```

- `404` — PDP slug not found
- `400` — Invalid query parameters (include details of which param failed)
- `401` — Missing or invalid `Authorization` header on admin endpoint
- `409` — Scrape already in progress (idempotency guard)
- `500` — Unexpected server error (message: `"Internal server error"` — no stack trace)

### Dead Man's Switch

`/api/v1/status` and the GitHub Actions post-run step both query `scrape_runs` for the most recent entry with `status='success'`. If `run_at` is more than 48 hours ago (or no successful run exists at all):
- Log: `"Dead man's switch triggered: last success was {timestamp} ({hours}h ago)"`
- Send alert via configured `NotificationService` to `ADMIN_ALERT_EMAIL`
- `/api/v1/status` response includes `"alert": "No successful scrape in 48h"` field

### In-Progress Guard

The admin endpoint checks a lightweight in-progress flag (a `scrape_runs` row with `status=null` / an in-memory mutex) before starting a new run. Returns `409 Conflict` if a run is already executing. This prevents GH Actions retry from triggering a second parallel run.

---

## Security Perimeter

```
Internet
  │
  ├── Public browsers ─────── HTTPS ──► Vercel Edge CDN
  │                                         │
  │                                   Next.js App Router
  │                                     │
  │                                     ├── Public routes (no auth):
  │                                     │     /  /historique  /pdp/*
  │                                     │     /privacy  /rss.xml
  │                                     │     /api/v1/*
  │                                     │     (Vercel rate limiting: 100 req/min/IP)
  │                                     │
  │                                     └── Admin route (token guard):
  │                                           /api/admin/trigger-scrape
  │                                           Authorization: Bearer <ADMIN_SCRAPE_TOKEN>
  │                                           crypto.timingSafeEqual() comparison
  │                                           Rate limit: 5 req/min/IP
  │
  └── GitHub Actions ────────── HTTPS ──► /api/admin/trigger-scrape
                                          (ADMIN_SCRAPE_TOKEN from GH Secrets)

Scraper (outbound):
  Next.js Vercel Function ──── HTTPS GET ──► DGFiP website
                                             (polite; single request; custom UA)

Database:
  Next.js ──── TLS ──► PostgreSQL (Railway/Supabase)
  (connection string from Vercel env vars; never in source)
```

1. **Authentication:** Only `POST /api/admin/trigger-scrape` is authenticated. Bearer token passed in `Authorization` header. No public user authentication.
2. **Token validation:** Local string comparison using `crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(ADMIN_SCRAPE_TOKEN))`. No external auth service. Token length validated first (prevents length oracle).
3. **Auth service unavailable:** N/A — token validated entirely from env var. No external dependency for auth.
4. **Load balancer:** Vercel manages TLS termination and CDN. All traffic is HTTPS. No custom infrastructure required.
5. **Service-to-service:** GitHub Actions calls Vercel via HTTPS with `ADMIN_SCRAPE_TOKEN` from GH Secrets. Next.js connects to PostgreSQL via TLS connection string (Railway/Supabase enforces TLS). No mTLS required.
6. **Secrets:** `ADMIN_SCRAPE_TOKEN`, `DATABASE_URL`, `RESEND_API_KEY` stored in Vercel Environment Variables (encrypted at rest). `ADMIN_SCRAPE_TOKEN` duplicated in GitHub Secrets for the Actions workflow. Never committed to source. `.env.local` is gitignored.
7. **Sensitive data:** Subscriber email addresses. Protection: (a) never logged anywhere; (b) never returned in any API response; (c) stored only in PostgreSQL (encrypted at rest on Railway/Supabase); (d) double opt-in before activation; (e) one-click unsubscribe via unique token; (f) soft-delete preserves withdrawal evidence. All other data (PDP names, registration numbers) is public by nature.
8. **No tracking cookies:** Zero cookies set by the application. No analytics scripts (v1). Privacy notice page explains all data processing.
9. **Input sanitisation:** All query parameters validated (type assertions, range checks, enum validation) before being passed to Drizzle queries. Drizzle uses parameterised queries; no string interpolation into SQL.

---

## Deployment Architecture

### Development

```
npm run dev         → localhost:3000 (Next.js dev server with hot reload)
DATABASE_TYPE=sqlite → ./data/pdp-tracker.db (auto-created by drizzle-kit push)
SNAPSHOT_STORAGE=local → ./snapshots/
npx tsx scripts/run-scrape.ts   → manual scrape trigger
```

### Production

```
                ┌───────────────────────────────┐
GitHub          │   Vercel (Next.js App)         │
  main branch ──► Auto-deploy on push to main   │
                │   Env vars: Vercel dashboard   │
                │   Vercel Blob: snapshot store  │
                └──────────────┬────────────────┘
                               │ TLS / Drizzle
                               ▼
                ┌──────────────────────────────────┐
                │  PostgreSQL                       │
                │  Railway (recommended) or Supabase│
                │  Automatic daily backups          │
                │  Connection string: DATABASE_URL  │
                └──────────────────────────────────┘

GitHub Actions (separate from CI):
  .github/workflows/scrape.yml
    schedule: '0 5 * * *'
    env: ADMIN_SCRAPE_TOKEN (from GH Secret)
    step 1: curl -f -X POST $APP_URL/api/admin/trigger-scrape
    step 2: (on step 1 failure) wait 4h, retry
    step 3: (on step 2 failure) exit 1 → triggers GH Actions failure notification
```

**Railway worker (contingency only):**
Only provision if Playwright becomes mandatory (JS-rendered DGFiP page). Architecture remains identical; scraper moves to a Railway Node.js process with `node-cron`. Admin endpoint stays on Vercel but delegates to Railway via an internal HTTPS call. Document in a new ADR if this path is taken.

---

## Assumptions Registry

| # | Assumption | Fallback if Wrong | Risk Level | How We Test |
|---|-----------|-------------------|------------|-------------|
| 1 | DGFiP PDP page is static HTML (Cheerio sufficient; no JS rendering) | Activate Playwright fallback; if Vercel-incompatible, move scraper to Railway worker | P1 | Developer: `curl https://www.impots.gouv.fr/{path}` and inspect response body for PDP data |
| 2 | Exact URL of DGFiP PDP list is discoverable on impots.gouv.fr and is stable over time | Try DGFiP sitemap; search data.gouv.fr for PDP dataset; contact DGFiP for canonical URL | **P0** | Developer must verify and set `DGFIP_PDP_URL` before any scraper code is written |
| 3 | data.gouv.fr has a structured (JSON/CSV) PDP dataset that can replace HTML scraping | Fall back to impots.gouv.fr HTML scraping; no architecture change needed (parser is swappable) | P1 | Developer searches data.gouv.fr at project start; document finding in `parser.ts` header |
| 4 | Registration numbers and dates are published on the DGFiP page | Store `null`; schema uses nullable TEXT columns; add data later without migration | P2 | Developer inspects HTML source of DGFiP page; note which fields exist |
| 5 | Vercel serverless function completes scrape within 60s timeout | Move scraper to Railway worker; Vercel handles only frontend + lightweight API | P1 | Developer times full scrape run locally; measure and document in `scripts/run-scrape.ts` |
| 6 | GitHub Actions cron is reliable enough for once-daily job (SLA ~99.5%) | Add Vercel Cron Jobs (Pro plan) as secondary trigger; dead man's switch catches misses | P1 | Monitor dead man's switch alert cadence over first 30 days |
| 7 | DGFiP does not block single daily GET requests from an identified User-Agent | Add `robots.txt` compliance check; reduce frequency; contact DGFiP for permitted access | P1 | Developer checks `robots.txt` before first deployment; monitor for 403/429 in run logs |
| 8 | SQLite → PostgreSQL migration via Drizzle is seamless (same schema, minor dialect differences) | Write manual migration script; types used (TEXT, INTEGER) have direct PG equivalents | P2 | Developer performs test migration on a staging PostgreSQL instance before production switch |
| 9 | PDP registry size remains below 500 records (query performance sizing) | Add index on `pdps.slug` and `pdps.status`; paginate scraper result set | P2 | Check DGFiP page count at project start; run `EXPLAIN` on diff query with 500-row dataset |
| 10 | 05:00 UTC covers both CET (06:00) and CEST (07:00) — no DST-related late trigger | Schedule at 04:00 UTC if 07:00 CEST is a hard requirement | P2 | Monitor run timestamps during March/October DST transitions |

> **P0 gate:** Assumption #2 (DGFIP_PDP_URL) must be resolved and `DGFIP_PDP_URL` set before the Developer begins scraper implementation.

---

## Failure Modes & Resilience

| # | Failure Mode | Trigger | Behaviour | Mitigation | Test |
|---|-------------|---------|-----------|------------|------|
| 1 | DGFiP site returns 5xx or network timeout | Site maintenance, transient outage | Scrape run recorded as `'failed'`; no DB changes; GH Actions step exits non-zero | GH Actions retry: 4h wait, max 2 retries; dead man's switch if all retries fail | Mock HTTP server returning 503; assert run logged as `failed`; assert no PDP rows updated |
| 2 | DGFiP returns 429 Too Many Requests | Rate limit triggered or scraper over-frequency | Same as above; `error_message` = `"429 Too Many Requests"` | Single request per day; polite UA; retry delay is 4h (unlikely to re-trigger) | Mock 429; assert `failed` run and correct retry delay signal |
| 3 | Cheerio returns empty PDP list | HTML structure changed; wrong selector | Safety check fires; no DB write; admin alert sent | Orchestrator catches `SafetyCheckError`; developer updates `parser.ts` selectors | Unit test: feed empty `<html>`; assert `SafetyCheckError` thrown |
| 4 | Parsed PDP count drops >50% vs DB | Mass-removal event OR parser regression | Safety check fires; no DB write; admin alert with counts | Admin reviews impots.gouv.fr directly; if legitimate, sets `SAFETY_CHECK_OVERRIDE=true` and re-triggers | Unit test: simulate 10 current PDPs, 4 parsed; assert `SafetyCheckError` |
| 5 | Playwright fallback also fails | JS content not accessible, browser crash on cold start | Run logged as `'failed'`; admin alert | Check data.gouv.fr dataset as alternative source; dead man's switch fires after 48h | Mock Playwright throw; assert graceful `failed` run record |
| 6 | PostgreSQL unreachable | DB maintenance or network blip | API routes return `503`; admin endpoint returns `503`; scrape cannot record result | Drizzle connection with 3 retry attempts on startup; `503` with `Retry-After: 60` | Failure injection: block DB port; assert `503` from `/api/v1/pdps` |
| 7 | Vercel function timeout (>60s) | DGFiP slow, or Playwright startup time | Function returns `504`; scrape run not recorded; GH Actions step fails → retry | Set fetch timeout to 15s in `fetcher.ts`; if Playwright required, move to Railway | Local timing test; artificial 5s timeout; confirm completion well under limit |
| 8 | GitHub Actions cron skipped | GitHub infrastructure outage | Scrape does not run for 24h+ | Dead man's switch: alert fires if no `'success'` run in last 48h | Manually delay run; verify alert fires via `/api/v1/status` |
| 9 | Snapshot write failure | Vercel Blob quota exceeded or network error during write | Non-fatal; `raw_html_path = null`; scrape run proceeds normally | Log `WARN: snapshot write failed`; scrape is not blocked; operator monitors storage | Mock `@vercel/blob` `put()` throwing; assert run completes with `raw_html_path=null` |
| 10 | Admin endpoint brute-forced or token leaked | Credential stuffing, accidental commit, log exposure | Unauthorized scrape trigger; potential DoS | Rate limit: 5 req/min/IP on admin route; `timingSafeEqual` comparison; rotate token via env var update | Security test: rapid concurrent requests; verify rate limit response; verify timing invariance |
| 11 | Newsletter form abused (bot signups) | Automated form submissions | DB fills with unconfirmed `subscribers` rows | Double opt-in: only confirmed subscribers receive emails; cleanup job removes unconfirmed after 48h | Automated signup without confirmation; run cleanup job; assert rows removed |
| 12 | Stale data served after silent parser regression | CSS selectors drift without error (returns partial data, not empty) | Dashboard shows outdated or partial PDP list | Monitor `change_events` insertion rate: alert admin if no changes detected for 30+ consecutive days | Manual check: zero-change-event period in staging; confirm alert fires |

---

## SLOs & Performance

| Metric | Target | Test |
|--------|--------|------|
| Dashboard page LCP | < 2.5 s | Lighthouse CI on deploy to main |
| API response time (p99) | < 500 ms | k6 load test at 50 req/s on `/api/v1/pdps` |
| Scrape run duration | < 30 s | Recorded in `scrape_runs.run_at`; alert if > 45s |
| Scraper success rate | ≥ 95 successful runs per 100 scheduled | Dead man's switch + run audit query |
| RSS feed generation | < 200 ms | Instrumented in route handler |

---

## Decisions

| # | Decision | Rationale | ADR |
|---|----------|-----------|-----|
| 1 | Next.js 14 (App Router) + Node.js 20 | Single TypeScript codebase for frontend + API; ISR caching for fast public pages; Vercel native | [ADR-001](../decisions/001-tech-stack.md) |
| 2 | Drizzle ORM + SQLite (dev) / PostgreSQL (prod) | Schema defined once; portable between drivers; type-safe; lightweight | [ADR-001](../decisions/001-tech-stack.md) |
| 3 | Tailwind CSS | Utility-first; zero-runtime; co-located with JSX; no separate CSS bundle | ADR not required; standard for Next.js |
| 4 | Cheerio (primary parser) + Playwright (fallback) | Lightweight static parser; isolated interface for transparent replacement | [ADR-002](../decisions/002-scraper-strategy.md) |
| 5 | GitHub Actions cron → admin endpoint | No persistent process on Vercel; free; integrates with CI; reliable for daily schedule | [ADR-002](../decisions/002-scraper-strategy.md) |
| 6 | Provider-agnostic `NotificationService` with console stub (v1) | Defer email provider selection; callers are not coupled to any vendor | Internal design decision; no ADR required |
| 7 | Soft-delete PDPs (`is_active`, `status='removed'`) | Preserves stable `/pdp/[slug]` URLs; full history accessible; consistent with event log | Embedded in data model rationale |

---

## Risks & Open Questions

| # | Risk / Question | Impact | Owner | Resolution |
|---|----------------|--------|-------|------------|
| 1 | `DGFIP_PDP_URL` not yet known — blocks all scraper work | **P0** | Developer | Verify exact URL at project start; set `DGFIP_PDP_URL`; update `parser.ts` with correct CSS selectors |
| 2 | data.gouv.fr PDP dataset existence unknown — may offer structured data preferred over HTML | P1 | Developer | Search data.gouv.fr at project start; if found, implement as primary source in `parser.ts` |
| 3 | Vercel function timeout if Playwright required | P1 | Developer | Time scrape locally; if > 10s with Playwright, provision Railway worker and create new ADR |
| 4 | DGFiP `robots.txt` / Terms of Service not reviewed | P1 | Developer | Review before first deployment; document in `README.md`; if blocked, seek DGFiP API access |
| 5 | Drizzle migration from SQLite to PostgreSQL untested | P2 | Developer | Perform test migration on staging PostgreSQL before production switchover |

---

## Out of Scope

- OAuth, user accounts, or any form of public user authentication
- Real-time updates (WebSockets, Server-Sent Events) — once-daily data does not justify it
- Multi-language / internationalisation (French interface only in v1)
- Machine learning or NLP classification of PDP entries
- Sage Network Auth, NewRelic, AWS CDK, or any Sage Network internal infrastructure
- Mobile application
- SLA monitoring or uptime dashboard (Vercel's built-in analytics is sufficient for v1)

---

## Approval

- **Architecture review:** Architect Agent, 2026-03-26
- **P0 gate:** Assumption #2 (`DGFIP_PDP_URL`) must be resolved before Developer starts scraper implementation
- **Tech Lead sign-off on assumptions:** Pending — required before Developer starts
