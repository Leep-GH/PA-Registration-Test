import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPeppolApScrape, getIsPeppolApScrapeRunning } from '@/lib/scraper/peppol-ap-index';
import { fetchPage } from '@/lib/scraper/fetcher';
import {
  getAllPeppolAps,
  upsertPeppolAp,
  setPeppolApInactive,
} from '@/lib/db/repositories/peppol-aps';
import { insertRun, updateRun } from '@/lib/db/repositories/runs';
import { runCrossRegistryMatching } from '@/lib/cross-registry';
import type { PeppolApRecord } from '@/lib/scraper/types';
import type { PeppolAp } from '@/lib/db/repositories/peppol-aps';

// vi.hoisted ensures the shared parse mock is available inside the vi.mock factory
// (vi.mock calls are hoisted before imports, so plain variable declarations are not safe).
const { mockParseImpl } = vi.hoisted(() => ({
  mockParseImpl: vi.fn<() => PeppolApRecord[]>(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/scraper/fetcher');

// Use a regular function (not arrow) so it can be called with `new`.
vi.mock('@/lib/scraper/peppol-ap-parser', () => ({
  PeppolApParser: vi.fn(function (this: unknown) {
    return { parse: mockParseImpl };
  }),
}));

vi.mock('@/lib/db/repositories/peppol-aps');
vi.mock('@/lib/db/repositories/runs');
vi.mock('@/lib/cross-registry');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecords(count: number): PeppolApRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Company ${i}`,
    slug: `company-${i}`,
    country: 'France',
    apCertified: true,
    smpCertified: false,
    authority: 'DGFIP',
  }));
}

function makeDbAp(overrides: Partial<PeppolAp> = {}): PeppolAp {
  return {
    id: 1,
    name: 'OldAP',
    slug: 'old-ap',
    country: 'France',
    apCertified: true,
    smpCertified: false,
    contactName: null,
    contactEmail: null,
    authority: 'DGFIP',
    firstSeenAt: '2024-01-01T00:00:00Z',
    lastSeenAt: '2024-01-01T00:00:00Z',
    isActive: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runPeppolApScrape', () => {
  beforeEach(() => {
    vi.mocked(fetchPage).mockResolvedValue('<html></html>');
    mockParseImpl.mockReturnValue(makeRecords(60));
    vi.mocked(getAllPeppolAps).mockResolvedValue([]);
    vi.mocked(upsertPeppolAp).mockResolvedValue(1);
    vi.mocked(setPeppolApInactive).mockResolvedValue(undefined);
    vi.mocked(insertRun).mockResolvedValue(1);
    vi.mocked(updateRun).mockResolvedValue(undefined);
    vi.mocked(runCrossRegistryMatching).mockResolvedValue({ linksCreated: 2, linksUpdated: 1 });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('Should_ReturnCorrectOutcome_When_HappyPath', async () => {
    const outcome = await runPeppolApScrape();

    expect(outcome.runId).toBe(1);
    expect(outcome.apsFound).toBe(60);
    expect(outcome.crossLinksCreated).toBe(3); // linksCreated(2) + linksUpdated(1)
  });

  it('Should_UpdateRunWithSuccess_When_HappyPath', async () => {
    await runPeppolApScrape();

    expect(vi.mocked(updateRun)).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'success', pdpsFound: 60 }),
    );
  });

  it('Should_CallCrossRegistryMatching_When_HappyPath', async () => {
    await runPeppolApScrape();

    expect(vi.mocked(runCrossRegistryMatching)).toHaveBeenCalledOnce();
  });

  it('Should_UpsertEachRecord_When_RecordsReturnedByParser', async () => {
    await runPeppolApScrape();

    expect(vi.mocked(upsertPeppolAp)).toHaveBeenCalledTimes(60);
  });

  it('Should_MarkStaleApInactive_When_ApSlugAbsentFromCurrentScrape', async () => {
    vi.mocked(getAllPeppolAps).mockResolvedValue([makeDbAp({ slug: 'old-ap' })]);
    // Scraped records use 'company-N' slugs — 'old-ap' is absent

    await runPeppolApScrape();

    expect(vi.mocked(setPeppolApInactive)).toHaveBeenCalledWith('old-ap', expect.any(String));
  });

  it('Should_NotMarkApInactive_When_ApSlugStillPresentInCurrentScrape', async () => {
    const records = makeRecords(60);
    mockParseImpl.mockReturnValue(records);
    vi.mocked(getAllPeppolAps).mockResolvedValue([makeDbAp({ slug: records[0]!.slug })]);

    await runPeppolApScrape();

    expect(vi.mocked(setPeppolApInactive)).not.toHaveBeenCalled();
  });

  it('Should_ThrowAndRecordFailedStatus_When_SafetyCheckFails', async () => {
    mockParseImpl.mockReturnValue(makeRecords(5)); // below MIN_EXPECTED_APS = 50

    await expect(runPeppolApScrape()).rejects.toThrow('safety check failed');

    expect(vi.mocked(updateRun)).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('Should_ThrowAndRecordFailedStatus_When_FetchPageThrows', async () => {
    vi.mocked(fetchPage).mockRejectedValue(new Error('HTTP 503 Service Unavailable'));

    await expect(runPeppolApScrape()).rejects.toThrow('HTTP 503');

    expect(vi.mocked(updateRun)).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('Should_ReleaseMutex_When_ScrapeThrows', async () => {
    vi.mocked(fetchPage).mockRejectedValue(new Error('network error'));

    await expect(runPeppolApScrape()).rejects.toThrow();

    expect(getIsPeppolApScrapeRunning()).toBe(false);
  });

  it('Should_Throw_When_ScrapeAlreadyInProgress', async () => {
    // Make fetchPage hang so the first run holds the mutex
    vi.mocked(fetchPage).mockReturnValue(new Promise<string>(() => {}));

    const first = runPeppolApScrape();

    // Flush the event loop past the `await insertRun` so _isPeppolApScrapeRunning = true
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    await expect(runPeppolApScrape()).rejects.toThrow('already in progress');

    // Suppress the unresolved first promise so vitest can clean up
    first.catch(() => {});
  });
});
