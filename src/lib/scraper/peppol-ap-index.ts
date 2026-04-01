/**
 * Peppol AP scraper orchestrator.
 *
 * Follows the same pattern as the PA scraper (runScrape):
 *   fetch → parse → safety-check → snapshot → persist → cross-registry match
 *
 * Shares the in-process mutex with the PA scraper to prevent concurrent runs.
 */

import { fetchPage } from './fetcher';
import { PeppolApParser } from './peppol-ap-parser';
import {
  getAllPeppolAps,
  upsertPeppolAp,
  setPeppolApInactive,
  countActivePeppolAps,
} from '@/lib/db/repositories/peppol-aps';
import { insertRun, updateRun } from '@/lib/db/repositories/runs';
import { runCrossRegistryMatching } from '@/lib/cross-registry';
import { logger } from '@/lib/logger';
import type { PeppolApRecord } from './types';

/** Confirmed URL — peppol.org members page, server-rendered HTML. */
export const PEPPOL_AP_URL = 'https://peppol.org/members/peppol-certified-service-providers/';

/** Minimum expected AP count. Below this the run is flagged as suspicious. */
const MIN_EXPECTED_APS = 50;

/** In-process mutex — private; exposed read-only via getter. */
let _isPeppolApScrapeRunning = false;

/** Returns whether a Peppol AP scrape is currently in progress. */
export function getIsPeppolApScrapeRunning(): boolean {
  return _isPeppolApScrapeRunning;
}

export interface PeppolApScrapeOutcome {
  runId: number;
  apsFound: number;
  crossLinksCreated: number;
}

/**
 * Runs a complete Peppol AP scrape cycle and returns a summary.
 * Always sets isPeppolApScrapeRunning=false in the finally block.
 */
export async function runPeppolApScrape(): Promise<PeppolApScrapeOutcome> {
  if (_isPeppolApScrapeRunning) {
    throw new Error('Peppol AP scrape already in progress');
  }

  const runAt = new Date().toISOString();
  const runId = await insertRun(runAt);
  _isPeppolApScrapeRunning = true;

  try {
    // Step 1 — Fetch HTML
    const url = process.env.PEPPOL_AP_URL ?? PEPPOL_AP_URL;
    const rawHtml = await fetchPage(url);

    // Step 2 — Parse with Cheerio
    const parser = new PeppolApParser();
    const records: PeppolApRecord[] = parser.parse(rawHtml);

    // Step 3 — Safety check: refuse to proceed if result looks catastrophically wrong
    if (records.length < MIN_EXPECTED_APS) {
      const msg = `Peppol AP safety check failed: expected ≥${MIN_EXPECTED_APS} records, got ${records.length}`;
      logger.error(msg);
      await updateRun(runId, { status: 'failed', pdpsFound: records.length, errorMessage: msg });
      throw new Error(msg);
    }

    // Step 4 — Persist: upsert APs + mark removed
    const currentAps = await getAllPeppolAps({ isActive: true });
    const currentSlugs = new Set(currentAps.map((ap) => ap.slug));
    const newSlugs = new Set(records.map((r) => r.slug));

    for (const record of records) {
      await upsertPeppolAp(record, runAt);
    }

    for (const existing of currentAps) {
      if (!newSlugs.has(existing.slug)) {
        await setPeppolApInactive(existing.slug, runAt);
      }
    }

    // Step 5 — Re-run cross-registry matching
    const { linksCreated, linksUpdated } = await runCrossRegistryMatching();
    const crossLinksCreated = linksCreated + linksUpdated;

    await updateRun(runId, {
      status: 'success',
      pdpsFound: records.length,
      changesDetected: 0,
    });

    logger.info('[PeppolApScrape] Completed', {
      apsFound: records.length,
      crossLinksCreated,
    });

    return { runId, apsFound: records.length, crossLinksCreated };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[PeppolApScrape] Failed', { error: msg });
    await updateRun(runId, { status: 'failed', errorMessage: msg }).catch(() => {/* non-fatal */});
    throw error;
  } finally {
    _isPeppolApScrapeRunning = false;
  }
}
