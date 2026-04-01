# Compliance Review — Peppol Access Point Integration (Phase 5)

**Date:** 2026-03-30  
**Reviewed by:** Tech Lead  
**Stack:** TypeScript / Next.js 14 (not .NET — standards applied proportionally)  
**Verdict:** ❌ NEEDS REWORK

---

## Results

| Category | Status | Issues |
|----------|--------|--------|
| A. Secrets & Configuration | ✅ | 0 |
| B. Authentication & Authorisation | ✅ | 0 |
| C. Load Balancer / API Gateway | n/a | — |
| D. Rate Limiting | ❌ | 2 |
| E. External Service Calls | ✅ | 0 |
| F. Database | ✅ | 0 |
| G. ETL | n/a | — |
| H. API Standards | ⚠️ | 2 |
| I. Code Quality | ⚠️ | 3 |
| J. Observability | ✅ | 0 |
| K. Testing | ❌ | 2 |
| L. Infrastructure | n/a | Node/Vercel project |
| M. Architecture | ✅ | 0 |

---

## Build & Test Results

- **Build:** 0 errors, 0 warnings (TypeScript strict mode; all types resolve)
- **Tests:** 113 passing, 0 failing
- **Coverage (all files):** 75.8% statements, 73.17% branches, 77.19% functions, 76.53% lines
- **Threshold:** 80% (configured in `vitest.config.ts`)
- **Coverage by new module:**
  - `lib/scraper/peppol-ap-parser.ts`: 94.28% stmt / 84.61% branch ✅
  - `lib/cross-registry/index.ts`: **56.86% stmt / 60% branch** ❌ (lines 132–179 = `runCrossRegistryMatching()` uncovered)
  - `lib/scraper/peppol-ap-index.ts`: **0% stmt / 0% branch** ❌ (entire orchestrator uncovered)

---

## Detailed Findings

### A. Secrets & Configuration ✅

- No hardcoded secrets anywhere in `src/`. All sensitive values (`ADMIN_SCRAPE_TOKEN`, `DATABASE_URL`) read from `process.env.*` at runtime.
- `.env.example` has empty placeholder values — no real secrets committed.
- `PEPPOL_AP_URL` overrideable via env var in `peppol-ap-index.ts` (line 63: `process.env.PEPPOL_AP_URL ?? PEPPOL_AP_URL`).
- PII fields (`contactName`, `contactEmail`) stored in DB with schema comments confirming they are never logged and never returned to clients.

### B. Authentication & Authorisation ✅

- `validateAdminToken()` reads the expected token from `process.env.ADMIN_SCRAPE_TOKEN` at call time (not module init) — no startup-time secret capture.
- `timingSafeEqual` from Node.js `crypto` used correctly. Length pre-check is necessary because `timingSafeEqual` throws a `RangeError` on mismatched lengths; this is the documented pattern.
- Correct 401 on missing/invalid token. No stack trace or internal detail leaked in error response.
- Admin endpoint is correctly absent from public OpenAPI responses.

### D. Rate Limiting ❌

**❌ D1: No rate limiting on `POST /api/admin/trigger-peppol-ap-scrape`**  
File: `src/app/api/admin/trigger-peppol-ap-scrape/route.ts`  
The admin endpoint accepts unlimited requests. Even with timing-safe comparison, an unauthenticated attacker can brute-force token candidates at the rate the server allows. The existing `trigger-scrape` route (`src/app/api/admin/trigger-scrape/route.ts`) has the same gap — this feature replicates it without fixing it.  
**Fix:** Apply the same in-process IP-keyed rate limit used by `src/app/api/subscribe/route.ts`, or configure Vercel's edge rate limiting. Return 429 with `Retry-After` on breach.

**❌ D2: No rate limiting on `GET /api/v1/peppol-aps`**  
File: `src/app/api/v1/peppol-aps/route.ts`  
The public endpoint has no rate limiting. The existing `/api/v1/pdps` route also lacks this (pre-existing gap), but every new public route must add it per the standard.  
**Fix:** Apply IP-keyed rate limiting at the route level or via Vercel middleware. Return 429 on breach. Add `X-Rate-Limit-*` response headers.

### E. External Service Calls ✅

- `fetchPage()` in `src/lib/scraper/fetcher.ts` has a 15 s timeout (verified in existing unit tests).
- No new HTTP clients introduced. Peppol scraper reuses `fetchPage()`.
- Safety check enforces `MIN_EXPECTED_APS = 50` before any DB writes — acts as a circuit breaker for structural page changes.

### F. Database ✅

