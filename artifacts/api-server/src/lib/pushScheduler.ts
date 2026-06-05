import { db, eventsTable, registrationsTable, pushTokensTable } from "@workspace/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
}

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    throw new Error(`Expo push API returned ${response.status}: ${await response.text()}`);
  }

  const result = (await response.json()) as { data: ExpoPushTicket[] };
  return result.data ?? [];
}

/**
 * Find all events happening tomorrow, look up all paid registrations for those events
 * that have a push token on record, and send day-before reminders.
 *
 * Returns the number of push notifications sent.
 */
export async function sendDayBeforeReminders(): Promise<number> {
  const now = new Date();

  // "Tomorrow" window: midnight-to-midnight in UTC
  const tomorrowStart = new Date(now);
  tomorrowStart.setUTCHours(0, 0, 0, 0);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setUTCDate(tomorrowEnd.getUTCDate() + 1);

  logger.info(
    { tomorrowStart: tomorrowStart.toISOString(), tomorrowEnd: tomorrowEnd.toISOString() },
    "Checking for events happening tomorrow"
  );

  // 1. Find published events happening tomorrow
  const tomorrowEvents = await db
    .select()
    .from(eventsTable)
    .where(
      and(
        eq(eventsTable.published, true),
        gte(eventsTable.date, tomorrowStart),
        lt(eventsTable.date, tomorrowEnd)
      )
    );

  if (tomorrowEvents.length === 0) {
    logger.info("No events happening tomorrow — skipping reminders");
    return 0;
  }

  logger.info({ eventCount: tomorrowEvents.length }, "Found events happening tomorrow");

  const eventIds = tomorrowEvents.map((e) => e.id);

  // 2. Find paid registrations for those events that belong to a logged-in user
  const paidRegistrations = await db
    .select()
    .from(registrationsTable)
    .where(
      and(
        inArray(registrationsTable.eventId, eventIds),
        eq(registrationsTable.status, "paid"),
        sql`${registrationsTable.userId} IS NOT NULL`
      )
    );

  if (paidRegistrations.length === 0) {
    logger.info("No paid registrations with user accounts for tomorrow's events");
    return 0;
  }

  const userIds = [...new Set(paidRegistrations.map((r) => r.userId).filter(Boolean))] as string[];

  // 3. Look up push tokens for those users
  const tokenRows = await db
    .select()
    .from(pushTokensTable)
    .where(inArray(pushTokensTable.userId, userIds));

  if (tokenRows.length === 0) {
    logger.info("No push tokens found for users registered for tomorrow's events");
    return 0;
  }

  const tokensByUserId = new Map(tokenRows.map((t) => [t.userId, t.token]));

  // 4. Build one message per (user, event) pair
  const eventById = new Map(tomorrowEvents.map((e) => [e.id, e]));
  const messages: ExpoPushMessage[] = [];

  for (const reg of paidRegistrations) {
    if (!reg.userId) continue;
    const token = tokensByUserId.get(reg.userId);
    if (!token) continue;
    const event = eventById.get(reg.eventId);
    if (!event) continue;

    const eventDate = new Date(event.date);
    const timeStr = eventDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    });

    messages.push({
      to: token,
      title: "Your event is tomorrow! ✨",
      body: `Don't forget — ${event.title} is tomorrow at ${timeStr} at ${event.location}`,
      data: { eventId: event.id, screen: "event" },
      sound: "default",
    });
  }

  if (messages.length === 0) {
    logger.info("No messages to send after token matching");
    return 0;
  }

  // 5. Send in batches of 100 (Expo limit)
  const BATCH_SIZE = 100;
  let successCount = 0;

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const tickets = await sendExpoPushNotifications(batch);
      const ok = tickets.filter((t) => t.status === "ok").length;
      const errors = tickets.filter((t) => t.status === "error");
      successCount += ok;

      if (errors.length > 0) {
        logger.warn({ errors }, "Some push notifications failed in batch");
      }
      logger.info({ batchStart: i, batchSize: batch.length, sent: ok }, "Push batch sent");
    } catch (err) {
      logger.error({ err, batchStart: i }, "Failed to send push notification batch");
    }
  }

  logger.info({ successCount, total: messages.length }, "Day-before push reminders complete");
  return successCount;
}

// --- Lightweight daily scheduler ---
// Runs the job once per day around 9:00 AM UTC.
// Uses a simple interval-based approach to avoid adding a cron dependency.

let lastRunDate: string | null = null;

function schedulerTick(): void {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const todayKey = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

  // Run once per day between 09:00 and 09:05 UTC
  if (utcHour === 9 && utcMinute < 5 && lastRunDate !== todayKey) {
    lastRunDate = todayKey;
    logger.info("Scheduler: triggering day-before push reminders");
    sendDayBeforeReminders().catch((err) => {
      logger.error({ err }, "Scheduler: error sending day-before reminders");
    });
  }
}

export function startPushReminderScheduler(): void {
  // Check every minute
  setInterval(schedulerTick, 60_000);
  logger.info("Push reminder scheduler started (daily at 09:00 UTC)");
}
