# Compliance Review — PDP Registry Tracker
**Date:** 2026-03-26  
**Reviewed by:** Tech Lead  
**Verdict:** APPROVED (one fix required before real email provider is activated)

---

## 1. Executive Summary

The PDP Registry Tracker codebase is well-written for an experimental v1 project. Security fundamentals are solid: parameterised queries throughout (Drizzle ORM), `timingSafeEqual` on the admin token, no PII in logs, cryptographically strong subscriber tokens, and double opt-in implemented end-to-end. The test suite has 74 passing tests with 91% overall coverage and 0 failures.

One genuine bug was found: the confirm endpoint hard-codes the literal string `'subscriber'` as the email argument to `sendWelcomeEmail()`, which will silently break welcome emails the moment a real email provider (Resend/SendGrid) is plugged in. This must be fixed before switching `NOTIFICATION_PROVIDER` away from `console`.

Three warnings are worth monitoring but do not block approval: no rate limiting on the admin endpoint (mitigated by 256-bit token entropy), an in-memory rate limiter on subscribe that doesn't survive restarts, and a missing `Content-Security-Policy` header. All three are acceptable for a single-instance experimental deployment.

---

## 2. Security Checklist (OWASP Top 10)

| # | Check | File | Status | Notes |
|---|-------|------|--------|-------|
| A01 | Admin endpoint access control — Bearer token required | `trigger-scrape/route.ts` | ✅ | Token checked on every request; 401 on failure |
| A01 | Admin token comparison — timing-safe | `trigger-scrape/route.ts:13` | ✅ | `crypto.timingSafeEqual` used |
| A01 | Admin endpoint — rate limiting | `trigger-scrape/route.ts` | ⚠️ | No rate limit; see Warnings §6 |
| A01 | Subscribe endpoint — IP rate limiting | `subscribe/route.ts:17–29` | ⚠️ | In-memory only; see Warnings §6 |
| A01 | Public API endpoints — no auth required (intentional) | `v1/changes`, `v1/pdps`, `v1/status` | ✅ | Public data; consistent with design |
| A01 | Admin endpoint — in-progress concurrency guard | `trigger-scrape/route.ts:32–36` | ✅ | Returns 409 if scrape running |
| A02 | Email addresses never returned in API responses | all subscribe/confirm/unsubscribe routes | ✅ | Generic messages only |
| A02 | PII never logged | all routes + `console.ts` | ✅ | Explicit `void email` and comment guards |
| A02 | No secrets in source code | all `src/` | ✅ | All secrets via `process.env.*` |
| A02 | `.env.example` — all secret values are empty | `.env.example` | ✅ | Keys present, no values committed |
| A03 | SQL injection — PDPs repository | `repositories/pdps.ts` | ✅ | Drizzle ORM; `eq()`, `and()`, `lt()` throughout; no string interpolation into SQL |
| A03 | SQL injection — subscribers repository | `repositories/subscribers.ts` | ✅ | Drizzle ORM; all parameters bound |
| A03 | `since` date parameter validation | `v1/changes/route.ts:18–24` | ✅ | Regex `/^\d{4}-\d{2}-\d{2}$/` before DB call |
| A03 | `type` parameter allowlist | `v1/changes/route.ts:27–35` | ✅ | Validated against `VALID_TYPES` const array |
| A03 | `status` parameter allowlist | `v1/pdps/route.ts:14–21` | ✅ | Validated against `VALID_STATUSES` const array |
| A03 | Email validated before DB insert | `subscribe/route.ts:65–70` | ✅ | Regex + `trim().toLowerCase()` |
| A03 | Confirmation token validated before DB lookup | `confirm/route.ts:11–18` | ✅ | `/^[0-9a-f]{64}$/` regex guard |
| A03 | Unsubscribe token validated before DB lookup | `unsubscribe/route.ts:11–17` | ✅ | Same regex guard |
| A03 | CSV export — values double-quoted and escaped | `v1/pdps/route.ts:43–53` | ✅ | `"` → `""` escape applied; formula injection risk low (no user-generated content in PDP names) |
| A04 | URL leakage — `DGFIP_PDP_URL` in status response | `v1/pdps/route.ts:65` | ⚠️ | Intentional; PDP URL is public. Acceptable. |
| A05 | Security headers — X-Content-Type-Options | `next.config.mjs:25,36,44` | ✅ | `nosniff` on all routes |
| A05 | Security headers — X-Frame-Options | `next.config.mjs:26,37,45` | ✅ | `DENY` on API; `SAMEORIGIN` on pages |
| A05 | Security headers — Referrer-Policy | `next.config.mjs:27,38,46` | ✅ | `strict-origin-when-cross-origin` |
| A05 | Security headers — Content-Security-Policy | `next.config.mjs` | ⚠️ | Not configured; see Warnings §6 |
| A05 | Admin routes — `Cache-Control: no-store` | `next.config.mjs:23` | ✅ | Prevents caching of admin responses |
| A07 | Timing-safe token comparison — admin | `trigger-scrape/route.ts:13` | ✅ | `timingSafeEqual` used |
| A07 | Length oracle before `timingSafeEqual` | `trigger-scrape/route.ts:11` | ⚠️ | Early return on length mismatch leaks token length; see Warnings §6 |
| A07 | Anti-enumeration on confirm | `confirm/route.ts:27–34` | ✅ | Neutral message for invalid/expired tokens |
| A07 | Anti-enumeration on unsubscribe | `unsubscribe/route.ts:22–23` | ✅ | Always returns 200 |
| A09 | Stack traces returned to clients | all error handlers | ✅ | None found; `error.message` only in internal logs |
| A09 | DB schema or file paths in error responses | all routes | ✅ | Error responses contain only code/message |
| A09 | Failed scrape corrupts DB state | `scraper/index.ts:168–175` | ✅ | `updateRun(failed)` in catch; `isScrapeRunning=false` in finally |

