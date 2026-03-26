export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/db/repositories/subscribers';
import { logger } from '@/lib/logger';

// Token validation: 64-char hex string
const TOKEN_REGEX = /^[0-9a-f]{64}$/;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') ?? '';

  if (!TOKEN_REGEX.test(token)) {
    return NextResponse.json(
      { error: 'Invalid or missing token', code: 'bad_request' },
      { status: 400 },
    );
  }

  // Anti-enumeration: always return 200 (safe for link scanners in email clients)
  await unsubscribeByToken(token).catch(() => {/* ignore — return 200 regardless */});

  logger.info('Unsubscribe request processed');
  return NextResponse.json({ message: 'You have been unsubscribed.' });
}
