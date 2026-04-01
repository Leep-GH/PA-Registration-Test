# ADR-003 — Peppol Access Point Integration

**Status:** Accepted  
**Date:** 2026-03-30  
**Authors:** Architecture

---

## Context

The tracker currently monitors the DGFiP Approved Platform (PA) registry. A feature request asks us to also track certified Peppol Access Points (APs) from `https://peppol.org/members/peppol-certified-service-providers/`. Many companies appear in both registries; cross-referencing them adds significant value for users.

**Data source confirmed** (2026-03-30):  
Page `https://peppol.org/members/peppol-certified-service-providers/` renders a DataTables-powered server-side HTML table with the following columns:

| # | Column | Notes |
|---|--------|-------|
| 1 | Company name | Commercial name, may include legal suffix |
| 2 | Country/Territory | Country of legal residence, not area of operation |
| 3 | AP certification | "AP Certified" or "−" |
| 4 | SMP certification | "SMP Certified" or "−" |
| 5 | Contact name | PII — stored, never logged |
| 6 | Contact email | PII — stored, never logged, never returned to clients |
| 7 | Peppol Authority | Abbreviated code (DGFIP, BOSA, AGID, KoSIT, OpenPeppol, …) |

French providers carry authority `DGFIP`, which is the same authority that governs the PA registry — making them the primary candidates for cross-registry matching.

## Decision

### 1. Separate DB table (`peppol_aps`)
Store Peppol APs in a dedicated table that mirrors the structure of `pdps` where applicable (slug, name, isActive, firstSeenAt, lastSeenAt) and adds AP-specific fields (country, apCertified, smpCertified, authority, contactName, contactEmail).

**Rejected alternative:** Storing APs in the `pdps` table with a `source` discriminator column. This would pollute the PA-specific schema (status, registrationDate, registrationNumber) and break existing API contracts.

### 2. Cross-registry link table (`cross_registry_links`)
A junction table records confirmed matches between a `pdps` row and a `peppol_aps` row, together with the `matchScore` and `matchedAt` timestamp. This keeps the match metadata auditable and allows re-matching when the algorithm improves.

### 3. Fuzzy name matching (normalised token sort ratio)
Company names across registries are not identical (e.g. "Cegid" vs "Cegid SA"). We use a normalised matching pipeline:
1. Strip legal suffixes (S.A., GmbH, SAS, S.r.l., B.V., Ltd, …)
2. Lowercase + remove punctuation + collapse whitespace
3. Compute Jaro-Winkler-inspired similarity score (token overlap) — implemented in-process, no external dependency
4. Accept match at ≥ 75 / 100

**Note:** Only APs with authority `DGFIP` are matched against PA records (same regulatory perimeter). Non-DGFIP APs are stored but not linked to PAs.

**Rejected alternative:** Using `fuse.js` or a third-party fuzzy library. Adds a production dependency for logic that can be implemented with ~50 lines and tested in isolation.

### 4. Scraper re-uses existing `fetchPage()` utility
The Peppol page is static server-rendered HTML (no JS execution required — Cheerio suffices). We implement a new `PeppolApParser` class following the same `ParserInterface` contract.

### 5. UI: multi-select registry checkboxes
The current single-tab status filter is extended with a registry dimension: PA / Peppol AP / Both. "Both" shows only the cross-linked companies. Companies appearing in both registries get a pill badge ("Also on Peppol").

### 6. New API route `/api/v1/peppol-aps`
Follows the same JSON:API-style envelope pattern as `/api/v1/pdps`. Supports `?country=` and `?authority=` query filters. Cross-registry links are embedded in both the PA and Peppol AP detail responses.

## Consequences

- **Positive:** Users can see the full e-invoicing landscape in one place; cross-registry companies are immediately visible.
- **Positive:** Peppol scraper reuses 95% of the existing pipeline (fetch → parse → safety → snapshot → diff → persist).
- **Negative:** Additional scrape target increases operational surface; Peppol page structure changes will break the parser (mitigated by the existing safety-check pattern).
- **Negative:** Fuzzy matching produces false positives/negatives; manual review capability is not built in this iteration (tracked as future work in TASKS.md).

## References

- [Peppol certified service providers](https://peppol.org/members/peppol-certified-service-providers/)
- [ADR-001 Tech Stack](./001-tech-stack.md)
- [ADR-002 Scraper Strategy](./002-scraper-strategy.md)
