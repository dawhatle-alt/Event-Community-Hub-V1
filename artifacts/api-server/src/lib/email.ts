import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "./logger";

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs(opts: ConfirmationEmailOptions): string {
  const dtstart = toIcsDate(opts.eventDate);
  const dtend = opts.eventEndDate
    ? toIcsDate(opts.eventEndDate)
    : toIcsDate(new Date(opts.eventDate.getTime() + 2 * 60 * 60 * 1000));
  const location = opts.eventAddress
    ? `${opts.eventLocation}, ${opts.eventAddress}`
    : opts.eventLocation;
  const uid = `${opts.eventDate.getTime()}-${opts.to.replace(/[^a-z0-9]/gi, "")}@bougiebams.com`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bougie Bams//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${opts.eventTitle}`,
    `LOCATION:${location}`,
    `DESCRIPTION:You're registered for ${opts.eventTitle}!`,
    `UID:${uid}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

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
    timeZone: "America/Chicago",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
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

  const gcalLocation = encodeURIComponent(eventAddress ? `${eventLocation}, ${eventAddress}` : eventLocation);
  const gcalTitle = encodeURIComponent(eventTitle);
  const gcalDetails = encodeURIComponent(`You're registered for ${eventTitle}!`);
  const gcalStart = toIcsDate(eventDate);
  const gcalEnd = eventEndDate
    ? toIcsDate(eventEndDate)
    : toIcsDate(new Date(eventDate.getTime() + 2 * 60 * 60 * 1000));
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${gcalStart}/${gcalEnd}&details=${gcalDetails}&location=${gcalLocation}`;

  const outlookStart = eventDate.toISOString();
  const outlookEnd = (eventEndDate ?? new Date(eventDate.getTime() + 2 * 60 * 60 * 1000)).toISOString();
  const outlookUrl = `https://outlook.live.com/calendar/0/action/compose?subject=${gcalTitle}&startdt=${encodeURIComponent(outlookStart)}&enddt=${encodeURIComponent(outlookEnd)}&body=${gcalDetails}&location=${gcalLocation}`;

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
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#e9d5ff;text-transform:uppercase;">Bougie Bams</p>
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
                          ${timeStr} CT
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

              <!-- Add to Calendar buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td align="center" style="padding-bottom:12px;">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;">Add to your calendar</p>
                    <a href="${gcalUrl}" target="_blank" style="display:inline-block;background:#4285F4;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px;margin:0 6px;">
                      Google Calendar
                    </a>
                    <a href="${outlookUrl}" target="_blank" style="display:inline-block;background:#0078D4;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:8px;margin:0 6px;">
                      Outlook (web)
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">Apple Calendar or Outlook desktop? Open the <strong>event.ics</strong> attachment.</p>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 24px;"/>

              <p style="margin:0 0 8px;font-size:15px;color:#6b7280;line-height:1.6;">
                Keep this email for your records. If you have any questions, reply to this email and we'll be happy to help.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} Bougie Bams. All rights reserved.</p>
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
    `Time:     ${timeStr} CT`,
    `Location: ${locationLine}`,
    `Tickets:  ${ticketLine} · ${amountStr}`,
    "",
    "Keep this email for your records.",
    "",
    "— The Bougie Bams Team",
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
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:#e5e7eb;text-transform:uppercase;">Bougie Bams</p>
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
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} Bougie Bams. All rights reserved.</p>
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
    "— The Bougie Bams Team",
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
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.1em;color:#C9A227;text-transform:uppercase;">Bougie Bams</p>
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
                Your opinion helps us make every Bougie Bams experience better. It only takes a minute — we'd love to hear from you.
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
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} Bougie Bams. All rights reserved.</p>
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
    "Your feedback helps us make every Bougie Bams event better.",
    "",
    "— The Bougie Bams Team",
  ].join("\n");
}

export interface CancelLinksEmailOptions {
  to: string;
  firstName: string;
  registrations: Array<{
    eventTitle: string;
    eventDate: Date;
    quantity: number;
    totalAmount: number;
    cancelUrl: string;
  }>;
}

