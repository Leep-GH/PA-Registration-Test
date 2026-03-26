import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { changeEvents, pdps } from '../schema';
import type { ChangeEvent } from '../schema';

export type { ChangeEvent };

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Inserts a change event record. This table is append-only — no updates or deletes. */
export async function insertChangeEvent(event: {
  pdpId: number;
  eventType: 'added' | 'removed' | 'status_changed';
  oldValue: string | null;
  newValue: string | null;
  detectedAt: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(changeEvents).values(event);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface GetChangesOpts {
  since?: string;
  type?: 'added' | 'removed' | 'status_changed';
  limit: number;
  offset: number;
}

export interface ChangesPage {
  total: number;
  changes: (ChangeEvent & { pdpName: string; pdpSlug: string })[];
}

/** Returns paginated change events with PDP name and slug joined in. */
export async function getChanges(opts: GetChangesOpts): Promise<ChangesPage> {
  const db = getDb();
  const { since, type, limit, offset } = opts;

  const conditions = [];
  if (since) conditions.push(gte(changeEvents.detectedAt, since));
  if (type) conditions.push(eq(changeEvents.eventType, type));

  const where =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(changeEvents);
  const dataQuery = db
    .select({
      id: changeEvents.id,
      pdpId: changeEvents.pdpId,
      eventType: changeEvents.eventType,
      oldValue: changeEvents.oldValue,
      newValue: changeEvents.newValue,
      detectedAt: changeEvents.detectedAt,
      pdpName: pdps.name,
      pdpSlug: pdps.slug,
    })
    .from(changeEvents)
    .leftJoin(pdps, eq(changeEvents.pdpId, pdps.id));

  const countRows = where
    ? await countQuery.where(where)
    : await countQuery;
  const dataRows = where
    ? await dataQuery
        .where(where)
        .orderBy(sql`${changeEvents.detectedAt} desc`)
        .limit(limit)
        .offset(offset)
        
    : await dataQuery
        .orderBy(sql`${changeEvents.detectedAt} desc`)
        .limit(limit)
        .offset(offset)
        ;

  return {
    total: countRows[0]?.count ?? 0,
    changes: dataRows.map((r) => ({
      ...r,
      pdpName: r.pdpName ?? '',
      pdpSlug: r.pdpSlug ?? '',
    })),
  };
}

/** Returns change events from the most recent successful scrape run (by detectedAt match). */
export async function getLatestRunChanges(): Promise<
  (ChangeEvent & { pdpName: string; pdpSlug: string })[]
> {
  const db = getDb();

  // Find the most recent detectedAt timestamp
  const latest = await db
    .select({ detectedAt: changeEvents.detectedAt })
    .from(changeEvents)
    .orderBy(sql`${changeEvents.detectedAt} desc`)
    .limit(1)
    ;

  if (!latest[0]) return [];

  const rows = await db
    .select({
      id: changeEvents.id,
      pdpId: changeEvents.pdpId,
      eventType: changeEvents.eventType,
      oldValue: changeEvents.oldValue,
      newValue: changeEvents.newValue,
      detectedAt: changeEvents.detectedAt,
      pdpName: pdps.name,
      pdpSlug: pdps.slug,
    })
    .from(changeEvents)
    .leftJoin(pdps, eq(changeEvents.pdpId, pdps.id))
    .where(eq(changeEvents.detectedAt, latest[0].detectedAt))
    ;

  return rows.map((r) => ({
    ...r,
    pdpName: r.pdpName ?? '',
    pdpSlug: r.pdpSlug ?? '',
  }));
}

/** Returns the last N change events for a specific PDP. */
export async function getChangesForPdp(
  pdpId: number,
  limit = 50,
): Promise<ChangeEvent[]> {
  const db = getDb();
  return db
    .select()
    .from(changeEvents)
    .where(eq(changeEvents.pdpId, pdpId))
    .orderBy(sql`${changeEvents.detectedAt} desc`)
    .limit(limit)
    ;
}
