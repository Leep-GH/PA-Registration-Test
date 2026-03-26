#!/usr/bin/env tsx
/**
 * Standalone scrape runner — for development and CI.
 *
 * Usage:
 *   npm run scrape
 *   npx tsx scripts/run-scrape.ts
 *
 * Reads environment from .env.local (dev) or process.env (CI).
 * Exit code 0 on success or no_change, 1 on failure.
 */

import { runScrape } from '../src/lib/scraper/index';

async function main() {
  console.log(`[scrape] Starting manual scrape run at ${new Date().toISOString()}`);

  try {
    const result = await runScrape();
    console.log(`[scrape] Completed. Run ID: ${result.runId}. Changes detected: ${result.changes}`);
    process.exit(0);
  } catch (error) {
    console.error('[scrape] Run failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
