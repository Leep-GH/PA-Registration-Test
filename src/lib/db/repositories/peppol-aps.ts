import { eq, and } from 'drizzle-orm';
import { getDb } from '../index';
import { peppolAps } from '../schema';
import type { PeppolAp } from '../schema';
import type { PeppolApRecord } from '@/lib/scraper/types';

export type { PeppolAp };

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

/**
 * Inserts a new Peppol AP or updates an existing one (matched by slug).
 * Never changes first_seen_at on update.
 * Returns the AP's database ID.
 */
export async function upsertPeppolAp(record: PeppolApRecord, runAt: string): Promise<number> {
  const db = getDb();

  const existing = await db
    .select({ id: peppolAps.id })
    .from(peppolAps)
    .where(eq(peppolAps.slug, record.slug));

  if (existing.length > 0) {
    await db
      .update(peppolAps)
      .set({
        name: record.name,
        country: record.country ?? null,
        apCertified: record.apCertified,
        smpCertified: record.smpCertified,
        contactName: record.contactName ?? null,
        contactEmail: record.contactEmail ?? null,
        authority: record.authority ?? null,
        lastSeenAt: runAt,
        isActive: true,
      })
      .where(eq(peppolAps.slug, record.slug));
    return existing[0].id;
  }

  const result = await db
    .insert(peppolAps)
    .values({
      name: record.name,
      slug: record.slug,
      country: record.country ?? null,
      apCertified: record.apCertified,
      smpCertified: record.smpCertified,
      contactName: record.contactName ?? null,
      contactEmail: record.contactEmail ?? null,
      authority: record.authority ?? null,
      firstSeenAt: runAt,
      lastSeenAt: runAt,
      isActive: true,
    })
    .returning({ id: peppolAps.id });

  return result[0].id;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns Peppol APs filtered by optional country, authority, and/or isActive flag. */
export async function getAllPeppolAps(filter?: {
  country?: string;
  authority?: string;
  isActive?: boolean;
}): Promise<PeppolAp[]> {
  const db = getDb();

  const conditions = [];
  if (filter?.country !== undefined) {
    conditions.push(eq(peppolAps.country, filter.country));
  }
  if (filter?.authority !== undefined) {
    conditions.push(eq(peppolAps.authority, filter.authority));
  }
  if (filter?.isActive !== undefined) {
    conditions.push(eq(peppolAps.isActive, filter.isActive));
  }

  return conditions.length > 0
    ? db.select().from(peppolAps).where(and(...conditions))
    : db.select().from(peppolAps);
}

/** Returns a single Peppol AP by ID, or null if not found. */
export async function getPeppolApById(id: number): Promise<PeppolAp | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(peppolAps)
    .where(eq(peppolAps.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Returns a single Peppol AP by slug, or null if not found. */
export async function getPeppolApBySlug(slug: string): Promise<PeppolAp | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(peppolAps)
    .where(eq(peppolAps.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

/** Returns the count of active Peppol APs. */
export async function countActivePeppolAps(): Promise<number> {
  const all = await getAllPeppolAps({ isActive: true });
  return all.length;
}

/** Marks a Peppol AP as inactive (soft-delete). */
export async function setPeppolApInactive(slug: string, runAt: string): Promise<void> {
  const db = getDb();
  await db
    .update(peppolAps)
    .set({ isActive: false, lastSeenAt: runAt })
    .where(eq(peppolAps.slug, slug));
}
