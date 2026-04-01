export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { runScrape, isScrapeRunning } from '@/lib/scraper';
import { logger } from '@/lib/logger';

/**
 * Vercel Cron Job handler — called daily by Vercel's scheduler.
 * Vercel sends: GET /api/cron/scrape
 *               Authorization: Bearer <CRON_SECRET>
 *
 * Set CRON_SECRET in Vercel environment variables (Settings → Environment Variables).
 * Generate a strong random value, e.g.: openssl rand -hex 32
 */
function validateCronSecret(provided: string): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!validateCronSecret(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isScrapeRunning) {
    logger.info('Cron scrape skipped — already in progress');
    return NextResponse.json({ message: 'Already running' }, { status: 409 });
  }

  runScrape()
    .then(() => {
      revalidatePath('/');
      revalidatePath('/historique');
      logger.info('Cron scrape completed successfully');
    })
    .catch((error: unknown) => {
      logger.error('Cron scrape failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  logger.info('Cron scrape accepted');
  return NextResponse.json({ message: 'Scrape started' }, { status: 202 });
}
