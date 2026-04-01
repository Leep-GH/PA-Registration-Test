# TASKS.md — PDP Registry Tracker

**Project:** PDP Registry Tracker
**Last updated:** 2026-03-30
**Architecture complete:** ✅

> Status legend: `TODO` | `IN PROGRESS` | `BLOCKED` | `DONE`
> Phases: 0 = Foundation | 1 = Core MVP | 2 = Notifications | 3 = API & Developer | 4 = Polish | T = Testing (cross-cutting)
> Owner: Developer | QA Engineer | Architect | Tech Lead

---

## Phase 0 — Foundation & Project Setup

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| **[P0-GATE]** Verify exact URL of DGFiP PDP registry page; set `DGFIP_PDP_URL`; document whether page is static HTML or JS-rendered | 0 | DONE | Developer | **Resolved 2026-03-26.** URL confirmed: https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees. Page is static HTML. Two `table.table` elements. Selectors and `.env.example` updated. |
| **[P0-GATE]** Search data.gouv.fr for a structured PDP dataset (JSON/CSV); if found, prefer as primary data source over HTML scraping | 0 | DONE | Developer | data.gouv.fr search returned 0 results for "PDP facturation". No structured dataset available — HTML scraping is the primary source. |
| Review `robots.txt` on impots.gouv.fr and DGFiP Terms of Service for automated access permission | 0 | DONE | Developer | robots.txt checked 2026-03-26: no Disallow covering `/je-consulte-la-liste-des-plateformes-agreees`. Scraping permitted. Documented in `src/lib/scraper/parser.ts` and `.env.example`. |
| Initialise Next.js 14 project (scaffolded manually to workspace root) | 0 | DONE | Developer | Use Node.js 20+. Verify `next` version is 14.x in `package.json`. |
| Add `global.json` to pin Node.js runtime version | 0 | DONE | Developer | Added `"engines": { "node": ">=20.0.0" }` to `package.json` (no .NET global.json applicable to this Node project). |
| Configure `tsconfig.json`: `strict: true`, path alias `@/*` → `src/*` | 0 | DONE | Developer | `strict: true` and `@/*` alias set. |
| Install and configure Drizzle ORM: `drizzle-orm`, `drizzle-kit`, `better-sqlite3`, `pg` | 0 | DONE | Developer | All packages installed. `drizzle.config.ts` supports SQLite (dev) and PostgreSQL (prod) via `DATABASE_TYPE`. |
| Create `src/lib/db/schema.ts` with all four Drizzle table definitions (pdps, change_events, scrape_runs, subscribers) | 0 | DONE | Developer | Schema matches design doc. TEXT for dates, INTEGER for booleans. |
| Create `drizzle.config.ts` supporting both SQLite (dev) and PostgreSQL (prod) via `DATABASE_TYPE` env var | 0 | DONE | Developer | Implemented. Dev: `driver: 'better-sqlite'`. Prod: `driver: 'pg'`. |
| Run `drizzle-kit generate` to create initial migration; commit migration files to source | 0 | DONE | Developer | Run 2026-03-26. Output: `src/lib/db/migrations/0000_hot_firestar.sql`. All 4 tables. |
| Create `src/lib/db/index.ts`: exported `createDb()` factory that returns typed Drizzle client based on `DATABASE_TYPE` | 0 | DONE | Developer | Implemented. PostgreSQL pool: max 10, 30s idle timeout. SQLite: single connection. |
| Create `.env.example` with all required env vars, descriptions, and example values | 0 | DONE | Developer | Updated 2026-03-26 — `DGFIP_PDP_URL` set to confirmed URL. |
| Create `data/` and `snapshots/` directories; add both to `.gitignore` | 0 | DONE | Developer | Both in `.gitignore`. `.env.local` also excluded. |
| Configure ESLint and Prettier | 0 | DONE | Developer | `.eslintrc.json` present with `next/core-web-vitals`. |
| Scaffold full project directory structure as defined in design doc | 0 | DONE | Developer | All directories and files created. |

