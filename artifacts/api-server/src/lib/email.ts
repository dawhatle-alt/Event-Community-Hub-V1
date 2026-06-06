import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

export interface ConfirmationEmailOptions {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  eventEndDate?: Date | null;
  eventLocation: string;
  eventAddress?: string | null;
  quantity: number;
  totalAmount: number;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

function buildHtml(opts: ConfirmationEmailOptions): string {
  const { firstName, eventTitle, eventDate, eventEndDate, eventLocation, eventAddress, quantity, totalAmount } = opts;

  const dateStr = formatDate(eventDate);
  const startTime = formatTime(eventDate);
  const timeStr = eventEndDate ? `${startTime} – ${formatTime(eventEndDate)}` : startTime;
  const amountStr = totalAmount === 0 ? "Free" : `$${totalAmount.toFixed(2)}`;
  const ticketLine = quantity === 1 ? "1 ticket" : `${quantity} tickets`;

  const locationBlock = eventAddress
    ? `${eventLocation}<br><span style="color:#6b7280">${eventAddress}</span>`
    : eventLocation;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#7c3aed;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#e9d5ff;text-transform:uppercase;">BougieBams</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#ffffff;">You're registered! 🎉</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
              <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.6;">
                Your registration for <strong>${eventTitle}</strong> is confirmed. We can't wait to see you there!
              </p>

              <!-- Event details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1f2937;">${eventTitle}</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:28px;">
                          <span style="font-size:18px;">📅</span>
                        </td>
                        <td style="padding:6px 0 6px 8px;font-size:15px;color:#374151;">
                          ${dateStr}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:28px;">
                          <span style="font-size:18px;">🕐</span>
                        </td>
                        <td style="padding:6px 0 6px 8px;font-size:15px;color:#374151;">
                          ${timeStr} ET
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:28px;">
                          <span style="font-size:18px;">📍</span>
                        </td>
                        <td style="padding:6px 0 6px 8px;font-size:15px;color:#374151;line-height:1.5;">
                          ${locationBlock}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:28px;">
                          <span style="font-size:18px;">🎟️</span>
                        </td>
                        <td style="padding:6px 0 6px 8px;font-size:15px;color:#374151;">
                          ${ticketLine} · ${amountStr}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;line-height:1.6;">
                Keep this email for your records. If you have any questions, reply to this email and we'll be happy to help.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} BougieBams. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(opts: ConfirmationEmailOptions): string {
  const { firstName, eventTitle, eventDate, eventEndDate, eventLocation, eventAddress, quantity, totalAmount } = opts;
  const dateStr = formatDate(eventDate);
  const startTime = formatTime(eventDate);
  const timeStr = eventEndDate ? `${startTime} – ${formatTime(eventEndDate)}` : startTime;
  const amountStr = totalAmount === 0 ? "Free" : `$${totalAmount.toFixed(2)}`;
  const ticketLine = quantity === 1 ? "1 ticket" : `${quantity} tickets`;
  const locationLine = eventAddress ? `${eventLocation}, ${eventAddress}` : eventLocation;

  return [
    `Hi ${firstName},`,
    "",
    `Your registration for "${eventTitle}" is confirmed!`,
    "",
    "EVENT DETAILS",
    "-------------",
    `Event:    ${eventTitle}`,
    `Date:     ${dateStr}`,
    `Time:     ${timeStr} ET`,
    `Location: ${locationLine}`,
    `Tickets:  ${ticketLine} · ${amountStr}`,
    "",
    "Keep this email for your records.",
    "",
    "— The BougieBams Team",
  ].join("\n");
}

export interface CancellationEmailOptions {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  quantity: number;
}

function buildCancellationHtml(opts: CancellationEmailOptions): string {
  const { firstName, eventTitle, eventDate, quantity } = opts;
  const dateStr = formatDate(eventDate);
  const ticketLine = quantity === 1 ? "1 ticket" : `${quantity} tickets`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Cancelled</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#6b7280;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#e5e7eb;text-transform:uppercase;">BougieBams</p>
              <h1 style="margin:8px 0 0;font-size:26px;font-weight:700;color:#ffffff;">Registration Cancelled</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;font-size:16px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
              <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.6;">
                Your registration for <strong>${eventTitle}</strong> has been cancelled. We're sorry to see you go!
              </p>

              <!-- Event details card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1f2937;">${eventTitle}</h2>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:28px;">
                          <span style="font-size:18px;">📅</span>
                        </td>
                        <td style="padding:6px 0 6px 8px;font-size:15px;color:#374151;">
                          ${dateStr}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:28px;">
                          <span style="font-size:18px;">🎟️</span>
                        </td>
                        <td style="padding:6px 0 6px 8px;font-size:15px;color:#374151;">
                          ${ticketLine} cancelled
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;line-height:1.6;">
                If this was a mistake or you have any questions, please reply to this email and we'll be happy to help.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} BougieBams. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCancellationText(opts: CancellationEmailOptions): string {
  const { firstName, eventTitle, eventDate, quantity } = opts;
  const dateStr = formatDate(eventDate);
  const ticketLine = quantity === 1 ? "1 ticket" : `${quantity} tickets`;

  return [
    `Hi ${firstName},`,
    "",
    `Your registration for "${eventTitle}" has been cancelled.`,
    "",
    "CANCELLATION DETAILS",
    "--------------------",
    `Event:   ${eventTitle}`,
    `Date:    ${dateStr}`,
    `Tickets: ${ticketLine} cancelled`,
    "",
    "If this was a mistake or you have questions, reply to this email and we'll help.",
    "",
    "— The BougieBams Team",
  ].join("\n");
}

export interface FeedbackSurveyEmailOptions {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  surveyUrl: string;
}

function buildFeedbackHtml(opts: FeedbackSurveyEmailOptions): string {
  const { firstName, eventTitle, eventDate, surveyUrl } = opts;
  const dateStr = formatDate(eventDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Feedback</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#181D37;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.1em;color:#C9A227;text-transform:uppercase;">BougieBams</p>
              <h1 style="margin:10px 0 0;font-size:26px;font-weight:700;color:#ffffff;">How was the event? ✨</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
              <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.7;">
                Thank you so much for joining us for <strong>${eventTitle}</strong> on ${dateStr}. We hope you had a wonderful time!
              </p>
              <p style="margin:0 0 28px;font-size:16px;color:#374151;line-height:1.7;">
                Your opinion helps us make every BougieBams experience better. It only takes a minute — we'd love to hear from you.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${surveyUrl}" style="display:inline-block;background:#C9A227;color:#181D37;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:8px;letter-spacing:0.02em;">
                      Share My Feedback
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-align:center;line-height:1.6;">
                Or copy this link into your browser:<br>
                <a href="${surveyUrl}" style="color:#C9A227;word-break:break-all;">${surveyUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} BougieBams. All rights reserved.</p>
              <p style="margin:4px 0 0;font-size:12px;color:#d1d5db;">This link is unique to you and can only be used once.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildFeedbackText(opts: FeedbackSurveyEmailOptions): string {
  const { firstName, eventTitle, eventDate, surveyUrl } = opts;
  const dateStr = formatDate(eventDate);

  return [
    `Hi ${firstName},`,
    "",
    `Thank you for joining us for "${eventTitle}" on ${dateStr}!`,
    "",
    "We'd love to hear your thoughts. It only takes a minute:",
    surveyUrl,
    "",
    "Your feedback helps us make every BougieBams event better.",
    "",
    "— The BougieBams Team",
  ].join("\n");
}

/**
 * Send a post-event feedback survey email via Resend.
 * Returns true on success, false on failure — never throws.
 */
export async function sendFeedbackSurvey(opts: FeedbackSurveyEmailOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "BougieBams <noreply@bougiebams.com>";

    const payload = {
      from: fromAddress,
      to: [opts.to],
      subject: `How was ${opts.eventTitle}? Share your thoughts ✨`,
      html: buildFeedbackHtml(opts),
      text: buildFeedbackText(opts),
    };

    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn({ status: response.status, body }, "Resend feedback survey email failed");
      return false;
    }

    logger.info({ to: opts.to, event: opts.eventTitle }, "Feedback survey email sent");
    return true;
  } catch (err) {
    logger.warn({ err }, "Could not send feedback survey email");
    return false;
  }
}

/**
 * Send a cancellation confirmation email via Resend.
 * Returns true only when Resend confirms delivery (2xx response).
 * Returns false on any network error or non-2xx response — never throws.
 */
export async function sendCancellationConfirmation(opts: CancellationEmailOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();

    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "BougieBams <noreply@bougiebams.com>";

    const payload = {
      from: fromAddress,
      to: [opts.to],
      subject: `Your registration for ${opts.eventTitle} has been cancelled`,
      html: buildCancellationHtml(opts),
      text: buildCancellationText(opts),
    };

    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn({ status: response.status, body }, "Resend cancellation email delivery failed");
      return false;
    }

    logger.info({ to: opts.to, event: opts.eventTitle }, "Cancellation confirmation email sent");
    return true;
  } catch (err) {
    logger.warn({ err }, "Could not send cancellation confirmation email");
    return false;
  }
}

/**
 * Send a registration confirmation email via Resend.
 * Returns true only when Resend confirms delivery (2xx response).
 * Returns false on any network error or non-2xx response — never throws.
 */
export async function sendRegistrationConfirmation(opts: ConfirmationEmailOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();

    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "BougieBams <noreply@bougiebams.com>";

    const payload = {
      from: fromAddress,
      to: [opts.to],
      subject: `You're registered for ${opts.eventTitle}!`,
      html: buildHtml(opts),
      text: buildText(opts),
    };

    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn({ status: response.status, body }, "Resend email delivery failed");
      return false;
    }

    logger.info({ to: opts.to, event: opts.eventTitle }, "Registration confirmation email sent");
    return true;
  } catch (err) {
    logger.warn({ err }, "Could not send registration confirmation email");
    return false;
  }
}