function buildCancelLinksHtml(opts: CancelLinksEmailOptions): string {
  const { firstName, registrations } = opts;

  const regRows = registrations.map(({ eventTitle, eventDate, quantity, totalAmount, cancelUrl }) => {
    const dateStr = formatDate(eventDate);
    const ticketLine = quantity === 1 ? "1 ticket" : `${quantity} tickets`;
    const amountLine = totalAmount > 0 ? ` · $${totalAmount.toFixed(2)}` : " · Free";
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
        <tr>
          <td style="padding:20px 24px;">
            <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:#1f2937;">${eventTitle}</h3>
            <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">📅 ${dateStr}</p>
            <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">🎟️ ${ticketLine}${amountLine}</p>
            <a href="${cancelUrl}" style="display:inline-block;background:#dc2626;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:6px;">
              Cancel This Registration
            </a>
          </td>
        </tr>
      </table>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancel Your Registration</title>
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#181D37;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.1em;color:#C9A227;text-transform:uppercase;">Bougie Bams</p>
              <h1 style="margin:10px 0 0;font-size:26px;font-weight:700;color:#ffffff;">Cancel Your Registration</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:16px;color:#374151;">Hi <strong>${firstName}</strong>,</p>
              <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
                We received a cancellation request for your email address. Click the button below for the registration you'd like to cancel. Each link is secure and expires in 7 days.
              </p>
              ${regRows}
              <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                If you didn't request this, you can safely ignore this email. Your registrations will not be affected.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9ca3af;">© ${new Date().getFullYear()} Bougie Bams. All rights reserved.</p>
              <p style="margin:4px 0 0;font-size:12px;color:#d1d5db;">These links are unique to you and expire after 7 days.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildCancelLinksText(opts: CancelLinksEmailOptions): string {
  const { firstName, registrations } = opts;
  const lines = [
    `Hi ${firstName},`,
    "",
    "We received a cancellation request for your email. Use the links below to cancel specific registrations.",
    "Each link expires in 7 days.",
    "",
  ];
  for (const { eventTitle, eventDate, quantity, totalAmount, cancelUrl } of registrations) {
    const dateStr = formatDate(eventDate);
    const ticketLine = quantity === 1 ? "1 ticket" : `${quantity} tickets`;
    const amountLine = totalAmount > 0 ? ` · $${totalAmount.toFixed(2)}` : "";
    lines.push(`${eventTitle}`);
    lines.push(`  ${dateStr} · ${ticketLine}${amountLine}`);
    lines.push(`  Cancel: ${cancelUrl}`);
    lines.push("");
  }
  lines.push("If you didn't request this, ignore this email — nothing will change.");
  lines.push("");
  lines.push("— The Bougie Bams Team");
  return lines.join("\n");
}

/**
 * Send an email with per-registration cancellation links.
 * Returns true on success, false on failure — never throws.
 */
export async function sendCancelLinksEmail(opts: CancelLinksEmailOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Bougie Bams <noreply@bougiebams.com>";
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({
        from: fromAddress,
        to: [opts.to],
        subject: "Your Bougie Bams cancellation links",
        html: buildCancelLinksHtml(opts),
        text: buildCancelLinksText(opts),
      }),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "Cancel links email delivery failed");
      return false;
    }
    logger.info({ to: opts.to, count: opts.registrations.length }, "Cancel links email sent");
    return true;
  } catch (err) {
    logger.warn({ err }, "Could not send cancel links email");
    return false;
  }
}

/**
 * Send a post-event feedback survey email via Resend.
 * Returns true on success, false on failure — never throws.
 */
