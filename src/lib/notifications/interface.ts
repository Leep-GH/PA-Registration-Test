// ---------------------------------------------------------------------------
// NotificationService interface and shared types
// ---------------------------------------------------------------------------

export interface ChangeEventSummary {
  pdpName: string;
  eventType: 'added' | 'removed' | 'status_changed';
  oldStatus?: string;
  newStatus?: string;
}

/**
 * Provider-agnostic notification interface.
 * v1 is implemented by ConsoleSink (logs to stdout).
 * Swap in a Resend or SendGrid implementation by replacing the constructor in
 * getNotificationService() without changing any callers.
 */
export interface NotificationService {
  /**
   * Sends a change-detection digest to the given list of subscriber emails.
   * Never logs the recipients list — it contains PII.
   */
  sendChangeAlert(
    changes: ChangeEventSummary[],
    recipients: string[],
  ): Promise<void>;

  /**
   * Sends an admin alert (dead man's switch, safety check failure, etc.).
   * Recipient is ADMIN_ALERT_EMAIL env var.
   */
  sendAdminAlert(subject: string, body: string): Promise<void>;

  /** Sends a double opt-in confirmation email. */
  sendConfirmationEmail(email: string, confirmUrl: string): Promise<void>;

  /** Sends a welcome email after confirmation (includes unsubscribe link). */
  sendWelcomeEmail(email: string, unsubscribeUrl: string): Promise<void>;
}
