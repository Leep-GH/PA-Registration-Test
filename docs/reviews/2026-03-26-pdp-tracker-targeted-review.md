# Targeted Compliance Review — PDP Registry Tracker (2026-03-26 changes)
**Date:** 2026-03-26  **Reviewed by:** Tech Lead  **Verdict:** APPROVED ⚠️ (one warning)

---

## Changed file checks

| Check | File | Status | Notes |
|-------|------|--------|-------|
| URL extraction security (SSRF risk) | `src/lib/scraper/parser.ts` | ⚠️ | `/^https?:\/\/\S+/` accepts any HTTP/S URL in the cell text. Source is DGFiP's own page (trusted, low SSRF risk), but `\S+` allows URLs with fragments, credentials (`https://user:pass@evil.com`), and non-printable chars. Acceptable for this threat model; note below. |
| No PII logged | `src/lib/scraper/parser.ts` | ✅ | All three log calls emit only `count` (integer) or `htmlLength`/`tablesFound` (integers). No names, emails, or addresses logged. |
| No secrets in code | `src/lib/scraper/parser.ts` | ✅ | File is clean. No credentials, tokens, or connection strings. |
| No real PII in test data | `src/lib/scraper/__tests__/parser.test.ts` | ✅ | All fixture company names are fictional (`Entreprise Alpha SA`, `Société Bêta SARL`, `Candidat Gamma SAS`). All URLs use `example.com` or `plain.example.com`. One inline test includes `pdp@test.com` as a table cell value — this is clearly synthetic test data, not real PII. |
| `.env.example` — no secrets committed | `.env.example` | ✅ | `ADMIN_SCRAPE_TOKEN` is empty (`=`). `DATABASE_URL` is the SQLite dev default path (not a credential). `DGFIP_PDP_URL` contains the confirmed public URL (not a secret). No passwords, API keys, or tokens with values present. |
| `package.json` engines field | `package.json` | ✅ | `"node": ">=20.0.0"` is correct. Node 20 is current LTS; lower-bound only is standard npm convention. No risk. |

---

## P0 gate resolution

| Item | Status | Evidence |
|------|--------|----------|
| P0-GATE: `DGFIP_PDP_URL` set to verified working URL | ✅ RESOLVED | `.env.example` line 32: `DGFIP_PDP_URL=https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees`. Comment confirms robots.txt check passed and page structure verified 2026-03-26. |
| Email bug: `confirmedEmail` passed to `sendWelcomeEmail()` (not literal `'subscriber'`) | ✅ RESOLVED | `src/app/api/confirm/route.ts` line 27: `sendWelcomeEmail(confirmedEmail, ...)` — the resolved email from `confirmSubscriber(token)` is passed correctly. |

---

## URL extraction — detailed risk assessment

**Pattern:** `/^https?:\/\/\S+/.test(text)` in `extractUrl()` (`parser.ts` line ~100).

**What it permits:**
- `https://legit-pdp.fr/` — correct
- `https://user:pass@evil.com` — userinfo component allowed; no credential exfiltration risk here since it's a stored website URL (not used to make outbound requests from the service itself)
- `https://192.168.1.1/internal` — private IP; same caveat — this URL is stored and displayed, not fetched
- `https://evil.com%0d%0a` + whitespace unicode that passes `\S` in some locales — theoretical only

**SSRF relevance:** The URL is stored in the database as `websiteUrl` and surfaced in the UI. The service does **not** make HTTP requests to `websiteUrl` anywhere. True SSRF requires the server to fetch the URL; this service only stores it. Risk is **low**.

**Residual risk:** A malicious entry on the DGFiP page could inject a misleading URL (e.g., phishing link displayed on the tracker's UI). Given the source is a government registry page, this is an acceptable residual risk within the existing threat model. No code change required, but the risk is noted.

---

## Warnings (⚠️)

1. **URL validation breadth** — `parser.ts` `extractUrl()`: Consider tightening the plain-text URL regex to reject URLs containing `@` (credential userinfo) or private IP ranges if `websiteUrl` is ever used for outbound fetch in future. Not a blocker today but worth an in-code comment acknowledging the limitation.

---

## Verdict

**APPROVED**

Both P0 items from the prior review are confirmed resolved. No new blockers introduced. One ⚠️ warning (URL regex breadth) is documented above — it does not block approval given the low-risk threat model.

No further rework required before PR.
