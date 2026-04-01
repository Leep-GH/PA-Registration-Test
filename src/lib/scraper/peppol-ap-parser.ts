/**
 * Cheerio-based HTML parser for the Peppol certified service providers page.
 *
 * ✅  CONFIRMED PAGE STRUCTURE — 2026-03-30
 * ─────────────────────────────────────────────────────────────────────────────
 * Confirmed URL: https://peppol.org/members/peppol-certified-service-providers/
 * The page uses a DataTables widget but data is server-rendered HTML —
 * no JavaScript execution required; Cheerio suffices.
 *
 * Table columns (positional, 1-indexed):
 *   1 — Company name
 *   2 — Country/Territory (country of legal residence)
 *   3 — AP certification ("AP Certified" or "−")
 *   4 — SMP certification ("SMP Certified" or "−")
 *   5 — Contact name  (PII — stored, never logged)
 *   6 — Contact email (PII — stored, never logged)
 *   7 — Peppol Authority (e.g. "DGFIP", "BOSA", "AGID", "KoSIT")
 *
 * Some entries carry "not offering services to private companies" in the
 * contact name / email cells — treated as absent (undefined) by the parser.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as cheerio from 'cheerio';
import slugify from 'slugify';
import { logger } from '@/lib/logger';
import type { PeppolApRecord, PeppolApParserInterface } from './types';

const NOT_OFFERING_SENTINEL = 'not offering services to private companies';

/**
 * Returns true when a cell value represents a "not available" / absent field.
 */
function isMissing(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === '-' || v === '−' || v.includes(NOT_OFFERING_SENTINEL);
}

export class PeppolApParser implements PeppolApParserInterface {
  /**
   * Parse the Peppol certified service providers HTML page.
   * Returns one PeppolApRecord per table row, skipping header rows and empty rows.
   */
  parse(html: string): PeppolApRecord[] {
    const $ = cheerio.load(html);
    const records: PeppolApRecord[] = [];

    // DataTables renders into a standard <table> — find it by looking for rows
    // that contain the characteristic "AP Certified" text, or fall back to
    // the first substantive <table> on the page.
    let $table = $('table').filter((_, el) => {
      return $(el).text().includes('AP Certified');
    }).first();

    if ($table.length === 0) {
      logger.warn('[PeppolApParser] Could not locate AP Certified table — attempting first <table>');
      $table = $('table').first();
    }

    if ($table.length === 0) {
      logger.warn('[PeppolApParser] No <table> found in HTML — returning empty result');
      return [];
    }

    $table.find('tr').each((_, row) => {
      const cells = $(row).find('td');
      // Need at least 7 columns; skip header rows (which use <th>)
      if (cells.length < 7) return;

      const rawName    = cells.eq(0).text().trim();
      const rawCountry = cells.eq(1).text().trim();
      const rawAp      = cells.eq(2).text().trim();
      const rawSmp     = cells.eq(3).text().trim();
      const rawContact = cells.eq(4).text().trim();
      const rawEmail   = cells.eq(5).text().trim();
      const rawAuth    = cells.eq(6).text().trim();

      if (!rawName || rawName.length < 1) return;

      const slug = slugify(rawName, { lower: true, strict: true, locale: 'fr' });
      if (!slug) return;

      const record: PeppolApRecord = {
        name: rawName,
        slug,
        country: isMissing(rawCountry) ? undefined : rawCountry,
        apCertified: /ap\s+certified/i.test(rawAp),
        smpCertified: /smp\s+certified/i.test(rawSmp),
        contactName: isMissing(rawContact) ? undefined : rawContact,
        contactEmail: isMissing(rawEmail) ? undefined : rawEmail,
        authority: isMissing(rawAuth) ? undefined : rawAuth,
      };

      records.push(record);
    });

    logger.info('[PeppolApParser] Parsed Peppol AP records', { count: records.length });
    return records;
  }
}
