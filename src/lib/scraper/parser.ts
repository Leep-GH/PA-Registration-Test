/**
 * Cheerio-based HTML parser for the DGFiP PDP registry page.
 *
 * ✅  CONFIRMED PAGE STRUCTURE — 2026-03-26
 * ─────────────────────────────────────────────────────────────────────────────
 * Confirmed URL: https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees
 * robots.txt: no Disallow covering this path — scraping permitted.
 *
 * Actual page structure: two <table class="table"> elements.
 *
 * Table 1 — 6 columns — Fully registered (immatriculés):
 *   Nom commercial | Adresse de l'établissement principal | Site internet |
 *   Email de contact | Date de délivrance du numéro d'immatriculation | Statut
 *   Status value: "rapport d'audit de conformité attendu"
 *   Website is plain-text URL (NOT an <a href>), e.g. https://www.atgp.net/
 *   Name is inside <strong> tag: <td style="..."><strong>@GP</strong></td>
 *
 * Table 2 — 5 columns — Candidates awaiting interop tests:
 *   Nom commercial | Adresse de l'établissement principal | Site internet |
 *   Email de contact | Statut
 *   Status value: "Dossier complet en attente des tests d'interopérabilité"
 *   No registration date column in this table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import slugify from 'slugify';
import { logger } from '@/lib/logger';
import type { PdpRecord, ParserInterface } from './types';

// ---------------------------------------------------------------------------
// Confirmed selectors based on live page inspection (2026-03-26).
// ---------------------------------------------------------------------------
export const SELECTORS = {
  /**
   * Both PDP tables on the live page use class="table".
   * Confirmed: https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees (2026-03-26)
   */
  table: 'table.table',

  /** Header cells in <thead> — used to auto-detect column positions */
  tableHeaderCell: 'thead th',

  /** Data rows in <tbody> */
  tableBodyRow: 'tbody tr',

  /**
   * Alternative: a <ul> or <ol> list where each <li> contains a PDP name.
   * Used as fallback if no table is found.
   */
  listItem: 'li',

  /**
   * Column header patterns for auto-detection of column positions.
   * Confirmed column headers (French):
   *   "Nom commercial" | "Adresse de l'établissement principal"
   *   "Site internet" | "Email de contact"
   *   "Date de délivrance du numéro d'immatriculation" | "Statut"
   */
  columnHeaders: {
    name:    /nom commercial|nom|raison/i,
    address: /adresse|établissement principal/i,
    website: /site internet|site web/i,
    email:   /email|contact|e-mail/i,
    date:    /date|délivrance|immatriculation/i,
    status:  /statut/i,
  },

  /**
   * Text fragments used to positively identify a table as the PDP list.
   * "Nom commercial" appears in both table headers; "immatriculation" in table 1 date header.
   */
  tableIdentifier: /nom commercial|immatricul|plateforme/i,

  /**
   * Status: fully registered under reservation (awaiting audit report).
   * Confirmed status text: "rapport d'audit de conformité attendu"
   */
  statusRegistered: /rapport d.audit|immatricul/i,

  /**
   * Status: candidate — complete file, awaiting interoperability tests.
   * Confirmed status text: "Dossier complet en attente des tests d'interopérabilité"
   */
  statusCandidate: /candidat|attente des tests|dossier complet/i,
};

// ---------------------------------------------------------------------------

function normaliseStatus(text: string): PdpRecord['status'] {
  if (SELECTORS.statusRegistered.test(text)) return 'registered';
  if (SELECTORS.statusCandidate.test(text)) return 'candidate';
  return 'registered'; // Sane default — most entries are registered
}

function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

function extractUrl($cell: cheerio.Cheerio<Element>, $: cheerio.CheerioAPI): string | undefined {
  // Try anchor href first
  const href = $cell.find('a').attr('href');
  if (href) {
    if (href.startsWith('http')) return href;
    const base = process.env.DGFIP_PDP_URL ?? '';
    try { return new URL(href, base).toString(); } catch { return undefined; }
  }
  // Fallback: plain-text URL in cell (the real DGFiP page uses this format)
  const text = $cell.text().trim();
  if (/^https?:\/\/\S+/.test(text)) return text;
  return undefined;
}

// ---------------------------------------------------------------------------
// Column detection and table parsing
// ---------------------------------------------------------------------------

interface ColumnMap {
  name: number;
  address: number | null;
  website: number | null;
  email: number | null;
  date: number | null;
  status: number;
}