export async function sendFeedbackSurvey(opts: FeedbackSurveyEmailOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Bougie Bams <noreply@bougiebams.com>";

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

    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Bougie Bams <noreply@bougiebams.com>";

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

export interface WaitlistConfirmationOptions {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  eventEndDate?: Date | null;
  eventLocation: string;
  eventAddress?: string | null;
  unsubscribeUrl?: string;
}

function buildWaitlistConfirmationHtml(opts: WaitlistConfirmationOptions): string {
  const { firstName, eventTitle, eventDate, eventEndDate, eventLocation, eventAddress, unsubscribeUrl } = opts;
  const dateStr = formatDate(eventDate);
  const startTime = formatTime(eventDate);
  const timeStr = eventEndDate ? `${startTime} – ${formatTime(eventEndDate)} CT` : `${startTime} CT`;
  const locationBlock = eventAddress
    ? `${eventLocation}<br><span style="color:#6b7280">${eventAddress}</span>`
    : eventLocation;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9f6f1;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
<tr><td style="background:#C9A227;padding:6px 0"></td></tr>
<tr><td style="padding:40px 40px 32px;text-align:center">
  <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#9B8060;text-transform:uppercase">Bougie Bams</p>
  <h1 style="margin:0 0 24px;font-size:26px;color:#181D37;font-weight:normal">You're on the Waitlist!</h1>
  <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6">Hi ${firstName},<br><br>
  You've been added to the waitlist for <strong>${eventTitle}</strong>. We'll send you an email the moment a spot opens up — spots are offered first-come, first-served.</p>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;background:#f9f6f1;border-radius:12px;width:100%">
    <tr><td style="padding:20px 24px">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-family:Arial,sans-serif">📅 ${dateStr}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-family:Arial,sans-serif">🕐 ${timeStr}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;font-family:Arial,sans-serif">📍 ${locationBlock}</p>
    </td></tr>
  </table>
  <p style="margin:0;font-size:13px;color:#9ca3af;font-family:Arial,sans-serif">Keep an eye on your inbox — we'll reach out as soon as a seat becomes available.</p>
  ${unsubscribeUrl ? `<p style="margin:20px 0 0;font-size:11px;color:#d1d5db;font-family:Arial,sans-serif">Changed your mind? <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Remove me from this event's waitlist</a></p>` : ""}
</td></tr>
<tr><td style="background:#C9A227;padding:6px 0"></td></tr>
</table></td></tr></table></body></html>`;
}

function buildWaitlistConfirmationText(opts: WaitlistConfirmationOptions): string {
  const { firstName, eventTitle, eventDate, eventEndDate, eventLocation, eventAddress, unsubscribeUrl } = opts;
  const dateStr = formatDate(eventDate);
  const startTime = formatTime(eventDate);
  const timeStr = eventEndDate ? `${startTime} – ${formatTime(eventEndDate)} CT` : `${startTime} CT`;
  return [
    `Hi ${firstName},`,
    "",
    `You've been added to the waitlist for ${eventTitle}. We'll email you the moment a spot opens up.`,
    "",
    `Date: ${dateStr}`,
    `Time: ${timeStr}`,
    `Location: ${eventLocation}${eventAddress ? `, ${eventAddress}` : ""}`,
    "",
    "Spots are offered first-come, first-served — keep an eye on your inbox.",
    "— Bougie Bams",
    ...(unsubscribeUrl ? ["", `Remove me from the waitlist: ${unsubscribeUrl}`] : []),
  ].join("\n");
}

/**
 * Send a waitlist join confirmation email via Resend.
 * Returns true on success, false on any error — never throws.
 */
export async function sendWaitlistConfirmation(opts: WaitlistConfirmationOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Bougie Bams <noreply@bougiebams.com>";
    const payload = {
      from: fromAddress,
      to: [opts.to],
      subject: `You're on the waitlist for ${opts.eventTitle}`,
      html: buildWaitlistConfirmationHtml(opts),
      text: buildWaitlistConfirmationText(opts),
    };
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.warn({ status: response.status, body }, "Resend waitlist confirmation failed");
      return false;
    }
    logger.info({ to: opts.to, event: opts.eventTitle }, "Waitlist confirmation email sent");
    return true;
  } catch (err) {
    logger.warn({ err }, "Could not send waitlist confirmation email");
    return false;
  }
}

export interface WaitlistNotificationOptions {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  eventEndDate?: Date | null;
  eventLocation: string;
  eventAddress?: string | null;
  eventUrl: string;
}

