# PDP Registry Tracker

A public web application that monitors the [DGFiP](https://www.impots.gouv.fr/) (Direction Générale des Finances Publiques) official list of certified e-invoicing platforms (Plateformes de Dématérialisation Partenaires).

## Overview

**PDP Registry Tracker** automatically scrapes the [DGFiP PDP registry](https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees) once daily, tracking all changes to the list of certified platforms. It maintains a complete history of when platforms are added, revoked, or have status changes.

### Key Features
- 🔄 **Automated daily scraping** via GitHub Actions
- 📊 **Real-time dashboard** of all certified platforms
- 📜 **Complete change history** with full audit trail
- 📡 **RSS feed** for change notifications
- 📱 **Public REST API** (JSON:API spec, no auth required)
- 🛡️ **Safety guards** prevent corrupted data from overwriting good data
- 🗄️ **Snapshot archival** all raw HTML is kept for audit

## Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS
- **Backend:** Next.js API Routes (Route Handlers)
- **Database:** Drizzle ORM with SQLite (dev) / PostgreSQL (prod)
- **Web Scraping:** Cheerio + Playwright (fallback)
- **Testing:** Vitest
- **Hosting:** Vercel
- **Automation:** GitHub Actions (daily cron)
- **Language:** TypeScript
- **Snapshot Storage:** Local filesystem (dev) / Vercel Blob (prod)

## Quick Start

### Prerequisites
- Node.js ≥ 20.0.0
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/LeePetrie-Sage/PDP-Register.git
   cd PDP-Register
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Key variables:
   - `DGFIP_PDP_URL`: Official DGFiP registry URL (pre-filled in .env.example)
   - `DATABASE_TYPE`: `sqlite` for development
   - `ADMIN_SCRAPE_TOKEN`: Bearer token for admin endpoints (generate one with `openssl rand -hex 32`)

3. **Initialize the database**
   ```bash
   npm run db:generate  # Create migrations
   npm run db:push      # Apply to SQLite
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run tests**
   ```bash
   npm test              # Run tests once
   npm run test:watch    # Watch mode
   npm run test:coverage # Coverage report
   ```

### Database

The app uses **Drizzle ORM** with SQLite in development and PostgreSQL in production.

**Tables:**
| Table | Purpose |
|-------|---------|
| `pdps` | Certified platforms (name, URL, status, first_seen, last_seen) |
| `change_events` | Tracked changes (added, removed, status_changed) with timestamps |
| `scrape_runs` | Scraper execution history (success/failure, platform count, run duration) |
| `subscribers` | Email subscribers (status, confirmation token) |

**Initial setup:**
```bash
npm run db:generate  # Generate migrations from schema
npm run db:push      # Apply migrations to your database
```

For PostgreSQL in production, update `.env.local`:
```
DATABASE_TYPE=postgres
DATABASE_URL=postgres://user:password@host:5432/pdp-tracker
```

Then run the same migration commands.

## Architecture

```
┌──────────────────────────────────────────────────┐
│       GitHub Actions (Daily Cron 05:00 UTC)     │
│   POST /api/admin/trigger-scrape with token    │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Next.js App (Vercel)      │
    │                            │
    │  ┌──────────────────────┐  │
    │  │  API Routes          │  │
    │  │  - v1/* (public)     │  │
    │  │  - admin/*           │  │
    │  │  - rss.xml           │  │
    │  └──────────────────────┘  │
    │           ▲                │
    │           │                │
    │  ┌────────┴──────────┐     │
    │  │   Core Modules    │     │
    │  │ ┌──────────────┐  │     │
    │  │ │ Scraper      │  │     │
    │  │ │ - fetcher    │  │     │
    │  │ │ - parser     │  │     │
    │  │ │ - snapshot   │  │     │
    │  │ └──────────────┘  │     │
    │  │ ┌──────────────┐  │     │
    │  │ │ Diff Engine  │  │     │
    │  │ │ - detect Δ   │  │     │
    │  │ └──────────────┘  │     │
    │  │ ┌──────────────┐  │     │
    │  │ │ Safety Chks  │  │     │
    │  │ │ - empty list │  │     │
    │  │ │ - drop >50%  │  │     │
    │  │ └──────────────┘  │     │
    │  └──────────────────────┘  │
    │           │                │
    │           ▼                │
    │  ┌────────────────────────┐ │
    │  │  Drizzle ORM Layer     │ │
    │  │  - pdps repository     │ │
    │  │  - changes repository  │ │
    │  │  - runs repository     │ │
    │  │  - subscribers repo    │ │
    │  └────────────────────────┘ │
    │                            │
    │  ┌────────────────────────┐ │
    │  │  Web Pages             │ │
    │  │  - / (dashboard)       │ │
    │  │  - /historique         │ │
    │  │  - /pdp/[slug]         │ │
    │  │  - /privacy            │ │
    │  └────────────────────────┘ │
    └────────────────┬─────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    ┌─────────┐         ┌──────────────┐
    │SQLite   │         │PostgreSQL    │
    │(dev)    │         │(prod)        │
    └─────────┘         │Railway/      │
                        │Supabase      │
                        └──────────────┘

Snapshot Storage:
├─ Development  → ./snapshots/{YYYY-MM-DD}.html
└─ Production   → Vercel Blob URL (SNAPSHOT_STORAGE=blob)
```

**Key Data Flows:**

1. **Scrape Trigger** → GitHub Actions calls POST `/api/admin/trigger-scrape`
2. **Fetch & Parse** → Scraper fetches DGFiP page, parses with Cheerio (fallback: Playwright)
3. **Safety Checks** → Validates no empty list, no >50% drop
4. **Snapshot** → Raw HTML archived to filesystem or Vercel Blob
5. **Diff Detection** → Compares parsed platforms against DB state
6. **Persist** → Inserts new platforms, updates changed ones, marks removed ones
7. **Record Run** → Logs scrape success/failure and platform count
8. **Publish** → Data available via web UI and API

## Available Scripts

```bash
# Development
npm run dev           # Start dev server on :3000
npm run build         # Production build
npm run start         # Run production build

# Database
npm run db:generate   # Generate migrations
npm run db:push       # Apply migrations

# Scraping
npm run scrape        # Run scraper manually

# Testing
npm run test          # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Linting
npm run lint          # Check code style
```

## API Documentation

All public API endpoints follow the [JSON:API](https://jsonapi.org/) specification. No authentication required for read access.

**Full OpenAPI spec:** [`docs/api/pdp-registry-tracker.yaml`](docs/api/pdp-registry-tracker.yaml)

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/pdps` | GET | List all platforms (paginated, filterable) |
| `/api/v1/changes` | GET | List change events with filters |
| `/api/v1/status` | GET | Service status and last scrape info |
| `/api/admin/trigger-scrape` | POST | Manually trigger scraper (token required) |
| `/rss.xml` | GET | RSS feed of recent changes |

### Example Requests

**List platforms:**
```bash
curl "https://pdp-tracker.vercel.app/api/v1/pdps?page[limit]=10&page[offset]=0"
```

**Get changes since a date:**
```bash
curl "https://pdp-tracker.vercel.app/api/v1/changes?filter[since]=2026-03-20&filter[type]=added"
```

**Check service status:**
```bash
curl "https://pdp-tracker.vercel.app/api/v1/status"
```

**Manually trigger scrape (admin only):**
```bash
curl -X POST https://pdp-tracker.vercel.app/api/admin/trigger-scrape \
  -H "Authorization: Bearer YOUR_ADMIN_SCRAPE_TOKEN"
```

## Deployment

### To Vercel (Recommended)

1. **Connect GitHub repo to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "New Project" → Select this repo
   - Vercel will auto-detect Next.js configuration

2. **Set environment variables in Vercel project settings:**
   ```
   ADMIN_SCRAPE_TOKEN=         (generate with openssl rand -hex 32)
   DATABASE_TYPE=postgres
   DATABASE_URL=               (your PostgreSQL connection string)
   SNAPSHOT_STORAGE=blob       (use Vercel Blob for snapshots)
   DGFIP_PDP_URL=https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees
   ```

3. **Configure GitHub Actions**
   - Add `ADMIN_SCRAPE_TOKEN` as a GitHub secret
   - The workflow in `.github/workflows/scrape.yml` will run daily at 05:00 UTC
   - It calls `POST /api/admin/trigger-scrape` to start the scraper

### Database Options

**Development:** SQLite (local filesystem)
```
DATABASE_TYPE=sqlite
DATABASE_URL=./data/pdp-tracker.db
```

**Production:** PostgreSQL recommended
- **Railway** ([railway.app](https://railway.app)) — Simple cloud PostgreSQL
- **Supabase** ([supabase.com](https://supabase.com)) — Hosted PostgreSQL + auth tools
- **AWS RDS** — Full-featured PostgreSQL

### Migrations

On first deploy, Drizzle migrations apply automatically. To apply on an existing database:
```bash
npm run db:push
```

## Safety Mechanisms

The scraper includes built-in guards to prevent data corruption:

- **Empty List Guard:** Aborts write if scraper returns 0 platforms
- **Drop Guard:** Aborts write if platform count drops by >50% (configurable via `SAFETY_DROP_THRESHOLD`)
- **In-Progress Lock:** Prevents concurrent scrapes
- **Snapshot Archive:** All raw HTML retained for audit trail

When a safety check fails, the database is not modified and an alert is sent.

## Testing

Comprehensive test coverage with Vitest:

```bash
npm test                # Run all tests once
npm run test:watch     # Watch mode
npm run test:coverage  # Generate coverage report
```

**Coverage targets:** ≥80% line coverage

**Test types:**
- Unit tests for parsers, diff logic, safety checks
- Integration tests for API endpoints
- Real HTML fixtures from DGFiP

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Dashboard
│   ├── layout.tsx           # Root layout
│   ├── historique/          # Change history page
│   ├── pdp/[slug]/          # Platform detail
│   ├── privacy/             # Privacy policy
│   ├── rss.xml/             # RSS feed endpoint
│   └── api/
│       ├── v1/              # Public API
│       ├── admin/           # Admin endpoints
│       ├── subscribe/
│       ├── unsubscribe/
│       └── confirm/
├── components/              # React components
│   ├── change-timeline.tsx
│   ├── pdp-table.tsx
│   ├── stats-bar.tsx
│   └── subscribe-form.tsx
└── lib/                     # Core logic
    ├── db/                  # Database (Drizzle)
    ├── scraper/            # Scraping orchestration
    ├── diff/               # Change detection
    ├── safety/             # Data validation
    └── notifications/      # Alerts
```

## Configuration

See [.env.example](.env.example) for all environment variables with descriptions.

Key variables:
- `DGFIP_PDP_URL`: Official registry URL
- `DATABASE_TYPE`: `sqlite` or `postgres`
- `ADMIN_SCRAPE_TOKEN`: Bearer token for admin endpoints
- `SNAPSHOT_STORAGE`: `local`, `blob`, or `db`
- `SAFETY_DROP_THRESHOLD`: Max allowed percentage drop (default: 50)

## Documentation

- [Technical Design](docs/design/pdp-registry-tracker.md) — Architecture & component specs
- [API Specification](docs/api/pdp-registry-tracker.yaml) — OpenAPI 3.x schema
- [Architecture Decisions](docs/decisions/) — Design rationales (ADRs)
- [Compliance Reviews](docs/reviews/) — Security audits

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Commit with conventional messages: `git commit -m "feat: description"`
6. Push and open a pull request

**Code standards:**
- TypeScript with strict mode enabled
- Async/await throughout (no `.Result` or `.Wait()`)
- ≥80% test coverage
- Lint with `npm run lint`

## License

This project is open source. See LICENSE file for details.

---

**For issues, feedback, or questions:** [Open a GitHub issue](https://github.com/LeePetrie-Sage/PDP-Register/issues)

Built with ❤️ for the French finance community.