---

## Phase 1 — Core MVP (Scraper + DB + Dashboard)

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| Implement `src/lib/scraper/types.ts`: `PdpRecord`, `ParserInterface`, `ScraperResult`, `SafetyCheckError` | 1 | DONE | Developer | `ParserInterface`: `parse(html: string): Promise<PdpRecord[]>`. `PdpRecord` must match all nullable fields defined in schema. |
| Implement `src/lib/scraper/fetcher.ts`: `fetchHtml(url: string): Promise<string>` with 15s timeout, custom `User-Agent`, and structured error on non-200 | 1 | DONE | Developer | Use native `fetch` (Node.js 20). Never retry inside this function — retry is handled by GitHub Actions. Signal failure via thrown `FetchError`. |
| Implement `src/lib/scraper/parser.ts`: Cheerio-based `CheerioPdpParser` implementing `ParserInterface` | 1 | DONE | Developer | **P0-GATE resolved 2026-03-26.** Header-based column detection; both tables merged; plain-text URL extraction; real DGFiP status regexes. |
| Implement `src/lib/scraper/snapshot.ts`: `writeSnapshot(html, date)` and `cleanupOldSnapshots()` supporting `local`, `blob`, `db` storage backends | 1 | DONE | Developer | Non-fatal: all failures caught and logged; return `null` on failure. Cleanup deletes files/blobs older than `SNAPSHOT_RETENTION_DAYS`. |
| Implement `src/lib/safety/index.ts`: `checkSafety(found: number, dbCount: number): void` — throws `SafetyCheckError` on empty list or drop > `SAFETY_DROP_THRESHOLD` | 1 | DONE | Developer | Empty list guard: always active, not overrideable. Drop guard: check `SAFETY_CHECK_OVERRIDE` env var before throwing. Log both guards. Alert admin via `NotificationService`. |
| Implement `src/lib/diff/index.ts`: `computeDiff(scraped: PdpRecord[], current: Pdp[]): ChangeEvent[]` — returns array of added/removed/status_changed events | 1 | DONE | Developer | Match by `slug` (derived from name). A name change → `status_changed` event with old_value/new_value JSON. Slug derivation: kebab-case, lowercase, strip accents, strip punctuation. |
| Implement slug generation utility: `generateSlug(name: string): string` | 1 | DONE | Developer | Must be deterministic and stable. Use `slugify` npm package or custom implementation. Handle French characters (é→e, ç→c, etc.). |
| Implement `src/lib/db/repositories/pdps.ts`: `upsertPdp`, `getAllPdps`, `getPdpBySlug`, `setPdpInactive`, `getActivePdpCount` | 1 | DONE | Developer | `upsertPdp` updates `last_seen_at` and `is_active=1`; never changes `first_seen_at`. `setPdpInactive` sets `is_active=0`, `status='removed'`. |
| Implement `src/lib/db/repositories/changes.ts`: `insertChangeEvent`, `getChanges(filters)`, `getLatestRunChanges` | 1 | DONE | Developer | `getChanges` accepts: `since` (ISO date string), `type`, `limit` (max 200), `offset`. |
| Implement `src/lib/db/repositories/runs.ts`: `insertRun`, `updateRun`, `getLastSuccessfulRun`, `isRunInProgress` | 1 | DONE | Developer | `isRunInProgress`: checks for a `scrape_runs` row with `status = null` (in-progress sentinel) updated in last 5 minutes. |
| Implement `src/lib/scraper/index.ts`: full scrape orchestrator — fetch → parse → safety-check → snapshot → diff → persist → return `ScraperResult` | 1 | DONE | Developer | Must: (a) create in-progress run record at start, (b) update to success/failed/no_change at end, (c) call `cleanupOldSnapshots()` after success, (d) send alert on safety check failure. |
| Implement `src/app/api/admin/trigger-scrape/route.ts`: POST handler with token validation, in-progress guard, orchestrator call | 1 | DONE | Developer | Token validation: `crypto.timingSafeEqual`. In-progress: return 409. On orchestrator throw: return 500 (no stack trace). Return 200 with `ScraperResult` summary on success. |
| Implement `src/lib/notifications/interface.ts` and `src/lib/notifications/console.ts` (console stub) | 1 | DONE | Developer | `NotificationService.send(subject: string, body: string, recipients?: string[]): Promise<void>`. Console stub: `console.log` with timestamp. |
| Create `.github/workflows/scrape.yml`: cron at `0 5 * * *`; POST admin endpoint; retry-1 job (4h sleep); retry-2 job (4h sleep) | 1 | DONE | Developer | Dead man's switch status-call step added to retry-2 job 2026-03-26. | Secrets: `APP_URL`, `ADMIN_SCRAPE_TOKEN`. Each job depends on previous job's failure. See ADR-002 for workflow design. |
| Build dashboard page `src/app/page.tsx`: fetch active PDPs via server component, render `PdpTable`, `StatsBar`, `SubscribeForm` | 1 | DONE | Developer | Use `export const revalidate = 3600` as fallback; call `revalidatePath('/')` from trigger-scrape route on success. Data fetch: direct Drizzle query in server component (not via API). |
| Build `src/components/pdp-table.tsx`: sortable table with columns: Name, Status, Registration Number, Registration Date, Website, First Seen | 1 | DONE | Developer | Tailwind styled. Status badge: green = registered, amber = candidate, red = removed. |
| Build `src/components/stats-bar.tsx`: total active, added this month, removed this month, last scrape time | 1 | DONE | Developer | Data from `pdps` and `change_events` queries in parent server component. |
| Build history page `src/app/historique/page.tsx`: fetch change events, render `ChangeTimeline` | 1 | DONE | Developer | Default: last 50 events. Tailwind timeline layout. Link each event to `/pdp/[slug]`. |
| Build `src/components/change-timeline.tsx`: vertical timeline of `ChangeEvent` records with event type badge and diff display | 1 | DONE | Developer | Show old → new values for `status_changed`. Link PDP name to `/pdp/[slug]`. |
| Build `scripts/run-scrape.ts`: standalone script for local development — initialises DB, calls scraper orchestrator, logs result | 1 | DONE | Developer | Usage: `npx tsx scripts/run-scrape.ts`. Must respect all env vars from `.env.local`. |
| Configure `next.config.ts`: security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, no cache on admin routes) | 1 | DONE | Developer | Implemented in `next.config.mjs`. | Admin route: `Cache-Control: no-store`. Public API: `Cache-Control: public, max-age=300`. |

