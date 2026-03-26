import { describe, it, expect, afterEach, vi } from 'vitest';
import { SafetyCheckError } from '@/lib/scraper/types';

// Mock the logger to suppress console output during tests
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocking
const { checkSafety } = await import('@/lib/safety/index');

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('checkSafety', () => {
  it('Should_ThrowSafetyCheckError_When_ParsedListIsEmpty', () => {
    expect(() => checkSafety(0, 10)).toThrow(SafetyCheckError);
    expect(() => checkSafety(0, 10)).toThrow('empty result guard');
  });

  it('Should_ThrowSafetyCheckError_When_EmptyListAndDbIsAlsoEmpty', () => {
    // Guard 1 fires regardless of dbCount — found=0 is always fatal
    expect(() => checkSafety(0, 0)).toThrow(SafetyCheckError);
  });

  it('Should_ThrowSafetyCheckError_When_DropExceedsThreshold', () => {
    // dbCount=10, threshold=0.5 → minimumAllowed=Math.floor(10*(1-0.5))=5
    // found=4 < 5 → throws
    expect(() => checkSafety(4, 10)).toThrow(SafetyCheckError);
    expect(() => checkSafety(4, 10)).toThrow('drop threshold exceeded');
  });

  it('Should_NotThrow_When_DropBelowThreshold', () => {
    // dbCount=10, threshold=0.5 → minimumAllowed=5, found=5 → exactly at boundary → passes
    expect(() => checkSafety(5, 10)).not.toThrow();
  });

  it('Should_NotThrow_When_CountIncreases', () => {
    // More results than DB state — no drop at all
    expect(() => checkSafety(15, 10)).not.toThrow();
  });

  it('Should_NotThrow_When_DbIsEmptyAndResultsFound', () => {
    // First-run edge case: no previous data in DB (dbCount=0), parser returns results
    // Guard 2 is skipped when dbCount=0, and found>0 means Guard 1 is also skipped
    expect(() => checkSafety(3, 0)).not.toThrow();
  });

  it('Should_Override_When_SafetyCheckOverrideEnabled', () => {
    vi.stubEnv('SAFETY_CHECK_OVERRIDE', 'true');
    // dbCount=10, found=1 (severe drop), but override bypasses Guard 2
    expect(() => checkSafety(1, 10)).not.toThrow();
  });

  it('Should_StillThrowEmptyGuard_When_SafetyCheckOverrideEnabled', () => {
    // Guard 1 (empty list) is never overrideable — even with override=true
    vi.stubEnv('SAFETY_CHECK_OVERRIDE', 'true');
    expect(() => checkSafety(0, 10)).toThrow(SafetyCheckError);
  });

  it('Should_UseDefaultThreshold_When_EnvVarNotSet', () => {
    // Default threshold = 0.5 (50%)
    // dbCount=100, found=49 → minimumAllowed=Math.floor(100*0.5)=50 → 49 < 50 → throws
    expect(() => checkSafety(49, 100)).toThrow(SafetyCheckError);
    // found=50 → 50 >= 50 → passes
    expect(() => checkSafety(50, 100)).not.toThrow();
  });

  it('Should_UseCustomThreshold_When_EnvVarSet', () => {
    vi.stubEnv('SAFETY_DROP_THRESHOLD', '0.2');
    // threshold=0.2 → minimumAllowed=Math.floor(10*(1-0.2))=Math.floor(8)=8
    // found=7 < 8 → throws
    expect(() => checkSafety(7, 10)).toThrow(SafetyCheckError);
    // found=8 → 8 >= 8 → passes
    expect(() => checkSafety(8, 10)).not.toThrow();
  });
});
