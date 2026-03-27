/**
 * Scraper orchestrator — coordinates the full scrape pipeline:
 *   fetch → parse → safety-check → snapshot → diff → persist → notify
 *
 * The module-level `isScrapeRunning` flag prevents concurrent invocations
 * within the same Node.js process instance (primary 409 guard).
 */

import { fetchPage } from './fetcher';
import { CheerioPdpParser } from './parser';
import { saveSnapshot, cleanupOldSnapshots } from './snapshot';
import { checkSafety } from '@/lib/safety';
import { detectChanges } from '@/lib/diff';
import {
  getAllPdps,
  upsertPdp,
  setPdpInactive,
  countActivePdps,
} from '@/lib/db/repositories/pdps';
import { insertChangeEvent } from '@/lib/db/repositories/changes';
import { insertRun, updateRun } from '@/lib/db/repositories/runs';
import { getConfirmedSubscribers, getConfirmedSubscribersWithTokens, purgeUnconfirmed } from '@/lib/db/repositories/subscribers';
import { getNotificationService } from '@/lib/notifications/console';
import { logger } from '@/lib/logger';
import type { PdpRecord } from './types';

/** In-process mutex. Prevents duplicate concurrent scrape runs. */
export let isScrapeRunning = false;

export interface ScrapeOutcome {
  runId: number;
  changes: number;
}

/**
 * Runs a complete scrape cycle and returns a summary.
 * Creates a scrape_runs record at the start and updates it on completion.
 * Always sets isScrapeRunning=false in the finally block.
 * Throws on fatal error (after recording failed run in DB).
 */
export async function runScrape(): Promise<ScrapeOutcome> {
  const runAt = new Date().toISOString();
  const runId = await insertRun(runAt);
  isScrapeRunning = true;

  try {
    // Step 1 — Fetch HTML
    const dgfipUrl = process.env.DGFIP_PDP_URL;
    if (!dgfipUrl) throw new Error('DGFIP_PDP_URL env var is not set');

    const rawHtml = await fetchPage(dgfipUrl);

    // Step 2 — Parse with Cheerio
    const cheerioParser = new CheerioPdpParser();
    let records: PdpRecord[] = cheerioParser.parse(rawHtml);

    // Step 3 — Playwright fallback (if enabled and Cheerio returned nothing)
    if (records.length === 0 && process.env.PLAYWRIGHT_FALLBACK === 'true') {
      logger.warn('Cheerio returned 0 results — attempting Playwright fallback');
      try {
        const { PlaywrightPdpParser } = await import('./playwright');
        const pwParser = new PlaywrightPdpParser();
        records = await Promise.resolve(pwParser.parse(rawHtml));
      } catch (pwError) {
        logger.error('Playwright fallback failed', {
          error: pwError instanceof Error ? pwError.message : String(pwError),
        });
      }
    }

    // Step 4 — Safety checks
    const dbCount = await countActivePdps();
    try {
      checkSafety(records.length, dbCount);
    } catch (safetyError) {
      // Alert admin
      const notif = getNotificationService();
      await notif.sendAdminAlert(
        'PDP Tracker — Safety check failed',
        safetyError instanceof Error ? safetyError.message : String(safetyError),
      ).catch(() => {/* admin alert failure is non-fatal */});
      throw safetyError;
    }

    // Step 5 — Save snapshot (non-fatal)
    const snapshotPath = await saveSnapshot(rawHtml, runAt.split('T')[0]);

    // Step 6 — Diff against current DB state
    const currentPdps = await getAllPdps({ isActive: true });
    const diffs = detectChanges(
      records,
      currentPdps.map((p) => ({ id: p.id, slug: p.slug, name: p.name, status: p.status })),
    );

    // Step 7 — Persist: upsert PDPs + mark removed + insert change events
    const slugToId: Record<string, number> = {};
    for (const record of records) {
      const id = await upsertPdp(record, runAt);
      slugToId[record.slug] = id;
    }

    const currentSlugs = new Set(records.map((r) => r.slug));
    for (const existing of currentPdps) {
      if (!currentSlugs.has(existing.slug)) {
        await setPdpInactive(existing.slug, runAt);
      }
    }

    for (const diff of diffs) {
      const pdpId = diff.pdpId !== 0 ? diff.pdpId : (slugToId[diff.pdpSlug] ?? 0);
      await insertChangeEvent({
        pdpId,
        eventType: diff.eventType,
        oldValue: diff.oldValue ? JSON.stringify(diff.oldValue) : null,
        newValue: diff.newValue ? JSON.stringify(diff.newValue) : null,
        detectedAt: runAt,
      });
    }

    // Step 8 — Notify subscribers if changes were detected
    if (diffs.length > 0) {
      try {
        const notif = getNotificationService();
        const subscriberTokens = await getConfirmedSubscribersWithTokens();
        if (subscriberTokens.length > 0) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
          const recipients = subscriberTokens.map((sub) => ({
            email: sub.email,
            unsubscribeUrl: `${appUrl}/api/unsubscribe?token=${sub.token}`,
          }));
          await notif.sendChangeAlert(
            diffs.map((d) => ({
              pdpName: d.pdpSlug,
              eventType: d.eventType,
              oldStatus:
                d.oldValue && typeof d.oldValue === 'object' && 'status' in d.oldValue
                  ? String((d.oldValue as Record<string, unknown>).status)
                  : undefined,
              newStatus:
                d.newValue && typeof d.newValue === 'object' && 'status' in d.newValue
                  ? String((d.newValue as Record<string, unknown>).status)
                  : undefined,
            })),
            recipients,
          );
        }
      } catch (notifError) {
        logger.warn('Notification dispatch failed', {
          error: notifError instanceof Error ? notifError.message : String(notifError),
        });
      }
    }

    // Step 9 — Purge old unconfirmed subscribers (non-fatal)
    try {
      const purged = await purgeUnconfirmed(48);
      if (purged > 0) {
        logger.info('Purged unconfirmed subscribers', { count: purged });
      }
    } catch (purgeError) {
      logger.warn('Failed to purge unconfirmed subscribers', {
        error: purgeError instanceof Error ? purgeError.message : String(purgeError),
      });
    }

    // Step 10 — Cleanup old snapshots (non-fatal)
    cleanupOldSnapshots().catch((e) => {
      logger.warn('Snapshot cleanup encountered an error', {
        error: e instanceof Error ? e.message : String(e),
      });
    });

    // Step 11 — Mark run complete
    const finalStatus = diffs.length > 0 ? 'success' : 'no_change';
    await updateRun(runId, {
      status: finalStatus,
      pdpsFound: records.length,
      changesDetected: diffs.length,
      rawHtmlPath: snapshotPath,
    });

    logger.info('Scrape complete', { runId, status: finalStatus, changes: diffs.length });
    return { runId, changes: diffs.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Scrape failed', { runId, error: message });

    await updateRun(runId, {
      status: 'failed',
      errorMessage: message,
    }).catch(() => {/* ignore secondary failure */});

    throw error;
  } finally {
    isScrapeRunning = false;
  }
}
