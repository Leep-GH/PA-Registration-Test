// ---------------------------------------------------------------------------
// Core domain types for the PDP scraper pipeline
// ---------------------------------------------------------------------------

export interface PdpRecord {
  name: string;
  slug: string;
  status: 'registered' | 'candidate' | 'removed';
  statusText?: string;
  registrationNumber?: string;
  registrationDate?: string;
  websiteUrl?: string;
  physicalAddress?: string;
  contactEmail?: string;
}

/**
 * Implemented by both the Cheerio static parser and the Playwright fallback.
 * parse() may return either a synchronous array or a Promise — callers must
 * always await the result: `await Promise.resolve(parser.parse(html))`.
 */
export interface ParserInterface {
  parse(html: string): PdpRecord[] | Promise<PdpRecord[]>;
}

export interface ScraperResult {
  records: PdpRecord[];
  rawHtml: string;
  /** ISO 8601 */
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// Peppol Access Point types
// ---------------------------------------------------------------------------

export interface PeppolApRecord {
  name: string;
  slug: string;
  country?: string;
  apCertified: boolean;
  smpCertified: boolean;
  /** PII — never log */
  contactName?: string;
  /** PII — never log */
  contactEmail?: string;
  /** Peppol Authority code, e.g. 'DGFIP', 'BOSA', 'AGID' */
  authority?: string;
}

export interface PeppolApParserInterface {
  parse(html: string): PeppolApRecord[] | Promise<PeppolApRecord[]>;
}

export interface PeppolApScraperResult {
  records: PeppolApRecord[];
  rawHtml: string;
  /** ISO 8601 */
  fetchedAt: string;
}

export class SafetyCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyCheckError';
  }
}

