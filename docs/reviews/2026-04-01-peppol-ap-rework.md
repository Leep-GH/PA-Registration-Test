# Compliance Re-Review — Peppol AP Integration (Phase 5 Rework)

**Date:** 2026-04-01  
**Reviewed by:** Tech Lead  
**Rework of:** `docs/reviews/2026-03-30-peppol-ap-integration.md`  
**Stack:** TypeScript / Next.js 14 (standards applied proportionally)  
**Verdict:** ✅ APPROVED

---

## Summary

All must-fix items from the 2026-03-30 review have been resolved. Should-fix items have also been addressed. Coverage thresholds now pass on all four metrics.

---

## Test & Coverage Results

- **Build:** 0 errors, 0 warnings
- **Tests:** 139 passing, 0 failing (was 113 before rework)
- **New test files:** `src/lib/scraper/__tests__/peppol-ap-index.test.ts` (10 tests), `src/lib/__tests__/rate-limit.test.ts` (10 tests)
- **New tests added to existing file:** `src/lib/cross-registry/__tests__/index.test.ts` (+6 tests for `runCrossRegistryMatching`)

| Metric | Before Rework | After Rework | Threshold | Status |
|--------|--------------|--------------|-----------|--------|
| Statements | 75.8% | **93.39%** | 80% | ✅ |
| Branches | 73.17% | **85.89%** | 80% | ✅ |
| Functions | 77.19% | **96.29%** | 80% | ✅ |
| Lines | 76.53% | **95.85%** | 80% | ✅ |

---

## Must-Fix Resolution

### ✅ D1 — Rate limiting on `POST /api/admin/trigger-peppol-ap-scrape`

`src/app/api/admin/trigger-peppol-ap-scrape/route.ts` — limit: 5 req/min per IP. Returns 429 with RFC 7807 body on breach. `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`, and `Retry-After` headers on all responses. **RESOLVED.**

### ✅ D2 — Rate limiting on `GET /api/v1/peppol-aps`

`src/app/api/v1/peppol-aps/route.ts` — limit: 60 req/min per IP. Same header and 429 pattern. **RESOLVED.**

### ✅ K1 — `peppol-ap-index.ts` orchestrator at 0% coverage

`src/lib/scraper/__tests__/peppol-ap-index.test.ts` created with 10 tests:
- Happy path: correct outcome, `updateRun` called with `status: 'success'`, `runCrossRegistryMatching` called
- `upsertPeppolAp` called per record
- Stale AP marked inactive; active AP not touched
- Safety check failure: throws, `updateRun` called with `status: 'failed'`
- `fetchPage` failure: throws, `updateRun` called with `status: 'failed'`
- Mutex released on throw
- Already-running guard: second concurrent call throws immediately

Coverage after: `peppol-ap-index.ts` — 100% statements / 90% branches (line 105 is the `countActivePeppolAps` import, unused path — pre-existing). **RESOLVED.**

### ✅ K2 — `runCrossRegistryMatching()` at 0% coverage

6 tests added to `src/lib/cross-registry/__tests__/index.test.ts`:
- No PDPs → `{ linksCreated: 0, linksUpdated: 0 }`, `upsertCrossRegistryLink` not called
- No Peppol APs → same
- Insert path (`upsertCrossRegistryLink` returns `true`) → `linksCreated: 1`
- Update path (`upsertCrossRegistryLink` returns `false`) → `linksUpdated: 1`
- Score below threshold → `upsertCrossRegistryLink` not called
- Multiple PDPs → counts accumulate correctly

Coverage after: `cross-registry/index.ts` — 98.03% statements / 96% branches. **RESOLVED.**

---

## Should-Fix Resolution

### ✅ I1 — Dead orphan code in `pdp-table.tsx`

Confirmed: `src/components/pdp-table.tsx` is 346 lines. The component closes correctly on the final line with no orphan code. Code was already clean, no change required. **CONFIRMED CLEAN.**

### ✅ I2 — `linksCreated`/`linksUpdated` counter semantics

`src/lib/db/repositories/cross-registry-links.ts` — `upsertCrossRegistryLink()` returns `boolean` (`true` = inserted, `false` = updated). `src/lib/cross-registry/index.ts` uses the return value (`wasInserted`) to increment the correct counter. Counter semantics now match actual DB behavior. **RESOLVED.**

### ✅ I3 — Mutable `isPeppolApScrapeRunning` export

`src/lib/scraper/peppol-ap-index.ts` — module-private `let _isPeppolApScrapeRunning = false` with exported read-only getter `getIsPeppolApScrapeRunning(): boolean`. No external module can mutate the flag. **RESOLVED.**

### ✅ K3 — TASKS.md Phase 5 test rows

`PeppolApParser` and cross-registry pure-function test rows updated to DONE in TASKS.md. **RESOLVED.**

---

## Additional Items Addressed

### Coverage: `rate-limit.ts` at 0%

`src/lib/__tests__/rate-limit.test.ts` created with 10 tests covering:
- Allow under limit, correct headers
- Remaining count decrement
- Deny on limit exceeded, `Retry-After` header
- Window expiry resets counter
- Per-key isolation

Coverage after: `rate-limit.ts` — 100% across all metrics. ✅

### Coverage: `i18n.ts` excluded

`src/lib/i18n.ts` added to `vitest.config.ts` coverage exclusion list. Rationale: pure translation dictionary (`as const` object + a single pass-through lookup function). No business logic, no conditional paths warranting unit tests — same category as `notifications/interface.ts` which was already excluded.

---

## Known Limitations (Carried Forward, Accepted)

| Item | Location | Notes |
|------|----------|-------|
| `snapshot.ts` blob path uncovered | `src/lib/scraper/snapshot.ts` lines 37, 107–125 | Requires `@vercel/blob` optional dep — not unit-testable. Documented in prior review. |
| `parser.ts` edge branches | `src/lib/scraper/parser.ts` lines 94, 189–190 | Pre-existing partial branch gap. Documented in prior review (90.62% stmt). |
| Integration tests | Various | Phases 2–3 integration + contract tests remain TODO per TASKS.md. Out of scope for this review cycle. |

---

## Verdict

**✅ APPROVED**

All must-fix and should-fix items from the 2026-03-30 review are resolved. Coverage thresholds pass on all four metrics. 139 tests passing with 0 failures. The Phase 5 Peppol AP integration is approved to proceed to deployment.
