import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { normalizeName, similarityScore, runCrossRegistryMatching } from '@/lib/cross-registry/index';
import { getAllPdps } from '@/lib/db/repositories/pdps';
import { getAllPeppolAps } from '@/lib/db/repositories/peppol-aps';
import { upsertCrossRegistryLink } from '@/lib/db/repositories/cross-registry-links';
import type { Pdp } from '@/lib/db/schema';
import type { PeppolAp } from '@/lib/db/repositories/peppol-aps';

// Logger mock required for runCrossRegistryMatching (has side effects).
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Repository mocks for runCrossRegistryMatching tests.
vi.mock('@/lib/db/repositories/pdps');
vi.mock('@/lib/db/repositories/peppol-aps');
vi.mock('@/lib/db/repositories/cross-registry-links');

// No logger mock needed for pure functions — cross-registry pure functions have no side effects.

// ---------------------------------------------------------------------------
// normalizeName
// ---------------------------------------------------------------------------

describe('normalizeName', () => {
  it('Should_Lowercase_When_NameContainsUppercase', () => {
    const result = normalizeName('CEGID');

    expect(result).toBe('cegid');
  });

  it('Should_StripSasSuffix_When_NameEndsWithSas', () => {
    const result = normalizeName('Sage SAS');

    expect(result).toBe('sage');
  });

  it('Should_StripSaDotSuffix_When_NameEndsWithDottedSa', () => {
    // Trailing dot is stripped by lowercasing/punctuation removal; the regex
    // matches `S.A` (no trailing dot) at end-of-string.
    const result = normalizeName('Cegid S.A');

    expect(result).toBe('cegid');
  });

  it('Should_StripSrlDotSuffix_When_NameEndsWithDottedSrl', () => {
    const result = normalizeName('Acme S.R.L');

    expect(result).toBe('acme');
  });

  it('Should_StripGmbhSuffix_When_NameEndsWithGmbh', () => {
    const result = normalizeName('Muster GmbH');

    expect(result).toBe('muster');
  });

  it('Should_StripBvSuffix_When_NameEndsWithDottedBv', () => {
    const result = normalizeName('TwinField B.V');

    expect(result).toBe('twinfield');
  });

  it('Should_StripLtdSuffix_When_NameEndsWithLtd', () => {
    const result = normalizeName('Tradeshift Ltd');

    expect(result).toBe('tradeshift');
  });

  it('Should_StripStackedSuffixes_When_NameHasMultipleLegalSuffixes', () => {
    // S.A stripped first (end-of-string), then SAS stripped in next iteration.
    const result = normalizeName('Foo SAS S.A');

    expect(result).toBe('foo');
  });

  it('Should_RemovePunctuation_When_NameContainsPunctuation', () => {
    // Hyphens and other non-alphanumeric characters are replaced with spaces.
    const result = normalizeName('Foo-Bar');

    expect(result).toBe('foo bar');
  });

  it('Should_CollapseMultipleSpaces_When_NameHasExtraWhitespace', () => {
    const result = normalizeName('Sage   Group');

    expect(result).toBe('sage group');
  });

  it('Should_ReturnEmptyString_When_InputIsEmpty', () => {
    const result = normalizeName('');

    expect(result).toBe('');
  });
});

// ---------------------------------------------------------------------------
// similarityScore
// ---------------------------------------------------------------------------

describe('similarityScore', () => {
  it('Should_Return100_When_BothNamesAreIdentical', () => {
    const result = similarityScore('Cegid', 'Cegid');

    expect(result).toBe(100);
  });

  it('Should_Return100_When_NamesOnlyDifferByLegalSuffix', () => {
    const result = similarityScore('Cegid', 'Cegid SA');

    expect(result).toBe(100);
  });

  it('Should_ReturnHighScore_When_NamesCloselyMatch', () => {
    const result = similarityScore('Esker', 'Esker SAS');

    expect(result).toBeGreaterThanOrEqual(75);
  });

  it('Should_ReturnLowScore_When_NamesAreCompletelyDifferent', () => {
    const result = similarityScore('Apple Inc', 'Microsoft');

    expect(result).toBeLessThan(75);
  });

  it('Should_Return0_When_EitherNameIsEmpty', () => {
    const result = similarityScore('', 'Cegid');

    expect(result).toBe(0);
  });

  it('Should_BeSymmetric_When_OrderOfArgumentsIsSwapped', () => {
    const ab = similarityScore('Sage Group', 'Sage');
    const ba = similarityScore('Sage', 'Sage Group');

    expect(ab).toBe(ba);
  });

  it('Should_ReturnHighScore_When_NamesHaveMinorWordOrderDifferences', () => {
    const result = similarityScore('Group Sage France', 'Sage France Group');

    expect(result).toBeGreaterThanOrEqual(75);
  });
});

// ---------------------------------------------------------------------------
// Helpers for runCrossRegistryMatching
// ---------------------------------------------------------------------------

