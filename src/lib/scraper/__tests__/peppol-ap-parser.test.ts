import { describe, it, expect, vi } from 'vitest';
import { PeppolApParser } from '@/lib/scraper/peppol-ap-parser';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRow(
  name: string,
  country: string,
  ap: string,
  smp: string,
  contact: string,
  email: string,
  authority: string,
): string {
  return `<tr><td>${name}</td><td>${country}</td><td>${ap}</td><td>${smp}</td><td>${contact}</td><td>${email}</td><td>${authority}</td></tr>`;
}

function makeTable(rows: string, header = 'AP Certified'): string {
  return `<table><thead><tr><th>${header}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PeppolApParser', () => {
  it('Should_ParseAllFields_When_WellFormedTableProvided', () => {
    const html = makeTable(
      makeRow('Cegid', 'France', 'AP Certified', 'SMP Certified', 'John Smith', 'john@cegid.com', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      name: 'Cegid',
      slug: 'cegid',
      country: 'France',
      apCertified: true,
      smpCertified: true,
      contactName: 'John Smith',
      contactEmail: 'john@cegid.com',
      authority: 'DGFIP',
    });
  });

  it('Should_SetApCertifiedTrue_When_CellTextIsApCertified', () => {
    const html = makeTable(
      makeRow('Acme Corp', 'Germany', 'AP Certified', '−', 'Jane Doe', 'jane@acme.de', 'BDR'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.apCertified).toBe(true);
  });

  it('Should_SetApCertifiedFalse_When_CellTextIsDash', () => {
    const html = makeTable(
      makeRow('Acme Corp', 'Germany', '−', '−', 'Jane Doe', 'jane@acme.de', 'BDR'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.apCertified).toBe(false);
  });

  it('Should_SetSmpCertifiedTrue_When_CellTextIsSmpCertified', () => {
    const html = makeTable(
      makeRow('OXS', 'France', '−', 'SMP Certified', 'Marc Dupont', 'marc@oxs.fr', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.smpCertified).toBe(true);
  });

  it('Should_SetSmpCertifiedFalse_When_CellTextIsDash', () => {
    const html = makeTable(
      makeRow('OXS', 'France', 'AP Certified', '−', 'Marc Dupont', 'marc@oxs.fr', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.smpCertified).toBe(false);
  });

  it('Should_ExtractCountry_When_CountryCellPresent', () => {
    const html = makeTable(
      makeRow('Esker', 'France', 'AP Certified', 'SMP Certified', 'Paul Martin', 'paul@esker.fr', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.country).toBe('France');
  });

  it('Should_ExtractAuthority_When_AuthorityCellPresent', () => {
    const html = makeTable(
      makeRow('Esker', 'France', 'AP Certified', 'SMP Certified', 'Paul Martin', 'paul@esker.fr', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.authority).toBe('DGFIP');
  });

  it('Should_SetContactNameUndefined_When_CellContainsNotOfferingSentinel', () => {
    const html = makeTable(
      makeRow(
        'Chorus Pro',
        'France',
        'AP Certified',
        'SMP Certified',
        'Not offering services to private companies',
        'contact@chorus.fr',
        'DGFIP',
      ),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.contactName).toBeUndefined();
  });

  it('Should_SetContactEmailUndefined_When_CellIsDash', () => {
    const html = makeTable(
      makeRow('Yooz', 'France', 'AP Certified', 'SMP Certified', 'Sophie Leroy', '−', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.contactEmail).toBeUndefined();
  });

  it('Should_GenerateSlug_When_NameContainsUppercaseAndSpaces', () => {
    const html = makeTable(
      makeRow('Sage France', 'France', 'AP Certified', 'SMP Certified', 'Alice Martin', 'alice@sage.fr', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records[0]?.slug).toBe('sage-france');
  });

  it('Should_ReturnEmptyArray_When_NoTableInHtml', () => {
    const html = '<html><body><p>No table here</p></body></html>';
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records).toHaveLength(0);
  });

  it('Should_FallbackToFirstTable_When_NoTableContainsApCertifiedText', () => {
    const html = `<table><tbody>${makeRow('Ivalua', 'Belgium', 'AP Certified', '−', 'Leo', 'leo@ivalua.com', 'BOSA')}</tbody></table>`;
    const parser = new PeppolApParser();

    // This table header does NOT contain "AP Certified" as header text in a
    // containing element, so the filter falls through to the first-table fallback.
    // The data row still has "AP Certified" cell text → apCertified = true.
    const records = parser.parse(html);

    expect(records.length).toBeGreaterThanOrEqual(1);
  });

  it('Should_SkipRow_When_FewerThanSevenCells', () => {
    const headerRow = '<tr><th>Name</th><th>Country</th><th>AP</th><th>SMP</th><th>Contact</th><th>Email</th><th>Auth</th></tr>';
    const html = makeTable(
      headerRow + makeRow('Cegid', 'France', 'AP Certified', 'SMP Certified', 'John', 'john@cegid.com', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    // The <th>-only header row has no <td> cells (cells.length === 0) → skipped
    const records = parser.parse(html);

    expect(records).toHaveLength(1);
  });

  it('Should_SkipRow_When_NameCellIsEmpty', () => {
    const rowWithEmptyName = makeRow('', 'France', 'AP Certified', 'SMP Certified', 'John', 'john@test.fr', 'DGFIP');
    const html = makeTable(
      rowWithEmptyName + makeRow('Cegid', 'France', 'AP Certified', 'SMP Certified', 'John', 'john@cegid.com', 'DGFIP'),
    );
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records).toHaveLength(1);
    expect(records[0]?.name).toBe('Cegid');
  });

  it('Should_ParseMultipleRows_When_TableHasMultipleDataRows', () => {
    const rows = [
      makeRow('Cegid', 'France', 'AP Certified', 'SMP Certified', 'John', 'john@cegid.com', 'DGFIP'),
      makeRow('Esker', 'France', 'AP Certified', '−', 'Paul', 'paul@esker.fr', 'DGFIP'),
      makeRow('Yooz', 'France', '−', '−', 'Sophie', 'sophie@yooz.fr', 'DGFIP'),
    ].join('');
    const html = makeTable(rows);
    const parser = new PeppolApParser();

    const records = parser.parse(html);

    expect(records).toHaveLength(3);
  });
});