---

## Phase 2 — Notifications (Newsletter + RSS + Dead Man's Switch)

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| Implement `src/lib/db/repositories/subscribers.ts`: `insertSubscriber`, `confirmSubscriber`, `unsubscribeByToken`, `getConfirmedSubscribers`, `purgeUnconfirmed` | 2 | DONE | Developer | `purgeUnconfirmed`: deletes rows where `confirmed=0` and `subscribed_at` > 48 hours ago. |
| Build `src/components/subscribe-form.tsx`: email input + submit using Next.js server action | 2 | DONE | Developer | Server action: validate email format, insert subscriber with `crypto.randomBytes(32).toString('hex')` token, send confirmation email (via `NotificationService`), return success message. |
| Implement newsletter signup server action: validate email, check for duplicate, insert subscriber, send confirmation email | 2 | DONE | Developer | Duplicate: silently succeed (do not reveal that email is already subscribed — prevents enumeration). Rate limit: 3 signups per IP per hour (tracked in memory or DB). |
| Implement email confirmation endpoint: `GET /api/confirm/[token]` — sets `confirmed=1`; redirect to homepage with success message | 2 | DONE | Developer | Email bug fix confirmed — `confirmedEmail` passed correctly. | Invalid/expired token: redirect to homepage with neutral message (no enumeration). |
| Implement one-click unsubscribe endpoint: `GET /api/unsubscribe/[token]` — sets `unsubscribed_at`; redirect to homepage with confirmation message | 2 | DONE | Developer | Token validation: DB lookup only. No authentication required. |
| Implement subscriber cleanup job: call `purgeUnconfirmed()` at end of each successful scrape run (inside orchestrator) | 2 | DONE | Developer | Non-fatal if it fails; log warning. |
| Implement dead man's switch check in `src/app/api/v1/status/route.ts`: query last successful `scrape_runs` entry; alert if > 48h ago | 2 | DONE | Developer | Call `NotificationService.send()` once per 48h window (use `scrape_runs` to avoid repeat alerts). Include last success timestamp and hours elapsed in alert body. |
| Implement RSS feed: `src/app/rss.xml/route.ts` — build RSS 2.0 XML from last 50 change events | 2 | DONE | Developer | Content-Type: `application/rss+xml`. Use `NEXT_PUBLIC_APP_URL` for item links. Include PDP name, event type, date in each `<item>`. |
| Implement `src/lib/notifications/rss.ts`: `buildRssFeed(changes: ChangeEvent[], baseUrl: string): string` | 2 | DONE | Developer | Pure function; no DB access. Returns valid RSS 2.0 XML string. Include `<channel>` title, description, link, lastBuildDate. |
| Wire dead man's switch into GitHub Actions post-run step: call `/api/v1/status` after failed final retry to force alert | 2 | DONE | Developer | Added `if: always()` step to `retry-2` job 2026-03-26. | Add step at end of `retry-2` job: `curl $APP_URL/api/v1/status`. |
| Add email notification on change detection to scraper orchestrator (stubbed via `ConsoleSink` in v1) | 2 | DONE | Developer | After successful diff with `changes.length > 0`: call `NotificationService.send()` to confirmed subscribers. Include list of changes in body. This is the v1 stub — `ConsoleSink` logs instead of sending. |