---

## 3. GDPR Compliance

| Check | Location | Status | Notes |
|-------|----------|--------|-------|
| Double opt-in implemented | `subscribe/route.ts` → `confirm/route.ts` | ✅ | Record inserted `confirmed=false`; set to `true` only after token click |
| One-click unsubscribe without login | `unsubscribe/route.ts` | ✅ | GET request, token only, no auth required |
| Subscriber email never returned in API responses | all subscription routes | ✅ | Confirmed; only generic success/error messages |
| Purge of unconfirmed subscribers | `scraper/index.ts:153–161` + `subscribers.ts:purgeUnconfirmed` | ✅ | `purgeUnconfirmed(48)` called on every successful scrape run |
| Privacy notice page exists | `src/app/privacy/page.tsx` | ✅ | Covers: data collected, purpose, double opt-in, retention, GDPR rights (access, rectification, deletion), no cookies |
| Retention policy disclosed | `privacy/page.tsx:§5` | ✅ | Soft-delete on unsubscribe correctly explained as consent-proof record |
| No tracking cookies or third-party analytics | `privacy/page.tsx:§8`, `next.config.mjs` | ✅ | Confirmed; no analytics scripts |
| Soft-delete on unsubscribe | `subscribers.ts:unsubscribeByToken` | ✅ | Sets `unsubscribedAt` timestamp; privacy policy explains this as legitimate legal-basis retention |
| Subscription 409 reveals confirmed status | `subscribe/route.ts:75–78` | ⚠️ | Intentional design decision; minor enumeration risk; documented in code comment |

---

## 4. Scraper Ethics

| Check | Location | Status | Notes |
|-------|----------|--------|-------|
| User-Agent is configurable via env var | `fetcher.ts:9–12` | ✅ | `SCRAPER_USER_AGENT` env var controls it |
| Default User-Agent includes contact info | `fetcher.ts:11` | ✅ | `pdp-tracker/1.0 (https://github.com/pdp-tracker; contact@example.com)` |
| Default User-Agent contact is a placeholder | `fetcher.ts:11` | ⚠️ | `contact@example.com` must be replaced via `SCRAPER_USER_AGENT` env var before deployment; see Warnings §6 |
| Single request per scrape run | `fetcher.ts:fetchPage`, `scraper/index.ts` | ✅ | One `fetch()` call per run; no loop or crawling |
| Timeout enforced | `fetcher.ts:4,20` | ✅ | 15s `AbortController` timeout |
| No aggressive retry inside fetcher | `fetcher.ts` | ✅ | No retries; retry delegated to GitHub Actions cron with 4h gaps |
| No crawling patterns | `scraper/index.ts` | ✅ | One URL, one page, one request |
| `robots.txt` check | `TASKS.md:Phase 0` | ⚠️ | Marked TODO; must be completed before production deployment |

---

## 5. Issues Found (❌ Must Fix)

### ❌ Issue 1 — Confirm route passes placeholder email to `sendWelcomeEmail`

**File:** `src/app/api/confirm/route.ts` lines 26–31  
**Severity:** Blocks production email delivery

```typescript
// CURRENT (broken for real providers)
getNotificationService()
  .sendWelcomeEmail(
    'subscriber', // placeholder — real provider would look up by token
    `${appUrl}/api/unsubscribe?token=${token}`,
  )
```

