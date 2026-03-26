/**
 * ConsoleSink — v1 notification stub.
 *
 * All methods log structured output to stdout and append to ./notifications.log.
 * Replace this with a real email provider (Resend, SendGrid) by implementing
 * the NotificationService interface and swapping in getNotificationService().
 *
 * NEVER log email addresses (PII). Recipients are counted but not included in logs.
 */

import { appendFile } from 'fs/promises';
import { resolve } from 'path';
import type { NotificationService, ChangeEventSummary } from './interface';

const LOG_FILE = resolve('./notifications.log');

async function appendLog(entry: object): Promise<void> {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n';
  try {
    await appendFile(LOG_FILE, line, 'utf-8');
  } catch {
    // Non-fatal — console output is the primary channel
  }
}

export class ConsoleSink implements NotificationService {
  async sendChangeAlert(
    changes: ChangeEventSummary[],
    recipients: string[],
  ): Promise<void> {
    const summary = changes.map((c) => ({
      pdp: c.pdpName,
      type: c.eventType,
      ...(c.oldStatus ? { from: c.oldStatus } : {}),
      ...(c.newStatus ? { to: c.newStatus } : {}),
    }));
    const entry = {
      type: 'change_alert',
      changeCount: changes.length,
      recipientCount: recipients.length,
      changes: summary,
    };
    console.log('[NOTIFICATION] Change alert', JSON.stringify(entry, null, 2));
    await appendLog(entry);
  }

  async sendAdminAlert(subject: string, body: string): Promise<void> {
    const entry = { type: 'admin_alert', subject, body };
    console.log('[NOTIFICATION] Admin alert', JSON.stringify(entry, null, 2));
    await appendLog(entry);
  }

  async sendConfirmationEmail(email: string, confirmUrl: string): Promise<void> {
    // Never log the email address (PII). Log only that a confirmation was sent.
    const entry = { type: 'confirmation_email', confirmUrl };
    console.log('[NOTIFICATION] Confirmation email queued', JSON.stringify(entry, null, 2));
    await appendLog(entry);
    void email; // intentionally unused — prevents linter warnings without logging PII
  }

  async sendWelcomeEmail(email: string, unsubscribeUrl: string): Promise<void> {
    const entry = { type: 'welcome_email', unsubscribeUrl };
    console.log('[NOTIFICATION] Welcome email queued', JSON.stringify(entry, null, 2));
    await appendLog(entry);
    void email; // intentionally unused
  }
}

/** Returns the active notification service based on NOTIFICATION_PROVIDER env var. */
export function getNotificationService(): NotificationService {
  // Future: switch on NOTIFICATION_PROVIDER to return Resend/SendGrid impl
  return new ConsoleSink();
}
