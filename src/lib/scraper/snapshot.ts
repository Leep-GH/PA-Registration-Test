import { writeFile, readdir, unlink, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { logger } from '@/lib/logger';

const SNAPSHOTS_DIR = resolve('./snapshots');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ensureSnapshotsDir(): Promise<void> {
  await mkdir(SNAPSHOTS_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Saves a raw HTML snapshot of the scraped page.
 * Storage backend is controlled by SNAPSHOT_STORAGE env var:
 *   'local' — writes to ./snapshots/{date}.html
 *   'blob'  — uploads to Vercel Blob (requires @vercel/blob + BLOB_READ_WRITE_TOKEN)
 *   'db'    — not implemented in v1; logs warning and returns null
 *
 * This function never throws — all errors are caught and logged.
 * Returns the storage path/URL on success, or null on failure.
 */
export async function saveSnapshot(html: string, date: string): Promise<string | null> {
  const storage = process.env.SNAPSHOT_STORAGE ?? 'local';

  try {
    if (storage === 'local') {
      return await saveLocal(html, date);
    }
    if (storage === 'blob') {
      return await saveBlob(html, date);
    }
    if (storage === 'db') {
      logger.warn('Snapshot storage "db" is not implemented in v1 — snapshot not saved');
      return null;
    }
    logger.warn('Unknown SNAPSHOT_STORAGE value; snapshot not saved', { storage });
    return null;
  } catch (error) {
    logger.warn('Snapshot write failed', {
      storage,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Deletes local snapshot files older than SNAPSHOT_RETENTION_DAYS (default 90).
 * Only runs for SNAPSHOT_STORAGE=local. Non-fatal.
 */
export async function cleanupOldSnapshots(): Promise<void> {
  if ((process.env.SNAPSHOT_STORAGE ?? 'local') !== 'local') return;

  const retentionDays = parseInt(process.env.SNAPSHOT_RETENTION_DAYS ?? '90', 10);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  try {
    await ensureSnapshotsDir();
    const files = await readdir(SNAPSHOTS_DIR);

    let deleted = 0;
    for (const file of files) {
      if (!file.endsWith('.html')) continue;
      // Filename format: YYYY-MM-DD.html
      const datePart = file.replace('.html', '');
      const fileTime = new Date(datePart).getTime();
      if (!isNaN(fileTime) && fileTime < cutoff) {
        await unlink(join(SNAPSHOTS_DIR, file));
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info('Snapshot cleanup: deleted old files', { count: deleted, retentionDays });
    }
  } catch (error) {
    logger.warn('Snapshot cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ---------------------------------------------------------------------------
// Backends
// ---------------------------------------------------------------------------

async function saveLocal(html: string, date: string): Promise<string> {
  await ensureSnapshotsDir();
  const filename = `${date}.html`;
  const filepath = join(SNAPSHOTS_DIR, filename);
  await writeFile(filepath, html, 'utf-8');
  logger.info('Snapshot saved locally', { path: filepath });
  return filepath;
}

async function saveBlob(html: string, date: string): Promise<string> {
  // Indirect dynamic import — @vercel/blob is an optional dependency.
  // Using Function() prevents TypeScript from type-checking the module at build time.
  let blobModule: any;
  try {
    blobModule = await (Function('return import("@vercel/blob")')() as Promise<unknown>);
  } catch {
    throw new Error('@vercel/blob is not installed. Run: npm install @vercel/blob');
  }
  const { put } = blobModule as { put: Function };

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN env var is not set');

  const filename = `snapshots/${date}.html`;
  const blob = await put(filename, html, {
    contentType: 'text/html',
    access: 'public',
    token,
  });

  logger.info('Snapshot uploaded to Vercel Blob', { url: blob.url });
  return blob.url;
}
