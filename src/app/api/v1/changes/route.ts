export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getChanges } from '@/lib/db/repositories/changes';

const VALID_TYPES = ['added', 'removed', 'status_changed'] as const;
type EventType = (typeof VALID_TYPES)[number];

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

// ISO 8601 date validation
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  // Validate 'since'
  const rawSince = searchParams.get('since');
  if (rawSince !== null && !DATE_REGEX.test(rawSince)) {
    return NextResponse.json(
      { error: "Invalid 'since' value. Expected format: YYYY-MM-DD", code: 'bad_request' },
      { status: 400 },
    );
  }

  // Validate 'type'
  const rawType = searchParams.get('type');
  if (rawType !== null && !VALID_TYPES.includes(rawType as EventType)) {
    return NextResponse.json(
      {
        error: `Invalid 'type' value. Allowed: ${VALID_TYPES.join(', ')}`,
        code: 'bad_request',
      },
      { status: 400 },
    );
  }

  // Validate 'limit'
  const rawLimit = searchParams.get('limit');
  const limit = rawLimit !== null ? Math.min(parseInt(rawLimit, 10) || DEFAULT_LIMIT, MAX_LIMIT) : DEFAULT_LIMIT;

  // Validate 'offset'
  const rawOffset = searchParams.get('offset');
  const offset = Math.max(0, parseInt(rawOffset ?? '0', 10) || 0);

  const { total, changes } = await getChanges({
    since: rawSince ?? undefined,
    type: rawType as EventType | undefined ?? undefined,
    limit,
    offset,
  });

  return NextResponse.json(
    { total, limit, offset, changes },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
