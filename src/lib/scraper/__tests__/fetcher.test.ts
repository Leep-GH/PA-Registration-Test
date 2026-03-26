import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchPage } from '@/lib/scraper/fetcher';

// Mock the logger to suppress console output during tests
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      text: async () => body,
    }),
  );
}

function mockFetchError(status: number, statusText: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      text: async () => '',
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchPage', () => {
  it('Should_ReturnHtml_When_FetchSucceeds', async () => {
    const expectedHtml = '<html><body><p>Liste des PDP</p></body></html>';
    mockFetchOk(expectedHtml);

    const result = await fetchPage('https://example.com/pdps');

    expect(result).toBe(expectedHtml);
  });

  it('Should_Throw_When_ServerReturns503', async () => {
    mockFetchError(503, 'Service Unavailable');

    await expect(fetchPage('https://example.com/pdps')).rejects.toThrow('HTTP 503');
  });

  it('Should_Throw_When_ServerReturns429', async () => {
    mockFetchError(429, 'Too Many Requests');

    await expect(fetchPage('https://example.com/pdps')).rejects.toThrow('HTTP 429');
  });

  it('Should_Throw_When_ServerReturns404', async () => {
    mockFetchError(404, 'Not Found');

    await expect(fetchPage('https://example.com/pdps')).rejects.toThrow('HTTP 404');
  });

  it('Should_Throw_When_RequestTimesOut', async () => {
    vi.useFakeTimers();

    // Mock fetch to never resolve but respect the AbortSignal
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        return new Promise<never>((_resolve, reject) => {
          options.signal!.addEventListener('abort', () => {
            const err = new Error('AbortError');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }),
    );

    const promise = fetchPage('https://example.com/pdps');
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection warning
    const assertion = expect(promise).rejects.toThrow('timeout');

    // Advance timer past the 15-second timeout
    await vi.advanceTimersByTimeAsync(16_000);

    await assertion;
  });

  it('Should_IncludeUserAgentHeader_When_Fetching', async () => {
    mockFetchOk('<html></html>');
    const mockFetch = vi.mocked(fetch as ReturnType<typeof vi.fn>);

    await fetchPage('https://example.com/pdps');

    const [_url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['User-Agent']).toBeTruthy();
  });

  it('Should_UseConfiguredUserAgent_When_EnvVarSet', async () => {
    const customAgent = 'my-bot/2.0 (contact@mycompany.com)';
    vi.stubEnv('SCRAPER_USER_AGENT', customAgent);
    mockFetchOk('<html></html>');
    const mockFetch = vi.mocked(fetch as ReturnType<typeof vi.fn>);

    await fetchPage('https://example.com/pdps');

    const [_url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['User-Agent']).toBe(customAgent);
  });
});
