import { NextRequest, NextResponse } from 'next/server';
import { getAllPeppolAps } from '@/lib/db/repositories/peppol-aps';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// 60 requests per minute for the public Peppol APs endpoint
const peppolApsRateLimiter = createRateLimiter(60, 60 * 1000);

/**
 * GET /api/v1/peppol-aps
 *
 * Returns all active Peppol Access Points.
 *
 * Query parameters:
 *   country   — filter by country/territory (case-sensitive)
 *   authority — filter by Peppol Authority code (e.g. 'DGFIP', 'BOSA')
 *
 * Response envelope mirrors /api/v1/pdps:
 *   { data: PeppolAp[], meta: { total, lastUpdated } }
 *
 * PII fields (contactName, contactEmail) are NEVER included in the response.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(request.headers);
  const rateLimit = peppolApsRateLimiter(ip);

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

  try {
    const { searchParams } = request.nextUrl;
    const country = searchParams.get('country') ?? undefined;
    const authority = searchParams.get('authority') ?? undefined;

    const aps = await getAllPeppolAps({
      ...(country ? { country } : {}),
      ...(authority ? { authority } : {}),
      isActive: true,
    });

    // Strip PII before returning
    const data = aps.map(({ contactName: _cn, contactEmail: _ce, ...safe }) => safe);

    return NextResponse.json(
      {
        data,
        meta: {
          total: data.length,
          lastUpdated: data.reduce<string>(
            (latest, ap) => (ap.lastSeenAt > latest ? ap.lastSeenAt : latest),
            '',
          ) || null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Content-Type': 'application/json',
          ...rateLimit.headers,
        },
      },
    );
  } catch (error) {
    logger.error('GET /api/v1/peppol-aps failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        errors: [
          {
            status: '500',
            title: 'Internal Server Error',
            detail: 'Failed to retrieve Peppol AP data.',
          },
        ],
      },
      { status: 500 },
    );
  }
}
