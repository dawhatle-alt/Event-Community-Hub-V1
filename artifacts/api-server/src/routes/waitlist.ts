import { Router, type IRouter } from "express";
import { eq, and, count, lte, sql } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";
import { db, waitlistTable, eventsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAdminAuth } from "../middleware/adminAuth";
import { sendWaitlistConfirmation } from "../lib/email";

const router: IRouter = Router();

function makeUnsubscribeToken(id: number): string {
  const secret = process.env.CANCEL_TOKEN_SECRET ?? "dev-secret";
  return createHmac("sha256", secret).update(`wl-unsub:${id}`).digest("hex");
}

function verifyUnsubscribeToken(id: number, token: string): boolean {
  try {
    const expected = makeUnsubscribeToken(id);
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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

  const [inserted] = await db.insert(waitlistTable).values({
    eventId,
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone: phone || null,
  }).returning({ id: waitlistTable.id, createdAt: waitlistTable.createdAt });

  // Count un-notified entries inserted at or before this one (1-based position)
  const [{ position }] = await db
    .select({ position: count() })
    .from(waitlistTable)
    .where(
      and(
        eq(waitlistTable.eventId, eventId),
        eq(waitlistTable.notified, false),
        lte(waitlistTable.createdAt, inserted.createdAt ?? sql`now()`)
      )
    );

  logger.info({ eventId, email, position }, "Waitlist entry added");

  // Build unsubscribe URL with signed token
  const domain = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://bougiebams.com";
  const unsubscribeUrl = `${domain}/api/waitlist/unsubscribe?id=${inserted.id}&token=${makeUnsubscribeToken(inserted.id)}`;

  // Send confirmation email (non-blocking)
  sendWaitlistConfirmation({
    to: email.toLowerCase(),
    firstName,
    eventTitle: event.title,
    eventDate: new Date(event.date),
    eventEndDate: event.endDate ? new Date(event.endDate) : null,
    eventLocation: event.location,
    eventAddress: event.address ?? null,
    unsubscribeUrl,
  }).catch(() => {});

  return res.status(201).json({ message: "Added to waitlist", position: Number(position) });
});

router.get("/waitlist/:eventId/count", requireAdminAuth, async (req, res) => {
  const eventId = parseInt(req.params.eventId, 10);
  if (isNaN(eventId)) return res.status(400).json({ error: "Invalid event ID" });
  const [{ total }] = await db
    .select({ total: count() })
    .from(waitlistTable)
    .where(eq(waitlistTable.eventId, eventId));
  return res.json({ count: Number(total) });
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

// Public: unsubscribe from waitlist via signed token link (from email)
router.get("/waitlist/unsubscribe", async (req, res) => {
  const id = parseInt(req.query.id as string, 10);
  const token = (req.query.token as string) ?? "";

  const invalid = () =>
    res.status(400).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invalid Link</title></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)">
<p style="font-size:13px;letter-spacing:3px;color:#9B8060;text-transform:uppercase;margin:0 0 16px">Bougie Bams</p>
<h1 style="font-size:22px;color:#181D37;font-weight:normal;margin:0 0 12px">Invalid or Expired Link</h1>
<p style="color:#6b7280;font-size:15px;margin:0">This unsubscribe link is no longer valid. Please contact us if you need help.</p>
</div></body></html>`);

  if (isNaN(id) || !token) return invalid();
  if (!verifyUnsubscribeToken(id, token)) return invalid();

  const [entry] = await db.select().from(waitlistTable).where(eq(waitlistTable.id, id)).limit(1);
  if (!entry) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Already Removed</title></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)">
<p style="font-size:13px;letter-spacing:3px;color:#9B8060;text-transform:uppercase;margin:0 0 16px">Bougie Bams</p>
<h1 style="font-size:22px;color:#181D37;font-weight:normal;margin:0 0 12px">Already Removed</h1>
<p style="color:#6b7280;font-size:15px;margin:0">You're no longer on the waitlist.</p>
</div></body></html>`);
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, entry.eventId)).limit(1);
  await db.delete(waitlistTable).where(eq(waitlistTable.id, id));
  logger.info({ id, email: entry.email }, "Waitlist entry removed via unsubscribe link");

  return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Removed from Waitlist</title></head>
<body style="font-family:Georgia,serif;background:#f9f6f1;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<div style="background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.06)">
<div style="background:#C9A227;height:6px;border-radius:6px 6px 0 0;margin:-48px -40px 40px"></div>
<p style="font-size:13px;letter-spacing:3px;color:#9B8060;text-transform:uppercase;margin:0 0 16px">Bougie Bams</p>
<h1 style="font-size:24px;color:#181D37;font-weight:normal;margin:0 0 12px">You've been removed</h1>
<p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0">You've been removed from the waitlist${event ? ` for <strong style="color:#374151">${event.title}</strong>` : ""}. You'll still hear from us about future Bougie Bams events — we hope to see you soon!</p>
</div></body></html>`);
});

router.delete("/waitlist/:id", requireAdminAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  await db.delete(waitlistTable).where(eq(waitlistTable.id, id));
  logger.info({ id }, "Waitlist entry removed by admin");
  return res.json({ message: "Removed" });
});

export default router;
