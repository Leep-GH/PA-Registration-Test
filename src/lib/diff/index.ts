import type { PdpRecord } from '@/lib/scraper/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PreviousPdp {
  id: number;
  slug: string;
  name: string;
  status: string;
}

export interface DiffResult {
  pdpSlug: string;
  /** 0 for 'added' events where the DB ID is not yet known */
  pdpId: number;
  eventType: 'added' | 'removed' | 'status_changed';
  oldValue: object | null;
  newValue: object | null;
}

// ---------------------------------------------------------------------------
// detectChanges — pure function, no DB access
// ---------------------------------------------------------------------------

/**
 * Compares a freshly-parsed list of PDPs against the current DB state.
 * Returns an array of change events to be persisted.
 *
 * Matching is done by slug. A slug is derived once on first insertion and
 * never changes (even if the platform is renamed), so slug is the stable key.
 *
 * @param current  - Records returned by the parser this run
 * @param previous - Current DB state (active PDPs only)
 */
export function detectChanges(
  current: PdpRecord[],
  previous: PreviousPdp[],
): DiffResult[] {
  const changes: DiffResult[] = [];

  const prevMap = new Map<string, PreviousPdp>(previous.map((p) => [p.slug, p]));
  const currMap = new Map<string, PdpRecord>(current.map((c) => [c.slug, c]));

  // Added: appears in current but not in previous
  for (const curr of current) {
    if (!prevMap.has(curr.slug)) {
      changes.push({
        pdpSlug: curr.slug,
        pdpId: 0, // resolved after upsert
        eventType: 'added',
        oldValue: null,
        newValue: { name: curr.name, status: curr.status },
      });
    } else {
      // Status changed: exists in both but status differs
      const prev = prevMap.get(curr.slug)!;
      if (prev.status !== curr.status) {
        changes.push({
          pdpSlug: curr.slug,
          pdpId: prev.id,
          eventType: 'status_changed',
          oldValue: { status: prev.status, name: prev.name },
          newValue: { status: curr.status, name: curr.name },
        });
      }
    }
  }

  // Removed: exists in previous but not in current
  for (const prev of previous) {
    if (!currMap.has(prev.slug)) {
      changes.push({
        pdpSlug: prev.slug,
        pdpId: prev.id,
        eventType: 'removed',
        oldValue: { name: prev.name, status: prev.status },
        newValue: null,
      });
    }
  }

  return changes;
}
