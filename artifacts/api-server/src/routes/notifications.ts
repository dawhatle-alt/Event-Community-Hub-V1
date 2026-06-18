import { Router, type IRouter } from "express";
import { eq, and, isNotNull, ne, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, pushTokensTable, registrationsTable, eventsTable } from "@workspace/db";
import { requireAdminAuth } from "../middleware/adminAuth";
import { logger } from "../lib/logger";
import { sendDayBeforeReminders, send48HourReminders, sendExpoPushNotifications } from "../lib/pushScheduler";

const router: IRouter = Router();

// Authenticated user: register or refresh their Expo push token
router.post("/notifications/push-token", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { token } = req.body;
  if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken[")) {
    res.status(400).json({ error: "Invalid or missing Expo push token" });
    return;
  }

  try {
    await db
      .insert(pushTokensTable)
      .values({ userId: req.user.id, token })
      .onConflictDoUpdate({
        target: pushTokensTable.token,
        set: { userId: req.user.id, updatedAt: new Date() },
      });

    logger.info({ userId: req.user.id }, "Push token registered");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to store push token");
    res.status(500).json({ error: "Failed to store push token" });
  }
});

// Authenticated user: remove their push token (e.g. on sign-out)
router.delete("/notifications/push-token", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { token } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  try {
    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.userId, req.user.id), eq(pushTokensTable.token, token)));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to remove push token");
    res.status(500).json({ error: "Failed to remove push token" });
  }
});

// Admin-only: send a custom push notification blast to all paid registrants of a specific event
router.post("/notifications/blast/:eventId", requireAdminAuth, async (req, res): Promise<void> => {
  const eventId = Number(req.params.eventId);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event ID" });
    return;
  }

  const { title, body } = req.body;
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    res.status(400).json({ error: "body is required" });
    return;
  }

  try {
    // 1. Verify the event exists
    const [event] = await db
      .select({ id: eventsTable.id, title: eventsTable.title })
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId))
      .limit(1);

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // 2. Find paid registrants for this event who have a user account
    const paidRegistrations = await db
      .select({ userId: registrationsTable.userId })
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.eventId, eventId),
          eq(registrationsTable.status, "paid"),
          sql`${registrationsTable.userId} IS NOT NULL`
        )
      );

    if (paidRegistrations.length === 0) {
      res.json({ success: true, sent: 0, message: "No paid registrants with accounts for this event" });
      return;
    }

    const userIds = [...new Set(paidRegistrations.map((r) => r.userId).filter(Boolean))] as string[];

    // 3. Look up push tokens for those users
    const tokenRows = await db
      .select()
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.userId, userIds));

    if (tokenRows.length === 0) {
      res.json({ success: true, sent: 0, message: "No push tokens found for registrants" });
      return;
    }

    // 4. Build messages
    const messages = tokenRows.map((t) => ({
      to: t.token,
      title: title.trim(),
      body: body.trim(),
      data: { eventId, screen: "event" },
      sound: "default" as const,
    }));

    // 5. Send in batches of 100
    const BATCH_SIZE = 100;
    let successCount = 0;
    const staleTokens: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      try {
        const tickets = await sendExpoPushNotifications(batch);
        successCount += tickets.filter((t) => t.status === "ok").length;
        for (let j = 0; j < tickets.length; j++) {
          const ticket = tickets[j];
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
            staleTokens.push(batch[j].to);
          }
        }
      } catch (err) {
        logger.error({ err, batchStart: i }, "Blast: failed to send push notification batch");
      }
    }

    // 6. Prune stale tokens
    if (staleTokens.length > 0) {
      await db.delete(pushTokensTable).where(inArray(pushTokensTable.token, staleTokens)).catch((err) => {
        logger.error({ err }, "Blast: failed to prune stale tokens");
      });
    }

    logger.info({ eventId, title, successCount, total: messages.length }, "Push blast sent");
    res.json({ success: true, sent: successCount, total: messages.length });
  } catch (err) {
    logger.error({ err }, "Failed to send push blast");
    res.status(500).json({ error: "Failed to send push blast" });
  }
});

// Admin-only: manually trigger day-before push reminders (for testing / backfill)
router.post("/notifications/send-reminders", requireAdminAuth, async (_req, res): Promise<void> => {
  try {
    const count = await sendDayBeforeReminders();
    res.json({ success: true, notificationsSent: count });
  } catch (err) {
    logger.error({ err }, "Failed to send reminders");
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

// Admin-only: manually trigger 48-hour email reminders (for testing / re-sending to new registrants)
router.post("/notifications/send-48h-reminders", requireAdminAuth, async (_req, res): Promise<void> => {
  try {
    const count = await send48HourReminders();
    res.json({ success: true, emailsSent: count });
  } catch (err) {
    logger.error({ err }, "Failed to send 48-hour reminder emails");
    res.status(500).json({ error: "Failed to send 48-hour reminder emails" });
  }
});

// Authenticated user: get all server-stored reminder records (for rehydration after reinstall)
router.get("/registrations/my/reminders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const rows = await db
      .select({ r: registrationsTable, e: eventsTable })
      .from(registrationsTable)
      .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
      .where(
        and(
          eq(registrationsTable.userId, req.user.id),
          isNotNull(registrationsTable.reminderIdentifier),
          ne(registrationsTable.status, "cancelled")
        )
      );

    res.json(
      rows.map(({ r, e }) => ({
        registrationId: r.id,
        eventId: e.id,
        eventTitle: e.title,
        eventDate: e.date,
        eventLocation: e.location,
        notificationIdentifier: r.reminderIdentifier,
        reminderLabel: r.reminderLabel ?? null,
        scheduledAt: r.reminderScheduledAt ? r.reminderScheduledAt.toISOString() : null,
      }))
    );
  } catch (err) {
    logger.error({ err }, "Failed to fetch reminder records");
    res.status(500).json({ error: "Failed to fetch reminder records" });
  }
});

// Authenticated user: save or update a reminder identifier for one of their registrations
router.put("/registrations/my/:id/reminder", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid registration id" });
    return;
  }

  const { notificationIdentifier, reminderLabel, scheduledAt } = req.body;
  if (!notificationIdentifier || typeof notificationIdentifier !== "string") {
    res.status(400).json({ error: "notificationIdentifier is required" });
    return;
  }

  try {
    const [reg] = await db
      .select({ userId: registrationsTable.userId })
      .from(registrationsTable)
      .where(eq(registrationsTable.id, id))
      .limit(1);

    if (!reg) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    if (reg.userId !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .update(registrationsTable)
      .set({
        reminderIdentifier: notificationIdentifier,
        reminderLabel: reminderLabel ?? null,
        reminderScheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      })
      .where(eq(registrationsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to save reminder");
    res.status(500).json({ error: "Failed to save reminder" });
  }
});

// Authenticated user: clear the reminder identifier for one of their registrations
router.delete("/registrations/my/:id/reminder", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid registration id" });
    return;
  }

  try {
    const [reg] = await db
      .select({ userId: registrationsTable.userId })
      .from(registrationsTable)
      .where(eq(registrationsTable.id, id))
      .limit(1);

    if (!reg) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    if (reg.userId !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .update(registrationsTable)
      .set({ reminderIdentifier: null, reminderLabel: null, reminderScheduledAt: null })
      .where(eq(registrationsTable.id, id));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to clear reminder");
    res.status(500).json({ error: "Failed to clear reminder" });
  }
});

export default router;
