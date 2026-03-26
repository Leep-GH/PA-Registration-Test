# ADR-001: Technology Stack

**Status:** Accepted
**Date:** 2026-03-26
**Author:** Architect Agent
**Type:** General

---

## Context

PDP Registry Tracker is a standalone public web application (no Sage Network infrastructure) that must:

1. Serve a responsive dashboard with server-side rendered HTML for SEO and fast first load
2. Expose a public REST API for developers
3. Execute a scheduled daily scrape against an external government website
4. Persist a complete change history in a relational database
5. Send email notifications on change detection (deferred to v2, but architecture must accommodate)

The project is small-team (likely 1–2 developers), has a near-zero operational budget target for low-traffic operation, and requires rapid development. The team has strong TypeScript expertise and wants to avoid managing multiple runtimes, multiple deployment targets, or complex DevOps during v1.

Key drivers ranked by priority:
1. **Low operational cost** at low traffic volumes
2. **Developer velocity** — one language, one codebase
3. **Deployment simplicity** — minimal infrastructure to manage
4. **Correctness and resilience** — data integrity over performance

---

## Decision

Use **Next.js 14 (App Router)** with **TypeScript** as the unified framework for both the web frontend and all API routes, backed by **SQLite** (development) and **PostgreSQL** (production) via **Drizzle ORM**, with **Tailwind CSS** for styling, and **GitHub Actions** as the external cron trigger for the daily scrape job.

---

## Options Considered

### Framework

| Option | Pros | Cons |
|--------|------|------|
| **Next.js 14 App Router (chosen)** | Single codebase for frontend + API; App Router ISR for fast cached public pages; Vercel-native deployment; TypeScript first-class; large ecosystem; server components reduce client JS bundle | Serverless functions limit persistent process; scheduling requires external trigger; App Router has a steeper learning curve than Pages Router |
| Express.js + React (SPA) | Full persistent process; maximum control; no serverless constraints | Two separate deployments; no SSR/ISR without additional tooling; more boilerplate; more DevOps overhead |
| Remix | Similar philosophy to Next.js App Router; good native form handling | Smaller ecosystem; team less familiar; fewer Vercel optimisations |
| SvelteKit | Very small runtime bundle; fast; ergonomic | TypeScript/Drizzle integration less battle-tested; smaller community; team unfamiliar |
| Python (FastAPI + HTMX) | Excellent scraping libraries (BeautifulSoup, Scrapy, httpx); mature scraping ecosystem | Language context switch for TypeScript team; no shared types between frontend/backend |

### ORM / Database Access

| Option | Pros | Cons |
|--------|------|------|
| **Drizzle ORM (chosen)** | Type-safe; single schema file supports both SQLite and PostgreSQL drivers; lightweight (no binary dependency); excellent TypeScript inference; `drizzle-kit` for migrations | Younger project than Prisma; `drizzle-kit` migration tooling is less mature; some advanced query patterns require raw SQL escape hatch |
| Prisma | Industry-standard; excellent DX; schema-first; mature migrations | Prisma Client binary dependency slows cold starts; SQLite and PostgreSQL schemas diverge slightly; no transparent driver swap; slower Vercel cold start |
| Knex + manual types | Flexible; supports multiple DB backends | Zero type safety without manual maintenance; high boilerplate; types drift from schema |
| `better-sqlite3` (raw, no ORM) | Fastest possible SQLite in Node.js | Requires manual migration management; no type safety; not portable to PostgreSQL without full rewrite |

### Scheduling

| Option | Pros | Cons |
|--------|------|------|
| **GitHub Actions cron (chosen)** | Free on all plans; integrates naturally with CI; audit log of every run; no persistent process required; simple HTTP call to admin endpoint | ~1-minute jitter; not a real-time scheduler; depends on GitHub infrastructure availability (~99.5% SLA) |
| node-cron inside Next.js | Co-located with app; no external service | Requires persistent process — incompatible with Vercel serverless deployment |
| Vercel Cron Jobs | Native Vercel integration; no external service | Requires Vercel Pro plan; less transparent than GH Actions; harder to debug |
| Railway worker (standalone Node.js) | Persistent process; reliable cron; no cold start | Additional service and cost to manage; increases operational complexity |

### Hosting

| Option | Pros | Cons |
|--------|------|------|
| **Vercel + Railway PostgreSQL (chosen)** | Vercel: free tier generous; automatic HTTPS + CDN; preview deployments; Railway: managed PG with automatic backups; free tier available | Vercel serverless function timeout (10s hobby / 60s pro) constrains scraper runtime; two vendor accounts |
| Render (full-stack) | Single vendor; persistent process; free PostgreSQL | Less mature CDN; slower cold starts than Vercel; free tier has spin-down delays |
| Fly.io | Full persistent process; PostgreSQL built-in | More DevOps knowledge required; less beginner-friendly; no equivalent to Vercel's Next.js optimisations |
| Self-hosted VPS | Full control | DevOps overhead; no auto-scaling; manual HTTPS; not suitable for a small team |

---

## Consequences

**Positive:**
- Single TypeScript codebase eliminates context switching — types are shared between DB schema, API routes, and React components via Drizzle inferred types
- Next.js App Router ISR (`revalidatePath`) means the dashboard page is statically generated and revalidated post-scrape, delivering sub-100ms public page loads without DB reads on every request
- Drizzle schema is written once (`src/lib/db/schema.ts`) and works immediately with `better-sqlite3` in development (zero setup) and `postgres` in production — migration is a driver swap + `drizzle-kit migrate`
- GitHub Actions cron is free, visible in the repository's Actions tab, and each run is a permanent audit record
- Vercel provides automatic HTTPS, global CDN, and automatic preview deployments at zero extra cost for low-traffic applications