function detectColumns($: cheerio.CheerioAPI, $table: cheerio.Cheerio<Element>): ColumnMap | null {
  const headers = $table.find(SELECTORS.tableHeaderCell).toArray().map((el) =>
    $(el).text().trim(),
  );
  if (headers.length === 0) return null;

  let name = -1, address = -1, website = -1, email = -1, date = -1, status = -1;
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (name === -1 && SELECTORS.columnHeaders.name.test(h)) { name = i; continue; }
    if (address === -1 && SELECTORS.columnHeaders.address.test(h)) { address = i; continue; }
    if (website === -1 && SELECTORS.columnHeaders.website.test(h)) { website = i; continue; }
    if (email === -1 && SELECTORS.columnHeaders.email.test(h)) { email = i; continue; }
    if (date === -1 && SELECTORS.columnHeaders.date.test(h)) { date = i; continue; }
    if (status === -1 && SELECTORS.columnHeaders.status.test(h)) { status = i; }
  }

  if (name === -1 || status === -1) return null;
  return {
    name,
    address: address === -1 ? null : address,
    website: website === -1 ? null : website,
    email: email === -1 ? null : email,
    date: date === -1 ? null : date,
    status,
  };
}

/** Attempts to parse PDPs from a <table> element. Returns [] if the table doesn't look like a PDP list. */
function parseTable($: cheerio.CheerioAPI, tableEl: Element): PdpRecord[] {
  const $table = $(tableEl);
  const tableText = $table.text();

  if (!SELECTORS.tableIdentifier.test(tableText)) return [];

  const colMap = detectColumns($, $table);
  if (colMap === null) return [];

  const records: PdpRecord[] = [];
  const rows = $table.find(SELECTORS.tableBodyRow).toArray();

  for (const row of rows) {
    const cells = $(row).find('td').toArray();
    if (cells.length <= colMap.status) continue;

    const nameText = $(cells[colMap.name]).text().trim();
    if (!nameText || nameText.length < 2) continue;

    const statusText = $(cells[colMap.status]).text().trim();

    let websiteUrl: string | undefined;
    if (colMap.website !== null && cells[colMap.website]) {
      websiteUrl = extractUrl($(cells[colMap.website]), $);
    }

    let registrationDate: string | undefined;
    if (colMap.date !== null && cells[colMap.date]) {
      const rawDate = $(cells[colMap.date]).text().trim();
      const dateParts = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dateParts) {
        registrationDate = `${dateParts[3]}-${dateParts[2].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        registrationDate = rawDate;
      }
    }

    let physicalAddress: string | undefined;
    if (colMap.address !== null && cells[colMap.address]) {
      const rawAddress = $(cells[colMap.address]).text().trim();
      if (rawAddress && rawAddress.length > 0) {
        physicalAddress = rawAddress;
      }
    }

    let contactEmail: string | undefined;
    if (colMap.email !== null && cells[colMap.email]) {
      const rawEmail = $(cells[colMap.email]).text().trim();
      if (rawEmail && rawEmail.length > 0) {
        contactEmail = rawEmail;
      }
    }

    records.push({
      name: nameText,
      slug: generateSlug(nameText),
      status: normaliseStatus(statusText),
      statusText,
      registrationDate,
      websiteUrl,
      physicalAddress,
      contactEmail,
    });
  }

  return records;
}

/** Attempts to parse PDPs from list elements (<ul>/<ol>). */
function parseList($: cheerio.CheerioAPI): PdpRecord[] {
  const records: PdpRecord[] = [];

  $('ul li, ol li').each((_, el) => {
    const text = $(el).text().trim();
    if (!text || text.length < 2) return;
    const url = extractUrl($(el), $);
    records.push({
      name: text,
      slug: generateSlug(text),
      status: normaliseStatus(text),
      websiteUrl: url,
    });
  });

  return records;
}

// ---------------------------------------------------------------------------
// CheerioPdpParser — implements ParserInterface
// ---------------------------------------------------------------------------

export class CheerioPdpParser implements ParserInterface {
  parse(html: string): PdpRecord[] {
    const $ = cheerio.load(html);

    // Strategy 1: collect PDPs from all matching tables
    const tables = $(SELECTORS.table).toArray() as Element[];
    const allTableRecords: PdpRecord[] = [];
    for (const tableEl of tables) {
      const records = parseTable($, tableEl);
      allTableRecords.push(...records);
    }
    if (allTableRecords.length > 0) {
      logger.info('Parser: matched table selector', { count: allTableRecords.length });
      return allTableRecords;
    }

    // Strategy 2: fall back to list parsing
    const listRecords = parseList($);
    if (listRecords.length > 0) {
      logger.info('Parser: matched list selector', { count: listRecords.length });
      return listRecords;
    }

    logger.warn('Parser: no matching selectors found in HTML', {
      htmlLength: html.length,
      tablesFound: tables.length,
    });
    return [];
  }
}
