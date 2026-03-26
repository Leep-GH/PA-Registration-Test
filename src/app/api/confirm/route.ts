export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { confirmSubscriber } from '@/lib/db/repositories/subscribers';
import { getNotificationService } from '@/lib/notifications/console';
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

  // Anti-enumeration: return neutral message even if token not found
  const confirmedEmail = await confirmSubscriber(token);

  if (confirmedEmail !== null) {
    logger.info('Subscription confirmed via token');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    // Send welcome email — email used internally only, never logged or returned to client
    getNotificationService()
      .sendWelcomeEmail(
        confirmedEmail,
        `${appUrl}/api/unsubscribe?token=${token}`,
      )
      .catch(() => {/* non-fatal */});

    return NextResponse.json({ message: 'Subscription confirmed.' });
  }

  // Return neutral message — do not reveal whether token exists
  return NextResponse.json({ message: 'Link invalid or expired.' });
}