**Negative / Trade-offs:**
- Vercel serverless functions have a 10-second timeout on the Hobby plan (60s on Pro). If Playwright becomes mandatory (JS-rendered DGFiP page), the scraper must be moved to a Railway worker process, introducing a second deployment target. This is documented as a contingency in the design document.
- GitHub Actions cron has ~1-minute jitter and will occasionally miss a scheduled run (~0.5% of the time based on reported SLA). The dead man's switch (48h alert) compensates for missed runs.
- `drizzle-kit` migration tooling is less mature than Prisma Migrate. The Developer must verify migration commands work as expected before relying on them for production deployments.
- App Router RSC mental model requires investment for developers unfamiliar with server components and the `use client` / `use server` boundary.

---

## Assumptions This Decision Makes

| # | Assumption | Fallback if Wrong | Risk Level | How We Test |
|---|-----------|-------------------|------------|-------------|
| 1 | Vercel Hobby/Pro function timeout (60s max) is sufficient for the scrape workload (fetch + parse) | Move scraper to Railway standalone process; Vercel handles frontend and lightweight API only | P1 | Developer times complete scrape run locally using `scripts/run-scrape.ts`; document result in README |
| 2 | Drizzle ORM supports all required query patterns (upsert, diff queries, aggregations) | Use Drizzle `sql` template tag for raw SQL; no ORM swap required | P2 | Prototype diff engine query in Drizzle before committing to pattern |
| 3 | GitHub Actions ~1-minute cron jitter is acceptable for a once-daily scrape | Add Vercel Cron Jobs (Pro) as a secondary trigger | P2 | Observe actual trigger times over first 7 days of operation |
| 4 | Next.js `revalidatePath` called from an API Route Handler correctly invalidates ISR cache | Add a short `revalidate = 3600` fallback on cached pages | P1 | Test `revalidatePath` call from `/api/admin/trigger-scrape` in development; verify page refresh |
| 5 | Railway PostgreSQL free/Starter tier is sufficient for data volume (< 500 PDPs, ~36MB snapshots/year if stored in DB) | Upgrade to paid Railway tier or migrate to Supabase free tier | P2 | Monitor DB size over first 3 months |

---

## Failure Modes

| # | Failure Mode | Trigger | Behaviour | Mitigation | Test |
|---|-------------|---------|-----------|------------|------|
| 1 | Vercel function timeout during scrape | DGFiP site slow or Playwright startup time exceeds limit | Function returns `504`; scrape run not recorded in DB; GitHub Actions step fails | Fetch timeout set to 15s in `fetcher.ts`; GH Actions retry step; if systemic, move to Railway | Local timing test with artificial delay; measure and document |
| 2 | PostgreSQL connection exhaustion | High API concurrency or connection leak in Drizzle pool | API routes return `503` | Drizzle connection pool: `max: 10`, `idleTimeoutMillis: 30000`; pool config in `db/index.ts` | k6 load test: 50 concurrent requests; verify no connection leak |
| 3 | GitHub Actions workflow quota exceeded or outage | GitHub infrastructure issue | Scrape cron is skipped | Dead man's switch (48h alert); Vercel Cron as backup trigger (Pro plan) | Disable workflow; verify dead man's switch alert fires within 48h |
| 4 | Vercel deployment fails | Build error or env var misconfiguration | Frontend returns `502`; API down | Preview deployment catches issues before merge to main; revert to last successful deploy | CI build gate: type-check + lint must pass before merge |

---

## Security Implications

- **Authentication:** Admin endpoint only; Bearer token from env var; token never logged or returned in responses
- **Authorisation:** All `/api/v1/*` routes are public read-only. Only `/api/admin/*` requires auth. Subscriber emails never appear in any public API response.
- **Secrets:** `DATABASE_URL`, `ADMIN_SCRAPE_TOKEN`, `RESEND_API_KEY` stored in Vercel Environment Variables (encrypted at rest) and GitHub Secrets. Never committed to source code. `.env.local` is in `.gitignore`.
- **Data exposure:** Only PII is subscriber email addresses. Drizzle uses parameterised queries throughout — no SQL injection risk. Query parameters in public API routes are validated before use.

---

## Testing & Validation

- **Unit:** Drizzle repository helpers; slug generation; query parameter validation
- **Integration:** Admin endpoint triggers scrape; DB state reflects changes; ISR revalidation fires
- **Contract:** Each API route tested against expected JSON shape using fixture data
- **Failure injection:** Mock PostgreSQL unavailability → assert `503`; mock Vercel timeout → assert GH Actions retry

---

## References

- [Next.js 14 App Router documentation](https://nextjs.org/docs/app)
- [Drizzle ORM documentation](https://orm.drizzle.team/)
- [GitHub Actions `schedule` trigger documentation](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)
- [Design document](../design/pdp-registry-tracker.md)
- [ADR-002 — Scraping Strategy](002-scraper-strategy.md)

---

## Approval

- **Proposed by:** Architect Agent, 2026-03-26
- **Tech Lead sign-off:** Pending — required before implementation begins
