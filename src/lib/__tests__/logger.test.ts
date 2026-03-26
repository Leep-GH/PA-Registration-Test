import { describe, it, expect, afterEach, vi } from 'vitest';
import { logger } from '@/lib/logger';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('logger', () => {
  it('Should_CallConsoleLog_When_InfoCalled', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('info message');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('INFO');
    expect(spy.mock.calls[0][0]).toContain('info message');
  });

  it('Should_CallConsoleWarn_When_WarnCalled', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('warn message');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('WARN');
    expect(spy.mock.calls[0][0]).toContain('warn message');
  });

  it('Should_CallConsoleError_When_ErrorCalled', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('error message');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('ERROR');
    expect(spy.mock.calls[0][0]).toContain('error message');
  });

  it('Should_CallConsoleLog_When_DebugCalled_OutsideProduction', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.debug('debug message');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('DEBUG');
  });

  it('Should_NotCallConsoleLog_When_DebugCalled_InProduction', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.debug('debug message');

    expect(spy).not.toHaveBeenCalled();
  });

  it('Should_ForwardExtraArgs_When_LogCalledWithMetadata', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.info('message with meta', { key: 'value' });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('message with meta'), { key: 'value' });
  });

  it('Should_ForwardExtraArgs_When_ErrorCalledWithMetadata', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.error('error with meta', { reason: 'oops' });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('error with meta'), { reason: 'oops' });
  });

  it('Should_ForwardExtraArgs_When_WarnCalledWithMetadata', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.warn('warn with meta', { context: 'stage' });

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('warn with meta'), { context: 'stage' });
  });
});
