import { eq, and, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '../index';
import { subscribers } from '../schema';

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Inserts a new unconfirmed subscriber.
 * Throws if email already exists as a confirmed subscriber (caller must handle).
 */
export async function insertSubscriber(email: string, token: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.insert(subscribers).values({
    email,
    token,
    confirmed: false,
    subscribedAt: now,
    unsubscribedAt: null,
  });
}

/**
 * Confirms a subscriber by token.
 * Returns the subscriber's email on success, or null if token not found.
 * Email returned so caller can send a welcome notification without a second DB lookup.
 * The email must NOT appear in any API response or log.
 */
export async function confirmSubscriber(token: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.token, token))
    ;

  if (rows.length === 0) return null;

  await db
    .update(subscribers)
    .set({ confirmed: true })
    .where(eq(subscribers.token, token));
  return rows[0].email;
}

/**
 * Unsubscribes a subscriber by token (soft-delete: sets unsubscribed_at).
 * Returns false if token not found.
 */
export async function unsubscribeByToken(token: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.token, token))
    ;

  if (rows.length === 0) return false;

  await db
    .update(subscribers)
    .set({ unsubscribedAt: new Date().toISOString() })
    .where(eq(subscribers.token, token));
  return true;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns email addresses of all confirmed, non-unsubscribed subscribers.
 * Returns emails only — no other PII is returned.
 */
export async function getConfirmedSubscribers(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(and(eq(subscribers.confirmed, true), isNull(subscribers.unsubscribedAt)))
    ;
  return rows.map((r) => r.email);
}

/** Returns email addresses and tokens of all confirmed, non-unsubscribed subscribers.
 * Used to build personalized unsubscribe links for alert emails.
 * Email addresses are never logged — tokens only.
 */
export async function getConfirmedSubscribersWithTokens(): Promise<Array<{ email: string; token: string }>> {
  const db = getDb();
  const rows = await db
    .select({ email: subscribers.email, token: subscribers.token })
    .from(subscribers)
    .where(and(eq(subscribers.confirmed, true), isNull(subscribers.unsubscribedAt)))
    ;
  return rows;
}

/** Returns true if an email exists and is confirmed (used for 409 check). */
export async function isEmailConfirmed(email: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ confirmed: subscribers.confirmed })
    .from(subscribers)
    .where(and(eq(subscribers.email, email), isNull(subscribers.unsubscribedAt)))
    ;
  return rows.some((r) => r.confirmed === true);
}

/** Returns true if an email exists but is not yet confirmed (for resend logic). */
export async function isEmailPending(email: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(
      and(
        eq(subscribers.email, email),
        eq(subscribers.confirmed, false),
        isNull(subscribers.unsubscribedAt),
      ),
    )
    ;
  return rows.length > 0;
}

/**
 * Deletes unconfirmed subscriber records older than the given number of hours.
 * Returns the count of deleted rows.
 */
export async function purgeUnconfirmed(olderThanHours: number): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();

  const toDelete = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(and(eq(subscribers.confirmed, false), lt(subscribers.subscribedAt, cutoff)))
    ;

  if (toDelete.length === 0) return 0;

  await db
    .delete(subscribers)
    .where(
      and(
        eq(subscribers.confirmed, false),
        lt(subscribers.subscribedAt, cutoff),
      ),
    );

  return toDelete.length;
}

/** Returns the token for a pending subscriber (for resend confirmation). */
export async function getPendingToken(email: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ token: subscribers.token })
    .from(subscribers)
    .where(
      and(
        eq(subscribers.email, email),
        eq(subscribers.confirmed, false),
        isNull(subscribers.unsubscribedAt),
      ),
    )
    ;
  return rows[0]?.token ?? null;
}

/** Returns the email address for a subscriber by token. Used after confirmation to send welcome email. */
export async function getEmailByToken(token: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select({ email: subscribers.email })
    .from(subscribers)
    .where(eq(subscribers.token, token))
    ;
  return rows[0]?.email ?? null;
}

/** Returns rough subscriber count (for admin monitoring; no PII). */
export async function getSubscriberStats(): Promise<{
  confirmed: number;
  pending: number;
}> {
  const db = getDb();
  const rows = await db
    .select({
      confirmed: sql<number>`sum(case when ${subscribers.confirmed} = true and ${subscribers.unsubscribedAt} is null then 1 else 0 end)`,
      pending: sql<number>`sum(case when ${subscribers.confirmed} = false then 1 else 0 end)`,
    })
    .from(subscribers)
    ;
  return {
    confirmed: rows[0]?.confirmed ?? 0,
    pending: rows[0]?.pending ?? 0,
  };
}
