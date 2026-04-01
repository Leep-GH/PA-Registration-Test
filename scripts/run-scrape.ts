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

import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if it exists (development)
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

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
