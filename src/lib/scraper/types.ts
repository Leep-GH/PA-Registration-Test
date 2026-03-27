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

export class SafetyCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafetyCheckError';
  }
}
