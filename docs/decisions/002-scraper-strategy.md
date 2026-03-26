# ADR-002: Scraping Strategy, Safety Checks, and Data Resilience

**Status:** Accepted
**Date:** 2026-03-26
**Author:** Architect Agent
**Type:** ETL

---

## Context

PDP Registry Tracker's core function is a daily extraction of the DGFiP certified e-invoicing platform list from an external government website. This data drives the dashboard and all change notifications. The scraping design must answer four questions:

1. **Parser:** Which HTML parsing library handles the source page reliably?
2. **Safety:** How do we prevent a parse failure from silently wiping the database?
3. **Snapshots:** How do we retain evidence for debugging past parse failures?
4. **Retry:** How do we recover from transient failures without hammering the source?

Additional constraints:
- The exact HTML structure of the DGFiP page is unknown until the Developer inspects it at build time
- The source may return JavaScript-rendered content (unknown; must be verified)
- The source is operated by a government body that may not have a published API — polite access is both a courtesy and a practical requirement for long-term access
- A corrupt scrape that removes all PDPs from the database is a critical failure that is harder to reverse than simply not writing

---

## Decision

Use a **Cheerio-first, Playwright-fallback parsing strategy** behind an isolated `ParserInterface`. Wrap all database writes in two **safety guards**: an empty-list guard and a >50%-drop guard. Store raw HTML as a **per-run snapshot** keyed to `scrape_runs.raw_html_path`. Recover from transient HTTP failures via **GitHub Actions workflow-level retry** (4-hour delay, maximum 2 retries) rather than in-process retry, to avoid blocking the Vercel function timeout.

---

## Options Considered

### HTML Parsing Library

| Option | Pros | Cons |
|--------|------|------|
| **Cheerio (chosen, primary)** | Lightweight (no browser binary); fast cold start; jQuery-style API; well-maintained; zero Playwright/Chromium dependency; fully compatible with Vercel serverless | Fails on pages requiring JavaScript execution to populate content |
| **Playwright (chosen, fallback)** | Renders JavaScript; handles SPAs and deferred DOM population; official headless browser API | 200MB+ Chromium binary; slow cold start (2–5s); requires `playwright-chromium` in Vercel Serverless — exceeds 50MB function bundle limit without special configuration; high memory use |
| `jsdom` | Lightweight browser-like DOM; does not require a real browser | Does not execute JavaScript; no better than Cheerio for JS-rendered pages; heavier than Cheerio for simple parsing |
| `node-html-parser` | Fastest HTML parser for simple extraction | No CSS selector support; less ergonomic than Cheerio; smaller community |
| data.gouv.fr structured dataset | Native JSON/CSV; no HTML parsing required; version-controlled data; most resilient option | Uncertain whether a PDP dataset exists on data.gouv.fr; requires Developer verification at project start |

**Fallback routing logic:**
```
fetch(DGFIP_PDP_URL)
  → parse with Cheerio
  → if result.length === 0 AND PLAYWRIGHT_FALLBACK=true
      → fetch with Playwright
  → if result.length === 0
      → throw SafetyCheckError("Parser returned 0 PDPs")
```

Playwright is activated only by an explicit `PLAYWRIGHT_FALLBACK=true` environment flag, ensuring it is never accidentally invoked in production without a deliberate decision. If Playwright becomes mandatory, a new ADR documents the Railway migration (see ADR-001 contingency).

### Safety Check Thresholds

| Option | Pros | Cons |
|--------|------|------|
| **>50% drop blocks write (chosen)** | Catches all realistic parse regressions; threshold is configurable via `SAFETY_DROP_THRESHOLD` env var; override available for legitimate mass-removal events | May fire during a legitimate mass-revocation event; requires manual admin override in that case |
| No safety check | Simplest implementation | Catastrophic: a single bad scrape can wipe all active PDP records; recovery requires DB restore |
| >10% drop blocks write | Very conservative; detects even minor regressions | Too many false positives on a small registry (10 PDPs → blocks if 1 is removed by DGFiP) |
| Alert-only, no block | Informs admin but does not stop corruption | Notification latency means hours of stale/corrupt data may be served before response |
| Admin confirms every deletion | Maximum safety; zero chance of silent removal | Breaks unattended automation; introduces human-in-the-loop latency; not operationally sustainable |

