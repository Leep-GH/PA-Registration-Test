import { eq, and } from 'drizzle-orm';
import { getDb } from '../index';
import { crossRegistryLinks } from '../schema';
import type { CrossRegistryLink } from '../schema';

export type { CrossRegistryLink };

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Inserts a cross-registry link between a PA and a Peppol AP.
 * If a link between the same pdpId + peppolApId already exists, updates the
 * score and matchedAt timestamp.
 * Returns true if a new row was inserted, false if an existing row was updated.
 */
export async function upsertCrossRegistryLink(
  pdpId: number,
  peppolApId: number,
  matchScore: number,
  matchedAt: string,
): Promise<boolean> {
  const db = getDb();

  const existing = await db
    .select({ id: crossRegistryLinks.id })
    .from(crossRegistryLinks)
    .where(
      and(
        eq(crossRegistryLinks.pdpId, pdpId),
        eq(crossRegistryLinks.peppolApId, peppolApId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(crossRegistryLinks)
      .set({ matchScore, matchedAt })
      .where(eq(crossRegistryLinks.id, existing[0].id));
    return false; // updated
  } else {
    await db
      .insert(crossRegistryLinks)
      .values({ pdpId, peppolApId, matchScore, matchedAt });
    return true; // inserted
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Returns all cross-registry links for a given PA (pdpId). */
export async function getLinksByPdpId(pdpId: number): Promise<CrossRegistryLink[]> {
  const db = getDb();
  return db
    .select()
    .from(crossRegistryLinks)
    .where(eq(crossRegistryLinks.pdpId, pdpId));
}

/** Returns all cross-registry links for a given Peppol AP. */
export async function getLinksByPeppolApId(peppolApId: number): Promise<CrossRegistryLink[]> {
  const db = getDb();
  return db
    .select()
    .from(crossRegistryLinks)
    .where(eq(crossRegistryLinks.peppolApId, peppolApId));
}

/** Returns all cross-registry links. */
export async function getAllCrossRegistryLinks(): Promise<CrossRegistryLink[]> {
  const db = getDb();
  return db.select().from(crossRegistryLinks);
}

/**
 * Returns a Set of all pdpIds that have at least one cross-registry link.
 * Used by the UI to badge companies appearing in both registries.
 */
export async function getLinkedPdpIds(): Promise<Set<number>> {
  const db = getDb();
  const rows = await db
    .select({ pdpId: crossRegistryLinks.pdpId })
    .from(crossRegistryLinks);
  return new Set(rows.map((r) => r.pdpId));
}

/**
 * Returns a Set of all peppolApIds that have at least one cross-registry link.
 */
export async function getLinkedPeppolApIds(): Promise<Set<number>> {
  const db = getDb();
  const rows = await db
    .select({ peppolApId: crossRegistryLinks.peppolApId })
    .from(crossRegistryLinks);
  return new Set(rows.map((r) => r.peppolApId));
}
