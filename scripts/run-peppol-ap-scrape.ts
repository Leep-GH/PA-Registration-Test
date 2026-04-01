#!/usr/bin/env tsx
/**
 * Standalone Peppol AP scrape runner — for development and manual fixes.
 *
 * Usage:
 *   npx tsx scripts/run-peppol-ap-scrape.ts
 *
 * Reads environment from .env.local (dev) or process.env (CI).
 */

import * as fs from 'fs';
import * as path from 'path';

const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1 || line.startsWith('#')) return;
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  });
}

import { runPeppolApScrape } from '../src/lib/scraper/peppol-ap-index';

async function main() {
  console.log(`[peppol-scrape] Starting at ${new Date().toISOString()}`);

  try {
    const result = await runPeppolApScrape();
    console.log(`[peppol-scrape] Completed. Run ID: ${result.runId}. APs found: ${result.apsFound}. Cross-links: ${result.crossLinksCreated}`);
    process.exit(0);
  } catch (error) {
    console.error('[peppol-scrape] Run failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