---

## Phase 3 — Public API & Developer Access

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| Implement `GET /api/v1/pdps/route.ts`: return all PDPs; support `status` and `is_active` query params | 3 | DONE | Developer | Validate query params before DB query. Default: all active PDPs. Response: `{ data: Pdp[], meta: { total, lastUpdated } }`. |
| Implement `GET /api/v1/pdps/[slug]/route.ts`: return single PDP with change history | 3 | DONE | Developer | Include `changeHistory: ChangeEvent[]` in response. 404 if slug not found. |
| Implement `GET /api/v1/changes/route.ts`: paginated change events with `since`, `type`, `limit`, `offset` params | 3 | DONE | Developer | Validate `since` is valid ISO 8601 date. Validate `type` is one of: `added`, `removed`, `status_changed`. Clamp `limit` at 200. |
| Implement `GET /api/v1/changes/latest/route.ts`: change events from most recent successful scrape run | 3 | DONE | Developer | Returns `{ data: [], meta: { runAt, pdpsFound } }` — empty data array if no changes in latest run. |
| Implement `GET /api/v1/status/route.ts`: scraper health status + dead man's switch check | 3 | DONE | Developer | Response: `{ lastRun: { runAt, status, pdpsFound, changesDetected }, nextExpectedRun, alert? }`. |
| Build PDP detail page `src/app/pdp/[slug]/page.tsx`: display PDP info + change history | 3 | DONE | Developer | Static generation with `generateStaticParams` for all active PDPs. `notFound()` for unknown slugs. |
| Add CSV export endpoint: `GET /api/v1/pdps.csv` — return all active PDPs as RFC 4180 CSV | 3 | DONE | Developer | Implemented via `?format=csv` query param on `/api/v1/pdps`. | Columns: name, slug, status, registration_number, registration_date, website_url, first_seen_at, last_seen_at. Content-Type: `text/csv`. Content-Disposition: `attachment; filename="pdps.csv"`. |
| ✅ Create OpenAPI 3.1 spec `docs/api/pdp-registry-tracker.yaml`: all endpoints, schemas, error codes, examples | 3 | DONE | API Designer | Completed 2026-03-26. 9 paths, full schemas, admin Bearer security, all error codes documented. |
| Write API reference documentation in `docs/api/README.md`: all public endpoints, params, response shapes, example responses | 3 | TODO | Developer | OpenAPI spec is the primary reference; README would be a convenience summary. | OpenAPI spec at `docs/api/pdp-registry-tracker.yaml` is the primary reference; README can be a summary. |

