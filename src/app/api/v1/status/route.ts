export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getLastRun, getLastSuccessfulRun } from '@/lib/db/repositories/runs';
import { countActivePdps } from '@/lib/db/repositories/pdps';
import { getNotificationService } from '@/lib/notifications/console';
import { logger } from '@/lib/logger';

const DEAD_MANS_THRESHOLD_HOURS = 48;

/** Returns the next 05:00 UTC time (today or tomorrow). */
function nextScheduledRun(): string {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0, 0),
  );
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

export async function GET(): Promise<NextResponse> {
  const [lastRun, lastSuccessRun, pdpsCount] = await Promise.all([
    getLastRun(),
    getLastSuccessfulRun(),
    countActivePdps(),
  ]);

  // Dead man's switch check
  let alert: string | undefined;
  const uptimeOk = (() => {
    if (!lastSuccessRun) return false;
    const lastSuccessMs = new Date(lastSuccessRun.runAt).getTime();
    const hoursSince = (Date.now() - lastSuccessMs) / (1000 * 60 * 60);
    return hoursSince < DEAD_MANS_THRESHOLD_HOURS;
  })();

  if (!uptimeOk) {
    const hoursAgo = lastSuccessRun
      ? Math.floor((Date.now() - new Date(lastSuccessRun.runAt).getTime()) / (1000 * 60 * 60))
      : null;

    const alertMsg = lastSuccessRun
      ? `No successful scrape in ${hoursAgo}h (last: ${lastSuccessRun.runAt})`
      : 'No successful scrape run on record';

    alert = alertMsg;
    logger.warn('Dead man\'s switch triggered', { alert: alertMsg });

    // Send admin alert (fire and forget)
    getNotificationService()
      .sendAdminAlert('PDP Tracker — Dead man\'s switch triggered', alertMsg)
      .catch((e: unknown) => {
        logger.error('Failed to send dead man\'s switch alert', {
          error: e instanceof Error ? e.message : String(e),
        });
      });
  }

  const response: Record<string, unknown> = {
    last_run_at: lastRun?.runAt ?? null,
    last_run_status: lastRun?.status ?? null,
    last_successful_run_at: lastSuccessRun?.runAt ?? null,
    pdps_count: pdpsCount,
    changes_last_run: lastRun?.changesDetected ?? 0,
    next_scheduled_run: nextScheduledRun(),
    uptime_ok: uptimeOk,
  };

  if (alert) {
    response['alert'] = alert;
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
