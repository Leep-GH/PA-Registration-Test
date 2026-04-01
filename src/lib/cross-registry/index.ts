/**
 * Cross-registry fuzzy matching service.
 *
 * Matches PA records (DGFiP pdps table) against Peppol AP records where the
 * AP's authority is 'DGFIP' — the same regulatory perimeter.
 *
 * Algorithm:
 *   1. Strip common legal-entity suffixes (SAS, SA, SRL, GmbH, Ltd, …)
 *   2. Lowercase, remove punctuation, collapse whitespace
 *   3. Compute token-overlap similarity score (Jaccard on word tokens)
 *   4. Accept match at score ≥ MATCH_THRESHOLD (default 75)
 *
 * No external dependency — pure TypeScript, easily unit-tested.
 */

import { getAllPdps } from '@/lib/db/repositories/pdps';
import { getAllPeppolAps } from '@/lib/db/repositories/peppol-aps';
import { upsertCrossRegistryLink } from '@/lib/db/repositories/cross-registry-links';
import { logger } from '@/lib/logger';

/** Legal-entity suffixes to strip before comparison (case-insensitive). */
const LEGAL_SUFFIXES = [
  's\\.a\\.s',
  's\\.a\\.r\\.l',
  's\\.r\\.l',
  's\\.a',
  'gmbh',
  'b\\.v',
  'n\\.v',
  'a\\.s',
  'a\\.g',
  'ltd',
  'llc',
  'inc',
  'corp',
  'pty',
  'plc',
  'ab',
  'as',
  'oy',
  'aps',
  'spc',
  'spa',
  's\\.p\\.a',
  'srl',
  'sarl',
  'eurl',
  'sas',
  'sa',
];

const LEGAL_SUFFIX_PATTERN = new RegExp(
  `\\s*(${LEGAL_SUFFIXES.join('|')})\\s*$`,
  'gi',
);

/** Minimum similarity score [0–100] required to persist a cross-registry link. */
export const MATCH_THRESHOLD = 75;

/**
 * Normalises a company name for fuzzy comparison.
 *  - Strip trailing legal suffixes (iterated until stable)
 *  - Lowercase
 *  - Remove non-alphanumeric characters (except spaces)
 *  - Collapse whitespace
 */
export function normalizeName(name: string): string {
  let n = name.trim();
  // Iteratively strip because some names have stacked suffixes, e.g. "Foo S.A.S."
  let prev = '';
  while (n !== prev) {
    prev = n;
    n = n.replace(LEGAL_SUFFIX_PATTERN, '').trim();
  }
  return n
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Jaccard similarity on word-token sets.
 * Returns a score in [0, 100].
 */
export function jaccardScore(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return Math.round((intersection / union) * 100);
}

/**
 * Returns a similarity score [0, 100] between two raw company names.
 * Normalises both names before comparison.
 */
export function similarityScore(nameA: string, nameB: string): number {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (a === b) return 100;
  if (!a || !b) return 0;

  // Exact prefix match boost: if one name starts with the other, score high
  if (a.startsWith(b) || b.startsWith(a)) {
    const shorter = Math.min(a.length, b.length);
    const longer = Math.max(a.length, b.length);
    return Math.round((shorter / longer) * 100);
  }

  return jaccardScore(a, b);
}

/**
 * Runs the cross-registry matching job.
 *
 * Fetches all active PA records and all active Peppol APs with authority='DGFIP',
 * computes pairwise similarity, and persists links above the threshold.
 *
 * Designed to run after both registries have been scraped.
 */
export async function runCrossRegistryMatching(
  threshold: number = MATCH_THRESHOLD,
): Promise<{ linksCreated: number; linksUpdated: number }> {
  const [pdps, peppolAps] = await Promise.all([
    getAllPdps({ isActive: true }),
    getAllPeppolAps({ authority: 'DGFIP', isActive: true }),
  ]);

  const matchedAt = new Date().toISOString();
  let linksCreated = 0;
  let linksUpdated = 0;

  logger.info('[CrossRegistry] Starting matching', {
    pdpCount: pdps.length,
    peppolApCount: peppolAps.length,
    threshold,
  });

  for (const pdp of pdps) {
    let bestScore = 0;
    let bestApId: number | null = null;

    for (const ap of peppolAps) {
      const score = similarityScore(pdp.name, ap.name);
      if (score > bestScore) {
        bestScore = score;
        bestApId = ap.id;
      }
    }

    if (bestApId !== null && bestScore >= threshold) {
      const wasInserted = await upsertCrossRegistryLink(pdp.id, bestApId, bestScore, matchedAt);
      if (wasInserted) {
        linksCreated++;
      } else {
        linksUpdated++;
      }
      logger.info('[CrossRegistry] Match found', {
        pdpName: pdp.name,
        // Do not log PA contact details — pdp.name is business name, not PII
        matchScore: bestScore,
      });
    }
  }

  logger.info('[CrossRegistry] Matching complete', {
    linksCreated,
    linksUpdated,
  });

  return { linksCreated, linksUpdated };
}