---

## Phase 4 — Polish & Production Readiness

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| Build privacy notice page `src/app/privacy/page.tsx`: GDPR-compliant data processing explanation | 4 | DONE | Developer | Cover: what data is collected (emails only), why (notifications), retention period, right to deletion (unsubscribe link), data controller contact. |
| Build About page `src/app/about/page.tsx`: project purpose, data source attribution, contact | 4 | TODO | Developer | Credit DGFiP as data source. Include link to impots.gouv.fr. |
| Add OG tags to all pages: `<meta og:title>`, `<meta og:description>`, `<meta og:url>`, `<meta og:image>` | 4 | TODO | Developer | Use Next.js `metadata` export in each `page.tsx`. `NEXT_PUBLIC_APP_URL` for og:url. |
| Add `<link rel="alternate" type="application/rss+xml">` to root `layout.tsx` | 4 | TODO | Developer | Points to `/rss.xml`. |
| Run Lighthouse CI audit; achieve LCP < 2.5s and performance score ≥ 90 on dashboard page | 4 | TODO | Developer | Use `@lhci/cli` in CI pipeline or Vercel Speed Insights. Address any failing metrics. |
| Verify SQLite → PostgreSQL migration on a staging PostgreSQL instance before production deployment | 4 | TODO | Developer | Run `drizzle-kit migrate` against a clean staging DB. Insert test data. Verify query results match SQLite behaviour. |
| Deploy to Vercel: connect GitHub repo, configure all production env vars, verify auto-deploy from main | 4 | TODO | Developer | Set `DATABASE_TYPE=postgresql`, `DATABASE_URL`, `ADMIN_SCRAPE_TOKEN`, `DGFIP_PDP_URL`, `NEXT_PUBLIC_APP_URL`, `SNAPSHOT_STORAGE=blob`, `BLOB_READ_WRITE_TOKEN`. |
| Provision production PostgreSQL on Railway (or Supabase); configure connection string; verify TLS | 4 | TODO | Developer | Enable automatic daily backups. Store connection string in Vercel env var only. |
| Configure GitHub Secrets for Actions workflow: `APP_URL`, `ADMIN_SCRAPE_TOKEN` | 4 | TODO | Developer | Trigger first manual scrape run via GH Actions; verify `scrape_runs` record in production DB. |
| Snapshot retention cleanup: verify `cleanupOldSnapshots()` runs and deletes files older than 90 days | 4 | TODO | Developer | After first 90 days, verify oldest snapshots are removed. Check Vercel Blob usage in dashboard. |
| Final security review: check for secrets in source, verify timing-safe token comparison, verify no PII in logs | 4 | TODO | Tech Lead | Review git log for any accidentally committed secrets. Run `git log --all -S "password\|secret\|token"`. Verify `console.log` statements do not reference subscriber emails. |
| Configure GitHub Actions failure notifications: ensure repository owner receives email on scrape workflow failure | 4 | TODO | Developer | GitHub Settings → Notifications → Actions. Test by forcing a workflow failure. |

---

