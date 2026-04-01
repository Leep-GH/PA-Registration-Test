import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// createRateLimiter
// ---------------------------------------------------------------------------

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Should_AllowRequest_When_UnderLimit', () => {
    const check = createRateLimiter(5, 60_000);

    const result = check('192.168.1.1');

    expect(result.allowed).toBe(true);
  });

  it('Should_IncludeRateLimitHeaders_When_RequestAllowed', () => {
    const check = createRateLimiter(5, 60_000);

    const result = check('192.168.1.1');

    expect(result.headers['X-Rate-Limit-Limit']).toBe('5');
    expect(result.headers['X-Rate-Limit-Remaining']).toBe('4');
    expect(result.headers['X-Rate-Limit-Reset']).toBeDefined();
  });

  it('Should_DecrementRemaining_When_MultipleRequestsMade', () => {
    const check = createRateLimiter(5, 60_000);
    check('192.168.1.1');
    check('192.168.1.1');

    const result = check('192.168.1.1');

    expect(result.headers['X-Rate-Limit-Remaining']).toBe('2');
  });

  it('Should_DenyRequest_When_LimitExceeded', () => {
    const check = createRateLimiter(2, 60_000);
    check('192.168.1.1');
    check('192.168.1.1');

    const result = check('192.168.1.1');

    expect(result.allowed).toBe(false);
  });

  it('Should_IncludeRetryAfterHeader_When_RateLimited', () => {
    const check = createRateLimiter(2, 60_000);
    check('192.168.1.1');
    check('192.168.1.1');

    const result = check('192.168.1.1');

    expect(result.headers['Retry-After']).toBeDefined();
    expect(result.headers['X-Rate-Limit-Remaining']).toBe('0');
  });

  it('Should_AllowRequest_When_WindowHasExpired', () => {
    const check = createRateLimiter(1, 60_000);
    check('192.168.1.1'); // exhaust the limit

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    const result = check('192.168.1.1');

    expect(result.allowed).toBe(true);
  });

  it('Should_TrackKeysSeparately_When_DifferentIpsUsed', () => {
    const check = createRateLimiter(1, 60_000);
    check('10.0.0.1'); // exhaust limit for first IP

    const result = check('10.0.0.2');

    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------

describe('getClientIp', () => {
  it('Should_ReturnFirstIp_When_XForwardedForHeaderPresent', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });

    const ip = getClientIp(headers);

    expect(ip).toBe('1.2.3.4');
  });

  it('Should_FallbackToXRealIp_When_XForwardedForAbsent', () => {
    const headers = new Headers({ 'x-real-ip': '9.10.11.12' });

    const ip = getClientIp(headers);

    expect(ip).toBe('9.10.11.12');
  });

  it('Should_ReturnUnknown_When_NoIpHeadersPresent', () => {
    const headers = new Headers();

    const ip = getClientIp(headers);

    expect(ip).toBe('unknown');
  });
});
