import { eq, and, sql } from "drizzle-orm";
import { db, eventsTable, waitlistTable } from "@workspace/db";
import { sendWaitlistNotification } from "./email";
import { logger } from "./logger";

/**
 * Notify up to `count` un-notified waitlist entries for the given event,
 * in oldest-first order. Marks each entry as notified after a successful send.
 * Non-blocking-safe — catches all errors internally.
 */
export async function notifyWaitlistSpots(eventId: number, count: number): Promise<void> {
  if (count <= 0) return;
  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!event) return;

    const entries = await db
      .select()
      .from(waitlistTable)
      .where(and(eq(waitlistTable.eventId, eventId), eq(waitlistTable.notified, false)))
      .orderBy(sql`${waitlistTable.createdAt} ASC`)
      .limit(count);

    if (entries.length === 0) return;

    const domain = process.env.APP_URL ?? "https://bougiebams.com";
    const eventUrl = `${domain}/events/${eventId}`;

    for (const entry of entries) {
      const sent = await sendWaitlistNotification({
        to: entry.email,
        firstName: entry.firstName,
        eventTitle: event.title,
        eventDate: new Date(event.date),
        eventEndDate: event.endDate ? new Date(event.endDate) : null,
        eventLocation: event.location,
        eventAddress: event.address ?? null,
        eventUrl,
      });
      if (sent) {
        await db.update(waitlistTable).set({ notified: true }).where(eq(waitlistTable.id, entry.id));
        logger.info({ waitlistId: entry.id, email: entry.email, eventId }, "Waitlist notification sent");
      }
    }
  } catch (err) {
    logger.warn({ err, eventId }, "Could not send waitlist notifications");
  }
}