**Empty-list guard** is applied unconditionally (regardless of threshold setting) and is not overrideable. A result of zero PDPs is always a parser failure, never a legitimate state.

### Snapshot Storage

| Option | Pros | Cons |
|--------|------|------|
| **Local filesystem (dev) + Vercel Blob (prod) (chosen)** | Clean separation of concerns; Vercel Blob is serverless-compatible and priced per byte (cheap for ~100KB/day); path stored in `raw_html_path` | Requires Blob token in production; dev and prod use different backend (managed via `SNAPSHOT_STORAGE` env var) |
| Store HTML in `scrape_runs` as TEXT column | Single storage system; no external service; SQLite/PostgreSQL compatible | Increases DB size; HTML blobs not indexable; harder to inspect outside of DB tooling; awkward 90-day indexed cleanup |
| Cloudflare R2 / AWS S3 | Highly durable; scalable; cheap | Additional service account; overkill for ~36MB/year; adds external dependency |
| `/tmp` (Vercel ephemeral) | Zero config | Storage is per-invocation; not retained between function executions; useless for 90-day retention requirement |

**Storage abstraction:** `snapshot.ts` exports a single `writeSnapshot(html: string, date: Date): Promise<string | null>` function. Callers receive a path/URL string or `null` on failure. The storage backend is selected at runtime by `SNAPSHOT_STORAGE`. This means the storage strategy can be changed without modifying the orchestrator.

**90-day retention:** A cleanup function in `snapshot.ts` (called at the end of each successful scrape run) lists snapshots older than `SNAPSHOT_RETENTION_DAYS` days and deletes them. Blob deletion uses the Vercel Blob `del()` API. Filesystem deletion uses `fs.unlink()`. Cleanup failure is non-fatal and logged as a warning.

### Retry Strategy

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Actions workflow retry steps (chosen)** | Out-of-process; no risk of function timeout; respects the 4-hour delay naturally via `sleep`; visible in GH Actions run history | Requires GH Actions workflow design; 24h window only fits 2 retries at 4h spacing (runs at 05:00, 09:00, 13:00 UTC) |
| In-process retry with exponential backoff | Simple; no GH Actions complexity | Each retry attempt adds latency inside the Vercel function; risks hitting 60s timeout; multiple close-together requests may re-trigger rate limiting |
| Accept single failure; next day's run recovers | Simplest possible logic | 24-hour data gap if daily run fails; unacceptable for time-sensitive change detection |
| Scheduled Lambda / Cloud Function retry | Reliable; precise timing | Unnecessary infrastructure complexity for a standalone project |

**GitHub Actions retry workflow design:**
```yaml
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scrape
        id: scrape
        run: |
          curl -f -X POST "$APP_URL/api/admin/trigger-scrape" \
               -H "Authorization: Bearer $ADMIN_SCRAPE_TOKEN"

  retry-1:
    needs: scrape
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Wait 4 hours
        run: sleep 14400
      - name: Retry scrape
        id: retry1
        run: |
          curl -f -X POST "$APP_URL/api/admin/trigger-scrape" \
               -H "Authorization: Bearer $ADMIN_SCRAPE_TOKEN"

  retry-2:
    needs: retry-1
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Wait 4 hours
        run: sleep 14400
      - name: Final retry
        run: |
          curl -f -X POST "$APP_URL/api/admin/trigger-scrape" \
               -H "Authorization: Bearer $ADMIN_SCRAPE_TOKEN"
```
If all three jobs fail, GH Actions marks the workflow run as failed — triggering a GH Actions failure notification to the repository owner (configurable in GH notification settings). The dead man's switch provides independent alerting.

---

## Consequences

**Positive:**
- `ParserInterface` isolation means a DGFiP HTML restructure is fixed by editing only `parser.ts` — the orchestrator, diff engine, and all callers are untouched
- Safety guards make the system fail-safe by default: a parse regression cannot silently corrupt production data
- Raw HTML snapshots enable developers to reproduce and debug any past parse failure without re-scraping — essential when the DGFiP page structure may change unpredictably
- 4-hour retry delay is respectful to DGFiP infrastructure and is extremely unlikely to re-trigger a rate limit that expired a 4-hour-ago response
- Exponential backoff complexity is avoided entirely by pushing retry responsibility to GitHub Actions

