/**
 * Playwright fallback parser for JS-rendered pages.
 *
 * ⚠️  DEPLOYMENT CONSTRAINT ⚠️
 * Playwright cannot run on Vercel serverless functions.
 * Enable PLAYWRIGHT_FALLBACK=true only when deploying to Railway or a VPS
 * that has Chromium available. Install playwright separately:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * This module is only activated when:
 *   process.env.PLAYWRIGHT_FALLBACK === 'true'
 *
 * It implements ParserInterface but ignores the html parameter — it navigates
 * to DGFIP_PDP_URL directly using a headless browser.
 */

import { logger } from '@/lib/logger';
import type { ParserInterface, PdpRecord } from './types';
import { CheerioPdpParser } from './parser';

export class PlaywrightPdpParser implements ParserInterface {
  async parse(_html: string): Promise<PdpRecord[]> {
    const url = process.env.DGFIP_PDP_URL;
    if (!url) throw new Error('DGFIP_PDP_URL is not set');

    // Dynamic import — if playwright is not installed, this throws and the
    // orchestrator catches it and falls back gracefully.
    let chromium: any;
    try {
      // Use indirect import to prevent TypeScript from type-checking
      // playwright at build time (it is an optional dependency)
      const pw = await (Function('return import("playwright")')() as Promise<any>);
      chromium = pw.chromium;
    } catch {
      throw new Error(
        'playwright package is not installed. Run: npm install playwright && npx playwright install chromium',
      );
    }

    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        'User-Agent':
          process.env.SCRAPER_USER_AGENT ??
          'pdp-tracker/1.0 (playwright-fallback; contact@example.com)',
      });

      logger.info('Playwright: navigating to DGFiP URL', { url });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      // Wait for a table or list to appear
      try {
        await page.waitForSelector('table, ul li, ol li', { timeout: 10_000 });
      } catch {
        logger.warn('Playwright: timeout waiting for table/list element');
      }

      const html = await page.content();
      logger.info('Playwright: page content retrieved', { bytes: html.length });

      // Re-use the Cheerio parser on the rendered HTML
      const cheerioParser = new CheerioPdpParser();
      return cheerioParser.parse(html);
    } finally {
      await browser.close();
    }
  }
}