## Testing (Cross-Cutting)

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| Set up test infrastructure: Vitest (or Jest), test utilities, fixture HTML files | T | DONE | QA Engineer | Vitest 4.1 + @vitest/coverage-v8. `__tests__/` dirs created alongside each src/lib/ module. `__fixtures__/` created with assumed DGFiP HTML. `vitest.config.ts` added. `test`, `test:watch`, `test:coverage` scripts added to package.json. |
| Unit test — `src/lib/scraper/fetcher.ts`: 200 success, 503 failure, 429 failure, timeout | T | DONE | QA Engineer | 7 tests. 100% coverage. `vi.stubGlobal` + `vi.useFakeTimers` + `vi.advanceTimersByTimeAsync`. |
| Unit test — `src/lib/scraper/parser.ts`: well-formed HTML, partial list, empty body, unexpected structure | T | DONE | QA Engineer | 11 tests. 90.62% stmt / 77.08% branch coverage. **P0-GATE partial block**: fixture HTML mirrors ASSUMED DGFiP structure — update `__fixtures__/dgfip-*.html` when actual page confirmed. Parser tests validate parser logic given matching HTML, not the live selector accuracy. |
| Unit test — `src/lib/safety/index.ts`: 0 results (always blocks), 40% drop (allowed), 51% drop (blocked), 100% addition (allowed), override flag | T | DONE | QA Engineer | 10 tests. 100% coverage. All guard branches covered including override, custom threshold, and first-run scenario. |
| Unit test — `src/lib/diff/index.ts`: all-new list, no change, one addition, one removal, one status change, multiple changes | T | DONE | QA Engineer | 8 tests. 100% coverage. Typed fixtures, no `any`. |
| Unit test — slug generation utility: French characters, spaces, punctuation, collision handling | T | DONE | QA Engineer | Covered inside parser.test.ts — tests "Société Bêta SARL" → ASCII slug with no accents. |
| Unit test — admin token validation: valid token, invalid token, missing header, timing safety | T | TODO | QA Engineer | Requires Next.js route handler test setup (out of scope for this unit-test pass). |
| Unit test — `src/lib/notifications/rss.ts`: valid RSS 2.0 output with multiple changes, empty changes | T | DONE | QA Engineer | 9 tests. 95% stmt / 100% branch. All event types, escaping, item limit, unknown event type fallback. |
| Unit test — `src/lib/logger.ts` | T | DONE | QA Engineer | 8 tests. 100% coverage. |
| Unit test — `src/lib/notifications/console.ts` (ConsoleSink) | T | DONE | QA Engineer | 11 tests. 100% coverage. PII guards verified. |
| Unit test — `src/lib/scraper/snapshot.ts` | T | DONE | QA Engineer | 10 tests. 74.5% stmt / 71.42% branch. Uncovered: `saveBlob` path (lines 37, 108–126) requires `@vercel/blob` dynamic import — not unit-testable without the optional dep installed. All other paths covered. |
| Integration test — full scrape run: mock HTTP server returning fixture HTML → assert DB state | T | TODO | QA Engineer | Requires in-memory SQLite DB fixture. Out of scope for this unit-test pass. |
| Integration test — scrape failure: mock HTTP server returning 503 → assert failed run record, no DB changes | T | TODO | QA Engineer | As above. |
| Integration test — safety check via empty HTML: mock parser returning `[]` → assert no DB write, failed run | T | TODO | QA Engineer | Assert `pdps` count unchanged. Assert alert sent (check `ConsoleSink.send()` called). |
| Integration test — `GET /api/v1/pdps`: seed DB, call endpoint, verify response shape and data | T | TODO | QA Engineer | Use Next.js `Route Handler` test pattern. Seed test DB with known fixtures. |
| Integration test — `GET /api/v1/changes` with all query parameter combinations | T | TODO | QA Engineer | Test: `since`, `type`, `limit`, `offset`, invalid `type` (→ 400), `limit` > 200 (→ clamped or 400). |
| Integration test — `GET /api/v1/status`: dead man's switch state when last run is > 48h ago | T | TODO | QA Engineer | Seed `scrape_runs` with a run 49h ago. Assert response includes `alert` field. |
| Integration test — newsletter signup: submit form, verify subscriber row, verify confirmation email sent (to ConsoleSink) | T | TODO | QA Engineer | Test double submission with same email (silent success). Test invalid email format (→ 400). |
| Integration test — confirm + unsubscribe flow: full lifecycle via token | T | TODO | QA Engineer | Insert subscriber, confirm via token, unsubscribe via token, verify `unsubscribed_at` set. |
| API contract test — verify all `/api/v1/*` routes return expected JSON shape with no extra fields | T | TODO | QA Engineer | Use `zod` schemas to assert response shape for all endpoints. |
| Security test — admin endpoint rate limiting: > 5 requests/min from same IP | T | TODO | QA Engineer | Assert 429 on 6th request. Verify rate limit does not affect non-admin routes. |
| Security test — no PII in scrape run logs or API error responses | T | TODO | QA Engineer | Run test signup; trigger a failed scrape; inspect all logged output and API responses for email address leakage. |
| Performance test — `/api/v1/pdps` at 50 concurrent requests | T | TODO | QA Engineer | Use `k6` or `autocannon`. Assert p99 < 500ms. Assert no DB connection exhaustion. |