**Negative / Trade-offs:**
- If the >50% drop safety check fires during a legitimate mass-revocation event, production data will be stale until an admin manually reviews the source and re-triggers with `SAFETY_CHECK_OVERRIDE=true`. This is the intentional and correct trade-off: data integrity over timeliness.
- Playwright cannot run inside Vercel serverless functions (function bundle limit: 50MB; Playwright Chromium: ~200MB). If JS rendering is required, the scraper moves to Railway. The `ParserInterface` ensures zero calling-code changes.
- 90-day snapshot cleanup is a best-effort background operation. If it fails consistently, storage grows at ~100KB/day (~3.5MB/year on Vercel Blob). Operator must monitor Blob storage usage.
- GitHub Actions `sleep 14400` in retry jobs holds a GitHub Actions runner for 4 hours, consuming Actions minutes. On a private repository this may consume free plan minutes. Public repositories have unlimited free Actions minutes.

---

## Assumptions This Decision Makes

| # | Assumption | Fallback if Wrong | Risk Level | How We Test |
|---|-----------|-------------------|------------|-------------|
| 1 | DGFiP PDP page returns static HTML that can be parsed by Cheerio (no JS rendering required) | Activate `PLAYWRIGHT_FALLBACK=true`; if Vercel-incompatible, move scraper to Railway worker per ADR-001 | P1 | Developer: `curl -A "pdp-tracker/1.0" https://www.impots.gouv.fr/{path}` and inspect raw HTML for PDP table data |
| 2 | DGFiP permits polite automated single daily GET requests from an identified User-Agent | Check `robots.txt`; reduce to one request per 2 days; contact DGFiP for a structured data feed | P1 | Review `robots.txt` before first production deployment; monitor 403/429 in `scrape_runs.error_message` |
| 3 | The >50% drop threshold (default) reliably distinguishes parse failures from legitimate events on the DGFiP registry | Threshold is configurable via `SAFETY_DROP_THRESHOLD`; default may be adjusted after 30 days of observed volatility | P1 | Review actual PDP count variance over first month; adjust threshold in `.env` if needed |
| 4 | Vercel Blob is available under the project's Vercel plan and its free storage quota is sufficient (< 5MB/year) | Switch `SNAPSHOT_STORAGE=db` (store snapshot as TEXT in `scrape_runs`); no code change in orchestrator | P2 | Verify Vercel Blob availability at project creation; monitor Blob usage monthly |
| 5 | GitHub Actions retry jobs (each sleeping 4h) do not exceed the project's Actions minute quota | Use paid GitHub Actions minutes (~$0.008/min); or adopt Vercel Cron + shorter retry interval | P2 | Check GH Actions usage page after first week; confirm public repo (unlimited minutes) or budget private repo usage |

---

## Failure Modes

| # | Failure Mode | Trigger | Behaviour | Mitigation | Test |
|---|-------------|---------|-----------|------------|------|
| 1 | Cheerio selectors return 0 results | DGFiP HTML structure changed; selectors broken | `SafetyCheckError` thrown; `scrape_runs` recorded as `'failed'`; admin alert sent; no PDP rows modified | Developer updates `parser.ts` selectors; re-triggers via admin endpoint | Unit test: empty `<html>` input to `parser.ts`; assert `SafetyCheckError` |
| 2 | DGFiP returns 429 Too Many Requests | Rate limit triggered | Fetch throws; orchestrator catches; run recorded as `'failed'`; GH Actions step fails → retry after 4h | Single request per day; retry delay is 4 hours — well beyond typical rate limit windows | Mock HTTP 429; assert `failed` run record; assert GH retry signal (non-zero exit) |
| 3 | DGFiP returns 503 Service Unavailable | Site maintenance window | Same as 429; run recorded as `'failed'` | GH Actions retry x2; dead man's switch covers >48h outage | Mock HTTP 503; assert same outcome |
| 4 | Playwright fallback also returns 0 results | JS content still not populated, or browser crash | `SafetyCheckError` thrown from empty-list guard; run recorded as `'failed'`; admin alert | Check data.gouv.fr as alternative source; escalate to manual investigation | Unit test: Playwright mock returning empty HTML; assert `SafetyCheckError` |
| 5 | Safety check blocks a legitimate mass-revocation | DGFiP mass-revokes many platforms simultaneously | Stale data served; admin receives safety alert with counts | Admin verifies source manually; sets `SAFETY_CHECK_OVERRIDE=true`; re-triggers via admin endpoint | Manual test procedure: set override flag; confirm write proceeds; reset flag after |
| 6 | Snapshot write fails | Vercel Blob quota hit, network error during upload | Non-fatal; wrapped try/catch; `raw_html_path = null` in `scrape_runs`; warning logged; scrape run continues normally | Alert if >3 consecutive snapshot failures (indicates storage issue); operator monitors Blob usage | Mock `@vercel/blob` `put()` throwing; assert run completes with `raw_html_path = null` |
| 7 | 90-day snapshot cleanup fails | Blob API error, permissions issue | Old snapshots accumulate; storage grows at ~100KB/day | Non-fatal; warning logged; operator monitors; cleanup is idempotent and will succeed next run | Mock cleanup failure; verify run completes; old snapshots still present; verify warning log |
| 8 | Silent parser regression (partial data, not empty) | CSS selector matches only a subset of PDPs; no exception thrown | Partial list written if above threshold; stale data served | Monitor `change_events` insertion rate: alert if zero changes for 30+ consecutive days (statistically unusual for an active registry) | Staging test: inject partial HTML; observe output; verify diff engine detects partial vs baseline |

