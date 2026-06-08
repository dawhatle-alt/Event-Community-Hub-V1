import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, waitlistTable, eventsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAdminAuth } from "../middleware/adminAuth";
import { sendWaitlistConfirmation } from "../lib/email";

const router: IRouter = Router();

router.post("/waitlist", async (req, res) => {
  const { eventId, firstName, lastName, email, phone } = req.body ?? {};
  if (!eventId || !firstName || !lastName || !email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  const event = await db.query.eventsTable.findFirst({ where: eq(eventsTable.id, eventId) });
  if (!event) return res.status(404).json({ error: "Event not found" });

  const existing = await db.query.waitlistTable.findFirst({
    where: and(eq(waitlistTable.eventId, eventId), eq(waitlistTable.email, email.toLowerCase())),
  });
  if (existing) {
    return res.status(200).json({ message: "Already on waitlist" });
  }

  await db.insert(waitlistTable).values({
    eventId,
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone: phone || null,
  });

  logger.info({ eventId, email }, "Waitlist entry added");

  // Send confirmation email (non-blocking)
  sendWaitlistConfirmation({
    to: email.toLowerCase(),
    firstName,
    eventTitle: event.title,
    eventDate: new Date(event.date),
    eventEndDate: event.endDate ? new Date(event.endDate) : null,
    eventLocation: event.location,
    eventAddress: event.address ?? null,
  }).catch(() => {});

  return res.status(201).json({ message: "Added to waitlist" });
});

router.get("/waitlist/:eventId", requireAdminAuth, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

  const entries = await db.query.waitlistTable.findMany({
    where: eq(waitlistTable.eventId, eventId),
    orderBy: (w, { asc }) => [asc(w.createdAt)],
  });
  return res.json(entries);
});

router.delete("/waitlist/:id", requireAdminAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  await db.delete(waitlistTable).where(eq(waitlistTable.id, id));
  logger.info({ id }, "Waitlist entry removed by admin");
  return res.json({ message: "Removed" });
});

export default router;