function makePdp(id: number, name: string): Partial<Pdp> & { id: number; name: string; slug: string; isActive: boolean } {
  return { id, name, slug: name.toLowerCase().replace(/\s+/g, '-'), isActive: true };
}

function makeDbAp(id: number, name: string, authority = 'DGFIP'): Partial<PeppolAp> & { id: number; name: string; authority: string | null } {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    country: 'France',
    apCertified: true,
    smpCertified: false,
    contactName: null,
    contactEmail: null,
    authority,
    firstSeenAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    isActive: true,
  };
}

// ---------------------------------------------------------------------------
// runCrossRegistryMatching
// ---------------------------------------------------------------------------

describe('runCrossRegistryMatching', () => {
  beforeEach(() => {
    vi.mocked(getAllPdps).mockResolvedValue([]);
    vi.mocked(getAllPeppolAps).mockResolvedValue([]);
    vi.mocked(upsertCrossRegistryLink).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('Should_ReturnZeroCounts_When_NoPdps', async () => {
    vi.mocked(getAllPdps).mockResolvedValue([]);
    vi.mocked(getAllPeppolAps).mockResolvedValue([makeDbAp(1, 'Cegid')] as PeppolAp[]);

    const result = await runCrossRegistryMatching();

    expect(result).toEqual({ linksCreated: 0, linksUpdated: 0 });
    expect(vi.mocked(upsertCrossRegistryLink)).not.toHaveBeenCalled();
  });

  it('Should_ReturnZeroCounts_When_NoPeppolAps', async () => {
    vi.mocked(getAllPdps).mockResolvedValue([makePdp(1, 'Cegid')] as Pdp[]);
    vi.mocked(getAllPeppolAps).mockResolvedValue([]);

    const result = await runCrossRegistryMatching();

    expect(result).toEqual({ linksCreated: 0, linksUpdated: 0 });
    expect(vi.mocked(upsertCrossRegistryLink)).not.toHaveBeenCalled();
  });

  it('Should_IncrementLinksCreated_When_NewMatchInserted', async () => {
    vi.mocked(getAllPdps).mockResolvedValue([makePdp(1, 'Cegid')] as Pdp[]);
    vi.mocked(getAllPeppolAps).mockResolvedValue([makeDbAp(10, 'Cegid')] as PeppolAp[]);
    vi.mocked(upsertCrossRegistryLink).mockResolvedValue(true); // inserted

    const result = await runCrossRegistryMatching();

    expect(result).toEqual({ linksCreated: 1, linksUpdated: 0 });
    expect(vi.mocked(upsertCrossRegistryLink)).toHaveBeenCalledWith(
      1,
      10,
      expect.any(Number),
      expect.any(String),
    );
  });

  it('Should_IncrementLinksUpdated_When_ExistingMatchUpdated', async () => {
    vi.mocked(getAllPdps).mockResolvedValue([makePdp(1, 'Cegid')] as Pdp[]);
    vi.mocked(getAllPeppolAps).mockResolvedValue([makeDbAp(10, 'Cegid')] as PeppolAp[]);
    vi.mocked(upsertCrossRegistryLink).mockResolvedValue(false); // updated

    const result = await runCrossRegistryMatching();

    expect(result).toEqual({ linksCreated: 0, linksUpdated: 1 });
  });

  it('Should_NotCallUpsert_When_BestScoreBelowThreshold', async () => {
    vi.mocked(getAllPdps).mockResolvedValue([makePdp(1, 'Acme Corp')] as Pdp[]);
    // 'Microsoft' shares no tokens with 'Acme Corp' — score well below 75
    vi.mocked(getAllPeppolAps).mockResolvedValue([makeDbAp(10, 'Microsoft')] as PeppolAp[]);

    const result = await runCrossRegistryMatching();

    expect(result).toEqual({ linksCreated: 0, linksUpdated: 0 });
    expect(vi.mocked(upsertCrossRegistryLink)).not.toHaveBeenCalled();
  });

  it('Should_AccumulateCountsCorrectly_When_MultiplePdpsMatched', async () => {
    vi.mocked(getAllPdps).mockResolvedValue([
      makePdp(1, 'Cegid'),
      makePdp(2, 'Esker'),
    ] as Pdp[]);
    vi.mocked(getAllPeppolAps).mockResolvedValue([
      makeDbAp(10, 'Cegid'),
      makeDbAp(11, 'Esker SAS'),
    ] as PeppolAp[]);
    vi.mocked(upsertCrossRegistryLink)
      .mockResolvedValueOnce(true)  // Cegid → inserted
      .mockResolvedValueOnce(false); // Esker → updated

    const result = await runCrossRegistryMatching();

    expect(result).toEqual({ linksCreated: 1, linksUpdated: 1 });
    expect(vi.mocked(upsertCrossRegistryLink)).toHaveBeenCalledTimes(2);
  });
});
