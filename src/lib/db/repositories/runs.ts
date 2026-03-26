import { eq, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { scrapeRuns } from '../schema';
import type { ScrapeRun } from '../schema';

export type { ScrapeRun };

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Inserts a new in-progress run record (status=null sentinel).
 * Returns the new run ID.
 */
export async function insertRun(runAt: string): Promise<number> {
  const db = getDb();
  const result = await db
    .insert(scrapeRuns)
    .values({ runAt, status: null, changesDetected: 0 })
    .returning({ id: scrapeRuns.id });
  return result[0].id;
}

/** Updates an existing run record (used to set final status and metadata). */
export async function updateRun(
  id: number,
  updates: Partial<Omit<ScrapeRun, 'id' | 'runAt'>>,
): Promise<void> {
  const db = getDb();
  await db.update(scrapeRuns).set(updates).where(eq(scrapeRuns.id, id));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns the most recent scrape run regardless of status. */
export async function getLastRun(): Promise<ScrapeRun | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(scrapeRuns)
    .orderBy(sql`${scrapeRuns.id} desc`)
    .limit(1)
    .all();
  return rows[0] ?? null;
}

/** Returns the most recent run whose status is 'success' or 'no_change'. */
export async function getLastSuccessfulRun(): Promise<ScrapeRun | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(scrapeRuns)
    .where(
      sql`${scrapeRuns.status} in ('success', 'no_change')`,
    )
    .orderBy(sql`${scrapeRuns.id} desc`)
    .limit(1)
    .all();
  return rows[0] ?? null;
}

/**
 * Returns true if there's an in-progress run (status IS NULL) started within
 * the last 5 minutes. Used as a secondary server-side guard (module-level
 * isScrapeRunning flag is the primary guard).
 */
export async function isRunInProgress(): Promise<boolean> {
  const db = getDb();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const rows = await db
    .select({ id: scrapeRuns.id })
    .from(scrapeRuns)
    .where(
      sql`${scrapeRuns.status} is null and ${scrapeRuns.runAt} >= ${fiveMinutesAgo}`,
    )
    .limit(1)
    .all();
  return rows.length > 0;
}

/** Returns the last N runs (for display/debugging). */
export async function getRecentRuns(limit = 10): Promise<ScrapeRun[]> {
  const db = getDb();
  return db
    .select()
    .from(scrapeRuns)
    .where(isNotNull(scrapeRuns.status))
    .orderBy(sql`${scrapeRuns.id} desc`)
    .limit(limit)
    .all();
}