---

## Security Implications

- **Authentication:** No auth for outbound scraper requests. The scraper identifies itself via `SCRAPER_USER_AGENT` header (includes operator contact email — standard polite-scraping practice; allows DGFiP to contact operator rather than silently block)
- **Authorisation:** The scraper logic only executes after `ADMIN_SCRAPE_TOKEN` is validated by the admin endpoint; raw scraping is not callable directly
- **Secrets:** `ADMIN_SCRAPE_TOKEN` used to authorise the trigger endpoint; never included in outbound requests to DGFiP; `SCRAPER_USER_AGENT` is intentionally public contact information
- **Data exposure:** Raw HTML snapshots contain DGFiP website content (public data — PDP names, registration info). Snapshots are stored in Vercel Blob (private, token-gated) or local filesystem (gitignored). They are never served publicly. No PII in scraped data.
- **Prompt injection risk:** DGFiP HTML content (PDP names, registration numbers) is parsed by Cheerio and stored as TEXT. Content is sanitised at output (React's JSX escapes HTML; API routes return JSON-encoded strings). No eval or dynamic code execution of scraped content.

---

## Testing & Validation

- **Unit:** `parser.ts` with fixture HTML files covering: (a) well-formed full list, (b) partial list, (c) empty body, (d) completely different page structure; `diff/index.ts` covering: added, removed, status_changed, no_change; `safety/index.ts` covering: 0 results, 40% drop (allowed), 60% drop (blocked), 100% addition (allowed)
- **Integration:** Full scrape run using a local mock HTTP server (`msw` or `nock`) returning fixture HTML; assert `scrape_runs` record created; assert `pdps` and `change_events` records match expected diff
- **Contract:** `ParserInterface` implementors (Cheerio, Playwright) both tested against the same fixture — assert identical output shape
- **Failure injection:** Mock DGFiP 503 → assert `failed` run + retry signal; mock empty HTML → assert `SafetyCheckError`; mock 60% drop → assert `SafetyCheckError`; mock Blob write failure → assert run completes with `raw_html_path=null`

---

## References

- [Cheerio documentation](https://cheerio.js.org/)
- [Playwright documentation](https://playwright.dev/)
- [Vercel Blob SDK documentation](https://vercel.com/docs/storage/vercel-blob)
- [DGFiP impots.gouv.fr](https://www.impots.gouv.fr/)
- [data.gouv.fr open data platform](https://www.data.gouv.fr/)
- [Design document — Failure Modes section](../design/pdp-registry-tracker.md#failure-modes--resilience)
- [ADR-001 — Technology Stack](001-tech-stack.md)

---

## Approval

- **Proposed by:** Architect Agent, 2026-03-26
- **Tech Lead sign-off:** Pending — required before scraper implementation begins
- **P0 gate:** Developer must verify DGFiP URL and HTML structure (static vs JS-rendered) before first commit on `lib/scraper/parser.ts`
