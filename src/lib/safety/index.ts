import { logger } from '@/lib/logger';
import { SafetyCheckError } from '@/lib/scraper/types';

/** Default fraction: abort if more than 50% of PDPs disappear in one run. */
const DEFAULT_DROP_THRESHOLD = 0.5;

/**
 * Safety guard for the scraper pipeline.
 *
 * Throws SafetyCheckError if:
 *   1. found === 0 (parser returned nothing — always fatal, not overrideable)
 *   2. dbCount > 0 AND found < dbCount * (1 - DROP_THRESHOLD) (suspicious drop)
 *
 * The drop guard can be bypassed once by setting SAFETY_CHECK_OVERRIDE=true.
 * Never leave SAFETY_CHECK_OVERRIDE=true in a deployed environment.
 *
 * @param found   - Number of PDPs returned by the parser this run
 * @param dbCount - Number of active PDPs currently in the database
 */
export function checkSafety(found: number, dbCount: number): void {
  // Guard 1: Empty result — always fatal
  if (found === 0) {
    const msg = 'Safety check failed: parser returned 0 PDPs (empty result guard)';
    logger.error(msg);
    throw new SafetyCheckError(msg);
  }

  // Guard 2: Drop threshold
  if (dbCount > 0) {
    const threshold = parseFloat(process.env.SAFETY_DROP_THRESHOLD ?? String(DEFAULT_DROP_THRESHOLD));
    const minimumAllowed = Math.floor(dbCount * (1 - threshold));

    if (found < minimumAllowed) {
      const msg =
        `Safety check failed: drop threshold exceeded — found ${found} PDPs but DB has ${dbCount} ` +
        `(threshold ${threshold * 100}%, minimum allowed ${minimumAllowed})`;

      const override = process.env.SAFETY_CHECK_OVERRIDE === 'true';
      if (override) {
        logger.warn(
          `SAFETY_CHECK_OVERRIDE=true — bypassing drop guard. ${msg}`,
        );
        return;
      }

      logger.error(msg);
      throw new SafetyCheckError(msg);
    }
  }

  logger.info('Safety check passed', { found, dbCount });
}
