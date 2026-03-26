import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolve, join } from 'path';

// Mock fs/promises before importing the module under test
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  readdir: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
}));

// Mock the logger to suppress console output
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { saveSnapshot, cleanupOldSnapshots } from '@/lib/scraper/snapshot';

// The module computes SNAPSHOTS_DIR = resolve('./snapshots') at load time
const SNAPSHOTS_DIR = resolve('./snapshots');

beforeEach(() => {
  vi.mocked(mkdir).mockResolvedValue(undefined);
  vi.mocked(writeFile).mockResolvedValue(undefined);
  vi.mocked(readdir).mockResolvedValue([]);
  vi.mocked(unlink).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// saveSnapshot tests
// ---------------------------------------------------------------------------

describe('saveSnapshot', () => {
  it('Should_WriteFile_When_StorageIsLocal', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');

    await saveSnapshot('<html></html>', '2024-06-15');

    expect(vi.mocked(writeFile)).toHaveBeenCalledWith(
      join(SNAPSHOTS_DIR, '2024-06-15.html'),
      '<html></html>',
      'utf-8',
    );
  });

  it('Should_ReturnFilePath_When_WriteSucceeds', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');

    const result = await saveSnapshot('<html></html>', '2024-06-15');

    expect(result).toBe(join(SNAPSHOTS_DIR, '2024-06-15.html'));
  });

  it('Should_ReturnNull_When_WriteThrows', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');
    vi.mocked(writeFile).mockRejectedValue(new Error('Disk full'));

    const result = await saveSnapshot('<html></html>', '2024-06-15');

    expect(result).toBeNull();
  });

  it('Should_ReturnNull_When_StorageIsDb', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'db');

    const result = await saveSnapshot('<html></html>', '2024-06-15');

    expect(result).toBeNull();
    expect(vi.mocked(writeFile)).not.toHaveBeenCalled();
  });

  it('Should_ReturnNull_When_StorageValueIsUnknown', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'unsupported_backend');

    const result = await saveSnapshot('<html></html>', '2024-06-15');

    expect(result).toBeNull();
    expect(vi.mocked(writeFile)).not.toHaveBeenCalled();
  });

  it('Should_NotThrow_When_StorageFails', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');
    vi.mocked(mkdir).mockRejectedValue(new Error('Permission denied'));

    // Must not throw — failures are non-fatal
    await expect(saveSnapshot('<html></html>', '2024-06-15')).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// cleanupOldSnapshots tests
// ---------------------------------------------------------------------------

describe('cleanupOldSnapshots', () => {
  it('Should_DeleteFile_When_FileIsOlderThanRetentionPeriod', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');
    // 2020-01-01 is well beyond any 90-day retention window
    vi.mocked(readdir).mockResolvedValue(['2020-01-01.html'] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);

    await cleanupOldSnapshots();

    expect(vi.mocked(unlink)).toHaveBeenCalledWith(join(SNAPSHOTS_DIR, '2020-01-01.html'));
  });

  it('Should_NotDeleteFile_When_FileIsWithinRetentionPeriod', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');
    // A file dated today is definitely within the 90-day window
    const today = new Date().toISOString().split('T')[0];
    vi.mocked(readdir).mockResolvedValue([`${today}.html`] as unknown as Awaited<
      ReturnType<typeof readdir>
    >);

    await cleanupOldSnapshots();

    expect(vi.mocked(unlink)).not.toHaveBeenCalled();
  });

  it('Should_Skip_When_StorageIsNotLocal', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'blob');

    await cleanupOldSnapshots();

    expect(vi.mocked(readdir)).not.toHaveBeenCalled();
    expect(vi.mocked(unlink)).not.toHaveBeenCalled();
  });

  it('Should_NotThrow_When_CleanupFails', async () => {
    vi.stubEnv('SNAPSHOT_STORAGE', 'local');
    vi.mocked(readdir).mockRejectedValue(new Error('ENOENT: no such file'));

    // Must not throw — cleanup is non-fatal
    await expect(cleanupOldSnapshots()).resolves.toBeUndefined();
  });
});
