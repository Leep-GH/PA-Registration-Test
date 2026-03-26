import { logger } from '@/lib/logger';

/** Timeout for HTTP fetches (milliseconds). */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetches the HTML content of a URL.
 * Sets a custom User-Agent from SCRAPER_USER_AGENT env var and enforces a
 * 15-second timeout via AbortController.
 *
 * @throws Error with the HTTP status code if the response is not OK.
 * @throws Error with 'timeout' in the message if the request exceeds 15s.
 */
export async function fetchPage(url: string): Promise<string> {
  const userAgent =
    process.env.SCRAPER_USER_AGENT ??
    'pdp-tracker/1.0 (https://github.com/pdp-tracker; contact@example.com)';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    logger.info('Fetching PDP registry page', { url });
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
    }

    const html = await response.text();
    logger.info('Fetch succeeded', { url, bytes: html.length });
    return html;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${FETCH_TIMEOUT_MS}ms — ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
