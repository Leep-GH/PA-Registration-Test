export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';
import { runPeppolApScrape, getIsPeppolApScrapeRunning } from '@/lib/scraper/peppol-ap-index';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

function validateAdminToken(provided: string): boolean {
  const expected = process.env.ADMIN_SCRAPE_TOKEN;
  if (!expected || !provided) return false;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

// 5 requests per minute for the admin scrape trigger
const adminScrapeRateLimiter = createRateLimiter(5, 60 * 1000);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req.headers);
  const rateLimit = adminScrapeRateLimiter(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        type: 'https://tools.ietf.org/html/rfc6585#section-4',
        title: 'Too Many Requests',
        status: 429,
        detail: 'Rate limit exceeded. Please try again later.',
      },
      { status: 429, headers: rateLimit.headers },
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!validateAdminToken(token)) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'invalid_token' },
      { status: 401, headers: rateLimit.headers },
    );
  }

  if (getIsPeppolApScrapeRunning()) {
    return NextResponse.json(
      { error: 'Peppol AP scrape already in progress', code: 'already_running' },
      { status: 409, headers: rateLimit.headers },
    );
  }

  runPeppolApScrape()
    .then(() => {
      revalidatePath('/');
    })
    .catch((error: unknown) => {
      logger.error('Background Peppol AP scrape failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return NextResponse.json(
    { message: 'Peppol AP scrape accepted', status: 'started' },
    { status: 202, headers: rateLimit.headers },
  );
}