- `peppol_aps` schema: `slug` unique constraint ✅, FK from `cross_registry_links.pdpId → pdps.id` and `cross_registry_links.peppolApId → peppol_aps.id` ✅.
- Soft-delete pattern (`isActive` boolean) consistent with `pdps` table ✅.
- `upsertPeppolAp()` never overwrites `firstSeenAt` ✅.
- `upsertCrossRegistryLink()` uses explicit select-then-insert/update — no UPSERT race on concurrent calls (acceptable given in-process mutex).

### H. API Standards ⚠️

**⚠️ H1: Missing `X-Rate-Limit-*` response headers**  
Both new routes lack `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, and `X-Rate-Limit-Reset` headers. These are required on all responses once rate limiting is added (see D1, D2). This will be fixed as a consequence of fixing D.

**⚠️ H2: `POST /api/admin/trigger-peppol-ap-scrape` does not support `Idempotency-Key`**  
File: `src/app/api/admin/trigger-peppol-ap-scrape/route.ts`  
The spec (`docs/api/pdp-registry-tracker.yaml`) does not document `Idempotency-Key` for this endpoint. The in-progress guard returns 409 on duplicate concurrent calls, but repeated calls after a run completes will fire a new scrape. The existing `trigger-scrape` has the same gap and was accepted. This is documented as a known limitation. **No action required before merge**, but should be tracked.

### I. Code Quality ⚠️

**⚠️ I1: Dead code in `pdp-table.tsx` after closing brace (likely merge artifact)**  
File: `src/components/pdp-table.tsx`, lines ~348 onwards  
After `export default function PdpTable(...)` closes at line ~347, there is an orphan block containing `useState` declarations, helper functions, and a partial `return(...)` — an earlier version of the component was not removed. The TypeScript compiler accepts this as top-level, freestanding declarations that reference hook functions at module scope (compile error for `useState` calls outside a component); this will likely cause a TypeScript / React lint error. **Verify by running `tsc --noEmit` and check that ESLint does not flag hook violations.** Remove the orphan block.

**⚠️ I2: `linksCreated` / `linksUpdated` counter semantics are incorrect**  
File: `src/lib/cross-registry/index.ts`, lines 161–165  
The code counts `linksCreated++` when `bestScore === 100` and `linksUpdated++` otherwise. This uses score value as a proxy for insert vs. update, which is incorrect: a score-100 match on a second run will hit an existing row and `upsertCrossRegistryLink` will update it, but the counter calls it "created". The metric will appear inflated. The counters propagate to the orchestrator's `PeppolApScrapeOutcome.crossLinksCreated`, so the inaccuracy is user-visible.  
**Fix:** Have `upsertCrossRegistryLink()` return a boolean indicating whether a row was inserted, and use that to increment the correct counter.

**⚠️ I3: `isPeppolApScrapeRunning` is exported as `export let` (mutable from outside the module)**  
File: `src/lib/scraper/peppol-ap-index.ts`, line 30  
Any importing module can write `isPeppolApScrapeRunning = false`, bypassing the mutex. This is consistent with the existing `isRunning` pattern in `index.ts` (pre-existing), but adds another mutation surface.  
**Fix:** Export a read-only getter function `export function getIsPeppolApScrapeRunning(): boolean` and keep the variable unexported. Update the admin route consumer accordingly.

### J. Observability ✅

- All new logger calls use message templates with structured context objects — no string interpolation.
- `pdp.name` (logged in `[CrossRegistry] Match found`) is a company's public tradename from a government registry — not PII. Acceptable.
- `contactName` and `contactEmail` appear nowhere in any log statement across new files (confirmed by grep).
- Safety check failure path: both `logger.error()` and `updateRun()` called before throwing ✅.
- Orchestrator success path: `logger.info('[PeppolApScrape] Completed', { apsFound, crossLinksCreated })` ✅.
- Error responses do not echo internal error messages to clients (error detail is a fixed string: `'Failed to retrieve Peppol AP data.'`).

### K. Testing ❌

**❌ K1: `peppol-ap-index.ts` orchestrator has 0% coverage**  
File: `src/lib/scraper/peppol-ap-index.ts`, lines 24–105  
The orchestrator (`runPeppolApScrape()`) is entirely untested. This is the highest-risk module: it controls the mutex, calls the safety check, manages DB state, and handles all error paths. All of these code paths are uncovered.  
**Fix (QA Engineer):** Unit test with DB and HTTP mocked:
- Happy path: mock `fetchPage()` → mock `PeppolApParser.parse()` → mock repositories → assert outcome.
- Safety check failure: parser returns < 50 records → assert run record updated to 'failed', mutex released.
- `fetchPage()` throws → assert run record updated to 'failed', mutex released.
- Already-running guard: set `isPeppolApScrapeRunning = true` → call `runPeppolApScrape()` → assert throws.

**❌ K2: `runCrossRegistryMatching()` (lines 132–179 of `cross-registry/index.ts`) has 0% coverage**  
The async database-dependent portion of the cross-registry service is untested. The pure functions (`normalizeName`, `jaccardScore`, `similarityScore`) are well-covered (18 tests), but the orchestration layer that calls the repositories and accumulates counts is not.  
**Fix (QA Engineer):** Unit test with mocked repository calls:
- No PDPs / no APs → returns `{ linksCreated: 0, linksUpdated: 0 }`.
- One exact match at score 100 → `upsertCrossRegistryLink` called once, `linksCreated: 1`.
- One partial match at score 75 → `linksUpdated: 1`.
- No match below threshold → `upsertCrossRegistryLink` not called.

**Overall coverage (vitest --coverage output)**  
```
All files: 75.8% stmts / 73.17% branches / 77.19% functions / 76.53% lines
```
All four metrics are below the configured 80% threshold. CI (`npm test` with `--coverage`) reports three `ERROR: Coverage ... does not meet global threshold` lines.

**⚠️ K3: TASKS.md Phase 5 test tasks still marked TODO**  
`src/lib/scraper/__tests__/peppol-ap-parser.test.ts` and `src/lib/cross-registry/__tests__/index.test.ts` exist and pass (33 tests), but the corresponding rows in TASKS.md remain `TODO`. Not a code issue; update TASKS.md to DONE after K1/K2 are addressed.

### M. Architecture ✅

- ADR-003 (`docs/decisions/003-peppol-ap-integration.md`) is present, comprehensive, and correctly documents the decisions made.
- Design assumptions all have documented mitigations (parser breakage → safety check; false positive matches → manual review tracked in TASKS.md).
- Separate `peppol_aps` table (not reusing `pdps`) is the correct decision per ADR-003; it avoids polluting the PA schema.
- DGFIP-scoped matching is appropriately conservative.
- Peppol AP URL confirmation documented in ADR-003 and TASKS.md (2026-03-30).

---

## Must Fix (❌)

1. **D. Rate Limiting: No rate limit on `POST /api/admin/trigger-peppol-ap-scrape`**  
   `src/app/api/admin/trigger-peppol-ap-scrape/route.ts`  
   Add IP-keyed rate limiting (e.g. max 5 req/min). Return 429 + RFC 7807 body on breach. Add `X-Rate-Limit-*` headers to all responses.

2. **D. Rate Limiting: No rate limit on `GET /api/v1/peppol-aps`**  
   `src/app/api/v1/peppol-aps/route.ts`  
   Apply same rate limit pattern. Return 429 on breach.

3. **K. Testing: `peppol-ap-index.ts` orchestrator at 0% coverage**  
   `src/lib/scraper/peppol-ap-index.ts`  
   Write unit tests covering happy path, safety check failure, fetch failure, and already-running guard. See K1 detail above.

4. **K. Testing: `runCrossRegistryMatching()` at 0% coverage**  
   `src/lib/cross-registry/index.ts` lines 132–179  
   Write unit tests with mocked repositories covering all match/no-match paths. See K2 detail above.

---

## Should Fix (⚠️)

1. **I. Code Quality: Dead orphan code block in `pdp-table.tsx`**  
   `src/components/pdp-table.tsx` — remove all lines after the component's closing `}` on line ~347.

2. **I. Code Quality: `linksCreated`/`linksUpdated` counter semantics wrong**  
   `src/lib/cross-registry/index.ts` lines 161–165 — return insert/update boolean from `upsertCrossRegistryLink()` and use it to count correctly.

3. **I. Code Quality: `isPeppolApScrapeRunning` is a mutable export**  
   `src/lib/scraper/peppol-ap-index.ts` line 30 — replace with a read-only getter function.

4. **K. Process: Update TASKS.md Phase 5 test rows to DONE**  
   Parser and cross-registry pure-function tests are written and passing.

---

## Fix Ownership

| Item | Owner |
|------|-------|
| D1, D2 (rate limiting) | Developer |
| K1, K2 (test coverage) | QA Engineer |
| I1 (dead code), I2 (counter semantics), I3 (mutable export) | Developer |
| K3 (TASKS.md) | Developer |

Re-submit for Tech Lead sign-off after must-fix items resolved. Re-run `npm test -- --coverage` to confirm all thresholds pass before resubmitting.
