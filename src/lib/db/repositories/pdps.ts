import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { pdps } from '../schema';
import type { Pdp } from '../schema';
import type { PdpRecord } from '@/lib/scraper/types';

export type { Pdp };

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

/**
 * Inserts a new PDP or updates an existing one (matched by slug).
 * Never changes first_seen_at on update.
 * Returns the PDP's database ID.
 */
export async function upsertPdp(record: PdpRecord, runAt: string): Promise<number> {
  const db = getDb();

  const existing = await db
    .select({ id: pdps.id })
    .from(pdps)
    .where(eq(pdps.slug, record.slug))
    ;

  if (existing.length > 0) {
    await db
      .update(pdps)
      .set({
        name: record.name,
        status: record.status,
        registrationNumber: record.registrationNumber ?? null,
        registrationDate: record.registrationDate ?? null,
        websiteUrl: record.websiteUrl ?? null,
        lastSeenAt: runAt,
        isActive: true,
      })
      .where(eq(pdps.slug, record.slug));
    return existing[0].id;
  }

  const result = await db
    .insert(pdps)
    .values({
      name: record.name,
      slug: record.slug,
      status: record.status,
      registrationNumber: record.registrationNumber ?? null,
      registrationDate: record.registrationDate ?? null,
      websiteUrl: record.websiteUrl ?? null,
      firstSeenAt: runAt,
      lastSeenAt: runAt,
      isActive: true,
    })
    .returning({ id: pdps.id });

  return result[0].id;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns PDPs filtered by optional status and/or isActive flag. */
export async function getAllPdps(filter?: {
  status?: string;
  isActive?: boolean;
}): Promise<Pdp[]> {
  const db = getDb();

  const conditions = [];
  if (filter?.status !== undefined) {
    conditions.push(
      eq(pdps.status, filter.status as 'registered' | 'candidate' | 'removed'),
    );
  }
  if (filter?.isActive !== undefined) {
    conditions.push(eq(pdps.isActive, filter.isActive));
  }

  if (conditions.length === 0) {
    return db.select().from(pdps).orderBy(pdps.name);
  }
  if (conditions.length === 1) {
    return db.select().from(pdps).where(conditions[0]).orderBy(pdps.name);
  }
  return db
    .select()
    .from(pdps)
    .where(and(...conditions))
    .orderBy(pdps.name)
    ;
}

/** Returns a single PDP by slug, or null if not found. */
export async function getPdpBySlug(slug: string): Promise<Pdp | null> {
  const db = getDb();
  const rows = await db.select().from(pdps).where(eq(pdps.slug, slug));
  return rows[0] ?? null;
}

/** Soft-deletes a PDP: sets is_active=false, status='removed', last_seen_at=runAt. */
export async function setPdpInactive(slug: string, runAt: string): Promise<void> {
  const db = getDb();
  await db
    .update(pdps)
    .set({ isActive: false, status: 'removed', lastSeenAt: runAt })
    .where(eq(pdps.slug, slug));
}

/** Returns the count of currently active PDPs. */
export async function countActivePdps(): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(pdps)
    .where(eq(pdps.isActive, true))
    ;
  return result[0]?.count ?? 0;
}
