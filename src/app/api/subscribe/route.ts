export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import {
  insertSubscriber,
  isEmailConfirmed,
  isEmailPending,
  getPendingToken,
} from '@/lib/db/repositories/subscribers';
import { getNotificationService } from '@/lib/notifications/console';
import { logger } from '@/lib/logger';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple in-memory rate limiter: 3 attempts per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }

  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests', code: 'rate_limited' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'bad_request' },
      { status: 400 },
    );
  }

  if (!body || typeof body !== 'object' || !('email' in body)) {
    return NextResponse.json(
      { error: "Missing required field: 'email'", code: 'bad_request' },
      { status: 400 },
    );
  }

  const email = String((body as Record<string, unknown>).email).trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: 'Invalid email address', code: 'bad_request' },
      { status: 400 },
    );
  }

  // NEVER log the email address — PII
  logger.info('Subscription request received');

  // Anti-enumeration: if already confirmed, return 409 (intentionally reveals confirmation)
  const alreadyConfirmed = await isEmailConfirmed(email);
  if (alreadyConfirmed) {
    return NextResponse.json(
      { error: 'Email already subscribed', code: 'already_subscribed' },
      { status: 409 },
    );
  }

  // If pending, resend confirmation silently (no 409 — prevents enumeration of pending)
  const isPending = await isEmailPending(email);
  if (isPending) {
    const existingToken = await getPendingToken(email);
    if (existingToken) {
      const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/confirm?token=${existingToken}`;
      await getNotificationService()
        .sendConfirmationEmail(email, confirmUrl)
        .catch(() => {/* non-fatal */});
    }
    return NextResponse.json(
      { message: 'Confirmation email sent. Please check your inbox.' },
      { status: 201 },
    );
  }

  // New subscriber
  const token = randomBytes(32).toString('hex');
  await insertSubscriber(email, token);

  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/confirm?token=${token}`;
  await getNotificationService()
    .sendConfirmationEmail(email, confirmUrl)
    .catch((e: unknown) => {
      logger.warn('Failed to send confirmation email', {
        error: e instanceof Error ? e.message : String(e),
      });
    });

  return NextResponse.json(
    { message: 'Confirmation email sent. Please check your inbox.' },
    { status: 201 },
  );
}