The `sendWelcomeEmail` interface takes an `email: string` as its first argument. With the current `ConsoleSink` stub this is harmless because the stub explicitly ignores the email (`void email`). However, when `NOTIFICATION_PROVIDER` is set to `resend` or `sendgrid`, the real implementation will receive `'subscriber'` as the delivery address and either fail, send to nobody, or send to a literal address `subscriber` — all silent failures.

**Fix:** Look up the subscriber's email by token before calling `sendWelcomeEmail`. A `getEmailByToken` query function needs to be added to `repositories/subscribers.ts`, and the confirm route should use it:

```typescript
// In repositories/subscribers.ts — add:
export async function getEmailByToken(token: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.token, token))
    .all();
  return rows[0]?.email ?? null;
}

// In confirm/route.ts — replace the sendWelcomeEmail call:
const subscriberEmail = await getEmailByToken(token);
if (subscriberEmail) {
  getNotificationService()
    .sendWelcomeEmail(subscriberEmail, `${appUrl}/api/unsubscribe?token=${token}`)
    .catch(() => {/* non-fatal */});
}
```

---

## 6. Warnings (⚠️ Acceptable but worth monitoring)

### ⚠️ W1 — No rate limiting on admin `/trigger-scrape` endpoint

**File:** `src/app/api/admin/trigger-scrape/route.ts`

There is no request throttling on the POST endpoint. This means a bot could make unlimited authentication attempts. The risk is mitigated by the 64-char randomly-generated token (256 bits of entropy — computationally infeasible to brute-force even with unlimited requests). Acceptable for v1, but a simple `429` after N failed attempts (similar to the subscribe endpoint pattern) would add defence-in-depth for production.

---

### ⚠️ W2 — Length oracle in `validateAdminToken`

**File:** `src/app/api/admin/trigger-scrape/route.ts` lines 10–11

```typescript
if (provided.length !== expected.length) return false;
```

This early return short-circuits before `timingSafeEqual`, meaning an attacker can determine the expected token length by observing which attempts reach `timingSafeEqual`. Since all tokens generated via `openssl rand -hex 32` will be exactly 64 characters, and that length is knowable, the practical information gain is zero. Low risk. Noted for completeness.

---

### ⚠️ W3 — In-memory rate limiter on subscribe endpoint

**File:** `src/app/api/subscribe/route.ts` lines 17–29

The `rateLimitMap` is a module-level `Map`. It is wiped on every process restart / cold start (Vercel serverless) and does not work across multiple instances. For a single-instance deployment or low-traffic app this is sufficient. For horizontal scale, replace with a Redis-backed counter (e.g., Upstash) or rely on Vercel's built-in edge rate limiting.

---

### ⚠️ W4 — Default User-Agent contact is a placeholder

**File:** `src/lib/scraper/fetcher.ts` line 11

```
'pdp-tracker/1.0 (https://github.com/pdp-tracker; contact@example.com)'
```

`contact@example.com` is not a real address. The `SCRAPER_USER_AGENT` env var must be set with a real contact address before production deployment. The `.env.example` already documents this requirement — ensure it is not overlooked during deployment.

---

### ⚠️ W5 — Missing `Content-Security-Policy` header

**File:** `src/next.config.mjs`

The configured headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are solid. However, a `Content-Security-Policy` header is absent. For a Next.js app that doesn't process user-generated HTML, the XSS attack surface is small, but a CSP is standard practice. A permissive starting policy (`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`) can be tightened over time. Low urgency given the data model.

---

### ⚠️ W6 — `toRfc822` catch branch is unreachable dead code

**File:** `src/lib/notifications/rss.ts` line 33  
**Confirmed by coverage report:** line 33 is uncovered (0%)

```typescript
function toRfc822(isoDate: string): string {
  try {
    return new Date(isoDate).toUTCString();
  } catch {
    return isoDate; // ← never reached
  }
}
```

`new Date(isoDate).toUTCString()` never throws in JavaScript. `new Date('invalid')` returns an `Invalid Date` object and `.toUTCString()` returns the string `"Invalid Date"` — no exception. The catch branch silently fails to provide its intended fallback behaviour. The function should be simplified to remove the try/catch, and a check for `Invalid Date` added if the fallback behaviour is genuinely needed.

---

### ⚠️ W7 — `robots.txt` review not completed

**File:** `TASKS.md` Phase 0

The task to review `robots.txt` on `impots.gouv.fr` and DGFiP Terms of Service is still `TODO`. This must be resolved before running the scraper against the production URL. If automated access is prohibited, DGFiP should be contacted before proceeding.

---

## 7. Known Open Items — QA Engineer Assessment

### QA Issue 1: `checkSafety(0, 0)` always throws — is this intentional?

**Assessment: Intentional and correct. No change required.**

