export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { runScrape, isScrapeRunning } from '@/lib/scraper';
import { logger } from '@/lib/logger';

function validateAdminToken(provided: string): boolean {
  const expected = process.env.ADMIN_SCRAPE_TOKEN;
  if (!expected || !provided) return false;
  // Prevent length oracle: check length equality before timingSafeEqual
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!validateAdminToken(token)) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'invalid_token' },
      { status: 401 },
    );
  }

  // In-progress guard
  if (isScrapeRunning) {
    return NextResponse.json(
      { error: 'Scrape already in progress', code: 'already_running' },
      { status: 409 },
    );
  }

  // Await scrape so revalidatePath runs before the function terminates
  try {
    const outcome = await runScrape();
    revalidatePath('/');
    revalidatePath('/historique');
    return NextResponse.json(
      { message: 'Scrape completed', runId: outcome.runId, changes: outcome.changes },
      { status: 200 },
    );
  } catch (error: unknown) {
    logger.error('Scrape failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Scrape failed' },
      { status: 500 },
    );
  }
}
