/**
 * Simple in-memory rate limiter.
 *
 * Creates a per-key (typically IP) sliding window counter.
 * Returns a result object with allowed/denied status and standard headers.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
}

/**
 * Creates a rate limiter with configurable limit and window.
 *
 * @param limit  - Maximum requests allowed in the window.
 * @param windowMs - Window duration in milliseconds.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const store = new Map<string, RateLimitEntry>();

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      const resetAt = now + windowMs;
      return {
        allowed: true,
        headers: {
          'X-Rate-Limit-Limit': String(limit),
          'X-Rate-Limit-Remaining': String(limit - 1),
          'X-Rate-Limit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      };
    }

    const remaining = Math.max(0, limit - entry.count);

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        headers: {
          'X-Rate-Limit-Limit': String(limit),
          'X-Rate-Limit-Remaining': '0',
          'X-Rate-Limit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          'Retry-After': String(retryAfter),
        },
      };
    }

    entry.count++;
    return {
      allowed: true,
      headers: {
        'X-Rate-Limit-Limit': String(limit),
        'X-Rate-Limit-Remaining': String(remaining - 1),
        'X-Rate-Limit-Reset': String(Math.ceil(entry.resetAt / 1000)),
      },
    };
  };
}

/**
 * Extracts the client IP from a Next.js request.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}
