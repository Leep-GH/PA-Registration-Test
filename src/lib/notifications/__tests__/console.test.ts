import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';

// Mock fs/promises before importing ConsoleSink
vi.mock('fs/promises', () => ({
  appendFile: vi.fn().mockResolvedValue(undefined),
}));

import { appendFile } from 'fs/promises';
import { ConsoleSink, getNotificationService } from '@/lib/notifications/console';
import type { ChangeEventSummary } from '@/lib/notifications/interface';

beforeEach(() => {
  vi.mocked(appendFile).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConsoleSink', () => {
  it('Should_LogToConsole_When_SendChangeAlertCalled', async () => {
    const sink = new ConsoleSink();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const changes: ChangeEventSummary[] = [
      { pdpName: 'Entreprise Alpha', eventType: 'added' },
      { pdpName: 'Société Bêta', eventType: 'removed', oldStatus: 'registered' },
    ];

    await sink.sendChangeAlert(changes, ['subscriber@example.com']);

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('[NOTIFICATION]');
  });

  it('Should_IncludeNewStatus_When_ChangeHasNewStatus', async () => {
    const sink = new ConsoleSink();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const changes: ChangeEventSummary[] = [
      {
        pdpName: 'Gamma SAS',
        eventType: 'status_changed',
        oldStatus: 'candidate',
        newStatus: 'registered',
      },
    ];

    await sink.sendChangeAlert(changes, ['subscriber@example.com']);

    const logFileContent = vi.mocked(appendFile).mock.calls[0][1] as string;
    const parsed = JSON.parse(logFileContent) as Record<string, unknown>;
    const changeSummary = (parsed.changes as Array<Record<string, unknown>>)[0];
    expect(changeSummary['to']).toBe('registered');
    expect(changeSummary['from']).toBe('candidate');
  });

  it('Should_AppendToLogFile_When_SendChangeAlertCalled', async () => {
    const sink = new ConsoleSink();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const changes: ChangeEventSummary[] = [
      { pdpName: 'Entreprise Alpha', eventType: 'added' },
    ];

    await sink.sendChangeAlert(changes, ['subscriber@example.com']);

    expect(vi.mocked(appendFile)).toHaveBeenCalledOnce();
    const [_path, content] = vi.mocked(appendFile).mock.calls[0] as [string, string, string];
    expect(content).toContain('change_alert');
  });

  it('Should_NotLogRecipientEmails_When_SendChangeAlertCalled', async () => {
    const sink = new ConsoleSink();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const recipientEmail = 'private@example.com';
    const changes: ChangeEventSummary[] = [{ pdpName: 'PDP X', eventType: 'added' }];

    await sink.sendChangeAlert(changes, [recipientEmail]);

    // PII (email address) must never appear in logs
    const logOutput = spy.mock.calls[0].map(String).join(' ');
    expect(logOutput).not.toContain(recipientEmail);
  });

  it('Should_LogToConsole_When_SendAdminAlertCalled', async () => {
    const sink = new ConsoleSink();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sink.sendAdminAlert('Safety check failed', 'Parser returned 0 PDPs');

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('[NOTIFICATION]');
  });

  it('Should_AppendToLogFile_When_SendAdminAlertCalled', async () => {
    const sink = new ConsoleSink();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await sink.sendAdminAlert('Safety check failed', 'Parser returned 0 PDPs');

    expect(vi.mocked(appendFile)).toHaveBeenCalledOnce();
    const [_path, content] = vi.mocked(appendFile).mock.calls[0] as [string, string, string];
    expect(content).toContain('admin_alert');
  });

  it('Should_LogToConsole_When_SendConfirmationEmailCalled', async () => {
    const sink = new ConsoleSink();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sink.sendConfirmationEmail('user@example.com', 'https://app.com/api/confirm/abc123');

    expect(spy).toHaveBeenCalledOnce();
  });

  it('Should_NotLogEmailAddress_When_SendConfirmationEmailCalled', async () => {
    const sink = new ConsoleSink();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(appendFile).mockResolvedValue(undefined);

    await sink.sendConfirmationEmail('private@example.com', 'https://app.com/confirm/abc');

    // PII check: email must not appear in console or log file
    const consoleOutput = spy.mock.calls[0].map(String).join(' ');
    expect(consoleOutput).not.toContain('private@example.com');

    const logFileContent = vi.mocked(appendFile).mock.calls[0][1] as string;
    expect(logFileContent).not.toContain('private@example.com');
  });

  it('Should_LogToConsole_When_SendWelcomeEmailCalled', async () => {
    const sink = new ConsoleSink();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sink.sendWelcomeEmail('user@example.com', 'https://app.com/api/unsubscribe/xyz');

    expect(spy).toHaveBeenCalledOnce();
  });

  it('Should_NotThrow_When_AppendFileFails', async () => {
    const sink = new ConsoleSink();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(appendFile).mockRejectedValue(new Error('Disk full'));

    // appendLog is non-fatal — must not propagate errors
    await expect(
      sink.sendAdminAlert('Test subject', 'Test body'),
    ).resolves.toBeUndefined();
  });
});

describe('getNotificationService', () => {
  it('Should_ReturnConsoleSink_When_Called', () => {
    const service = getNotificationService();
    expect(service).toBeInstanceOf(ConsoleSink);
  });
});