The relevant test (`Should_ThrowSafetyCheckError_When_EmptyListAndDbIsAlsoEmpty`) explicitly verifies this. The logic is correctly structured: Guard 1 (`found === 0` → always fatal) fires before Guard 2 (`dbCount > 0` → drop threshold). This means `checkSafety(0, 0)` throws on Guard 1, not Guard 2.

The first-run scenario (empty DB, first real data) is handled correctly: `checkSafety(3, 0)` passes Guard 1 (found > 0) and skips Guard 2 entirely (dbCount is 0). The test `Should_NotThrow_When_DbIsEmptyAndResultsFound` explicitly covers this path. No issue.

---

### QA Issue 2: `saveBlob` pattern using `Function()` eval — is this acceptable?

**Assessment: Acceptable. No change required in v1.**

The pattern in `snapshot.ts` line 108:
```typescript
blobModule = await (Function('return import("@vercel/blob")')() as Promise<unknown>);
```

This is a well-documented technique for dynamic imports of optional packages in Next.js/webpack environments. The string `"@vercel/blob"` is a fixed literal — no user input is involved. This prevents TypeScript from statically resolving the import (which would cause a build error when the package is not installed) and prevents webpack from bundling it. The eslint suppression comment is appropriate. The security risk is negligible.

When `@vercel/blob` is installed and `BLOB_READ_WRITE_TOKEN` is set, this will work correctly. The error message on missing package is clear.

---

### QA Issue 3: `toRfc822` unreachable catch — is this dead code worth removing?

**Assessment: Yes, dead code. Harmless but should be cleaned up (see ⚠️ W6 above).**

The catch block will never execute because `new Date().toUTCString()` does not throw. Additionally, the current behaviour for an invalid date string is to return the string `"Invalid Date"` (from `toUTCString()` on an `Invalid Date` object), not the original `isoDate` string as the developer intended. The defensive code doesn't do what it intends to do.

**Recommended fix:** Remove the try/catch and either trust the data (all `detectedAt` values come from `new Date().toISOString()` which is always valid) or add an explicit validity check:

```typescript
function toRfc822(isoDate: string): string {
  const d = new Date(isoDate);
  return isNaN(d.getTime()) ? isoDate : d.toUTCString();
}
```

---

## 8. Build & Test Results

```
Build:     Not applicable (TypeScript project; tsc via Next.js build)
Tests:     74 passing, 0 failing (8 test files)
```

**Coverage (v8):**

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|---------|-----------|-------|
| All files | 90.95% | 84.55% | 97.22% | 92.68% |
| lib/logger.ts | 100% | 100% | 100% | 100% |
| lib/diff/index.ts | 100% | 100% | 100% | 100% |
| lib/safety/index.ts | 100% | 100% | 100% | 100% |
| lib/notifications/console.ts | 100% | 100% | 100% | 100% |
| lib/notifications/rss.ts | 95% | 100% | 100% | 95% (line 33 — unreachable catch) |
| lib/scraper/fetcher.ts | 100% | 100% | 100% | 100% |
| lib/scraper/parser.ts | 90.62% | 77.08% | 100% | 94.54% |
| lib/scraper/snapshot.ts | 74.5% | 71.42% | 80% | 77.08% (blob/Playwright branches) |

The uncovered lines in `snapshot.ts` (lines 37, 108–126) are the `blob` storage backend and cleanup edge cases — acceptable given `@vercel/blob` is an optional dependency not installed in the test environment. The uncovered parser lines (73, 128–129) are edge-case defensive branches.

---

## 9. Verdict

**APPROVED** — with one required fix before production email delivery is enabled.

### Must Fix Before Switching Email Provider (❌ 1)

1. **`confirm/route.ts` lines 26–31**: Replace `'subscriber'` placeholder with actual subscriber email looked up by token. See §5 Issue 1 for the exact fix. This is a no-op with the current `ConsoleSink` but will silently drop welcome emails with any real provider.

### Should Fix (⚠️ 7 warnings)

In priority order:
1. **W7** — Complete `robots.txt` / ToS review before first production scrape run
2. **W4** — Set `SCRAPER_USER_AGENT` with real contact info in production `.env.local`
3. **W1** — Add rate limiting to admin endpoint (defence-in-depth)
4. **W5** — Add `Content-Security-Policy` header to `next.config.mjs`
5. **W6** — Clean up `toRfc822` dead catch branch and fix the Invalid Date fallback
6. **W3** — Document the in-memory rate limiter limitation; plan Redis-backed solution if scaling
7. **W2** — Document the length-oracle as an accepted risk, or pad tokens to constant length before comparison

### Ready for PR

The codebase is ready for a PR once Issue 1 is resolved. Raise a feature branch, apply the fix to `confirm/route.ts` and the new `getEmailByToken` repository function, and submit for peer review.
