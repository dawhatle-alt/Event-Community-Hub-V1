import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, pushTokensTable } from "@workspace/db";
import { requireAdminAuth } from "../middleware/adminAuth";
import { logger } from "../lib/logger";
import { sendDayBeforeReminders } from "../lib/pushScheduler";

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
    // Upsert: if this token already exists for this user, update updatedAt;
    // if the token exists for a different user (device re-use), reassign it.
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

// Admin-only: manually trigger day-before reminders (for testing / backfill)
router.post("/notifications/send-reminders", requireAdminAuth, async (_req, res): Promise<void> => {
  try {
    const count = await sendDayBeforeReminders();
    res.json({ success: true, notificationsSent: count });
  } catch (err) {
    logger.error({ err }, "Failed to send reminders");
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

export default router;