function buildWaitlistHtml(opts: WaitlistNotificationOptions): string {
  const { firstName, eventTitle, eventDate, eventEndDate, eventLocation, eventAddress, eventUrl } = opts;
  const dateStr = formatDate(eventDate);
  const startTime = formatTime(eventDate);
  const timeStr = eventEndDate ? `${startTime} – ${formatTime(eventEndDate)} CT` : `${startTime} CT`;
  const locationBlock = eventAddress
    ? `${eventLocation}<br><span style="color:#6b7280">${eventAddress}</span>`
    : eventLocation;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9f6f1;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)">
<tr><td style="background:#C9A227;padding:6px 0"></td></tr>
<tr><td style="padding:40px 40px 32px;text-align:center">
  <p style="margin:0 0 8px;font-size:13px;letter-spacing:3px;color:#9B8060;text-transform:uppercase">Bougie Bams</p>
  <h1 style="margin:0 0 24px;font-size:26px;color:#181D37;font-weight:normal">A Spot Just Opened Up!</h1>
  <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6">Hi ${firstName},<br><br>
  Good news — a spot has opened up for <strong>${eventTitle}</strong> and you're next on the waitlist.
  Register now before it fills up again!</p>
  <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;background:#f9f6f1;border-radius:12px;width:100%">
    <tr><td style="padding:20px 24px">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-family:Arial,sans-serif">📅 ${dateStr}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-family:Arial,sans-serif">🕐 ${timeStr}</p>
      <p style="margin:0;font-size:13px;color:#6b7280;font-family:Arial,sans-serif">📍 ${locationBlock}</p>
    </td></tr>
  </table>
  <a href="${eventUrl}" style="display:inline-block;background:#C9A227;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:16px;font-family:Arial,sans-serif;font-weight:600">Claim Your Spot</a>
  <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif">Spots are first-come, first-served. This notification was sent to you because you joined the waitlist.</p>
</td></tr>
<tr><td style="background:#C9A227;padding:6px 0"></td></tr>
</table></td></tr></table></body></html>`;
}

function buildWaitlistText(opts: WaitlistNotificationOptions): string {
  const { firstName, eventTitle, eventDate, eventEndDate, eventLocation, eventAddress, eventUrl } = opts;
  const dateStr = formatDate(eventDate);
  const startTime = formatTime(eventDate);
  const timeStr = eventEndDate ? `${startTime} – ${formatTime(eventEndDate)} CT` : `${startTime} CT`;
  return [
    `Hi ${firstName},`,
    "",
    `Good news — a spot has opened up for ${eventTitle} and you're next on the waitlist.`,
    "",
    `Date: ${dateStr}`,
    `Time: ${timeStr}`,
    `Location: ${eventLocation}${eventAddress ? `, ${eventAddress}` : ""}`,
    "",
    `Register now: ${eventUrl}`,
    "",
    "Spots are first-come, first-served.",
    "— Bougie Bams",
  ].join("\n");
}

/**
 * Send a waitlist spot-available notification email via Resend.
 * Returns true on success, false on any error — never throws.
 */
export async function sendWaitlistNotification(opts: WaitlistNotificationOptions): Promise<boolean> {
  try {
    const connectors = new ReplitConnectors();
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Bougie Bams <noreply@bougiebams.com>";
    const payload = {
      from: fromAddress,
      to: [opts.to],
      subject: `A spot opened up for ${opts.eventTitle} — claim it now!`,
      html: buildWaitlistHtml(opts),
      text: buildWaitlistText(opts),
    };
    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text();
      logger.warn({ status: response.status, body }, "Resend waitlist notification failed");
      return false;
    }
    logger.info({ to: opts.to, event: opts.eventTitle }, "Waitlist notification email sent");
    return true;
  } catch (err) {
    logger.warn({ err }, "Could not send waitlist notification email");
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

    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Bougie Bams <noreply@bougiebams.com>";

    const icsContent = buildIcs(opts);
    const icsBase64 = Buffer.from(icsContent).toString("base64");

    const payload = {
      from: fromAddress,
      to: [opts.to],
      subject: `You're registered for ${opts.eventTitle}!`,
      html: buildHtml(opts),
      text: buildText(opts),
      attachments: [
        {
          filename: "event.ics",
          content: icsBase64,
          content_type: "text/calendar; method=PUBLISH",
        },
      ],
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