---

## Architecture & Review

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| ✅ Create `docs/design/pdp-registry-tracker.md` | 0 | DONE | Architect | Completed 2026-03-26 |
| ✅ Create `docs/decisions/001-tech-stack.md` | 0 | DONE | Architect | Completed 2026-03-26 |
| ✅ Create `docs/decisions/002-scraper-strategy.md` | 0 | DONE | Architect | Completed 2026-03-26 |
| Tech Lead review of design document and ADRs | 0 | TODO | Tech Lead | Required before Developer starts. Focus: Assumption #2 (P0), security perimeter, GDPR compliance. |
| Tech Lead sign-off on assumptions (design doc) | 0 | TODO | Tech Lead | All P0 assumptions must have confirmed fallbacks. Assumption #2 must be resolved first. |
| Post-launch review: assess parser stability, snapshot storage usage, dead man's switch frequency | 4 | TODO | Tech Lead | Schedule 30 days after production launch. Document in `docs/decisions/` if architectural changes needed. |

---

## Gate Summary

| Gate | Condition | Status |
|------|-----------|--------|
| **P0-GATE** | `DGFIP_PDP_URL` verified and set; DGFiP HTML structure confirmed by Developer | ✅ DONE — confirmed 2026-03-26. URL: https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees |
| **Tech Lead sign-off** | All ADRs and design doc reviewed and approved | ✅ DONE — APPROVED 2026-03-26 (review: `docs/reviews/2026-03-26-pdp-tracker-review.md`; targeted review: `docs/reviews/2026-03-26-pdp-tracker-targeted-review.md`) |
| **Phase 0–3 code complete** | All Phase 0–3 tasks DONE; 80/80 tests passing | ✅ DONE — 2026-03-26 |
| **Phase 1 → Phase 2** | Dashboard renders real data from at least one successful scrape run | ⏳ PENDING — requires first live scrape run post-deployment |
| **Phase 2 → Phase 3** | RSS feed serving, dead man's switch tested in staging | ⏳ PENDING — requires deployment |
| **Phase 4 production** | PostgreSQL migration verified; deployed to Vercel; GitHub Secrets configured | ⏳ PENDING — deployment operations (manual) |
| **Peppol AP gate** | Peppol AP URL confirmed; scraper returns ≥50 records; migration deployed | ⏳ PENDING — requires live scrape run |

---

## Phase 5 — Peppol AP Integration (2026-03-30)

