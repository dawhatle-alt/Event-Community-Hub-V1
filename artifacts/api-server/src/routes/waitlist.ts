import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, waitlistTable, eventsTable } from "@workspace/db";
import { logger } from "../lib/logger";

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
  return res.status(201).json({ message: "Added to waitlist" });
});

router.get("/waitlist/:eventId", async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });

  const adminPassword = req.headers["x-admin-password"];
  if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const entries = await db.query.waitlistTable.findMany({
    where: eq(waitlistTable.eventId, eventId),
    orderBy: (w, { asc }) => [asc(w.createdAt)],
  });
  return res.json(entries);
});

export default router;