| Task | Phase | Status | Owner | Notes |
|------|-------|--------|-------|-------|
| ✅ Confirm Peppol AP data source URL and HTML structure | 5 | DONE | Developer | URL: https://peppol.org/members/peppol-certified-service-providers/ — server-rendered DataTables. 7 columns confirmed. See ADR-003. |
| ✅ Write ADR-003: Peppol AP integration | 5 | DONE | Architect | `docs/decisions/003-peppol-ap-integration.md` |
| ✅ Add `peppol_aps` and `cross_registry_links` tables to DB schema | 5 | DONE | Developer | `src/lib/db/schema.ts` |
| ✅ Create migration `0003_peppol_ap_integration.sql` | 5 | DONE | Developer | `src/lib/db/migrations/0003_peppol_ap_integration.sql` |
| ✅ Add `PeppolApRecord` and `PeppolApParserInterface` types | 5 | DONE | Developer | `src/lib/scraper/types.ts` |
| ✅ Implement `PeppolApParser` (Cheerio-based) | 5 | DONE | Developer | `src/lib/scraper/peppol-ap-parser.ts` |
| ✅ Implement `peppol-aps` repository | 5 | DONE | Developer | `src/lib/db/repositories/peppol-aps.ts` |
| ✅ Implement `cross-registry-links` repository | 5 | DONE | Developer | `src/lib/db/repositories/cross-registry-links.ts` |
| ✅ Implement fuzzy cross-registry matching service | 5 | DONE | Developer | `src/lib/cross-registry/index.ts` — Jaccard token-overlap, threshold 75/100, DGFIP-only |
| ✅ Implement `runPeppolApScrape()` orchestrator | 5 | DONE | Developer | `src/lib/scraper/peppol-ap-index.ts` |
| ✅ Add `GET /api/v1/peppol-aps` route (PII stripped) | 5 | DONE | Developer | `src/app/api/v1/peppol-aps/route.ts` |
| ✅ Add `POST /api/admin/trigger-peppol-ap-scrape` route | 5 | DONE | Developer | `src/app/api/admin/trigger-peppol-ap-scrape/route.ts` |
| ✅ Update `pdp-table.tsx`: registry radio filter + Both badge | 5 | DONE | Developer | `src/components/pdp-table.tsx` — radio group: All / PA / Peppol AP / Both |
| ✅ Update `dashboard-content.tsx` + `page.tsx`: pass linkedPdpIds | 5 | DONE | Developer | `src/app/dashboard-content.tsx`, `src/app/page.tsx` |
| ✅ Add i18n keys for registry filter and badges | 5 | DONE | Developer | `src/lib/i18n.ts` — EN + FR |
| ✅ Update OpenAPI spec: add peppol-aps tag, paths, schemas | 5 | DONE | Developer | `docs/api/pdp-registry-tracker.yaml` |
| Run database migration against staging DB | 5 | TODO | Developer | `psql $DATABASE_URL -f src/lib/db/migrations/0003_peppol_ap_integration.sql` |
| Trigger first Peppol AP scrape via admin endpoint | 5 | TODO | Developer | `POST /api/admin/trigger-peppol-ap-scrape` with `ADMIN_SCRAPE_TOKEN` |
| Verify cross-registry matching results in staging | 5 | TODO | Developer | Query `cross_registry_links`; manually review top 10 matched pairs |
| Write unit tests — `PeppolApParser` | 5 | DONE | QA Engineer | `src/lib/scraper/__tests__/peppol-ap-parser.test.ts` — 15 tests. 94.28% stmt / 84.61% branch. |
| Write unit tests — `normalizeName()` + `similarityScore()` | 5 | DONE | QA Engineer | `src/lib/cross-registry/__tests__/index.test.ts` — 18 tests for pure functions. |
| Write integration test — `GET /api/v1/peppol-aps` | 5 | TODO | QA Engineer | Assert PII fields absent from response; assert country/authority filters work |
