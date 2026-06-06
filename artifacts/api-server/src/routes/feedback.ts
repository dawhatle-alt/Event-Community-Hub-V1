import { Router, type IRouter } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { db, eventsTable, registrationsTable, feedbackResponsesTable } from "@workspace/db";
import { requireAdminAuth } from "../middleware/adminAuth";
import { sendFeedbackSurvey } from "../lib/email";
import { randomUUID } from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Admin: send feedback survey emails to all paid registrants of a past event
router.post("/admin/events/:id/send-feedback", requireAdminAuth, async (req, res): Promise<void> => {
  const eventId = Number(req.params.id);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  if (new Date(event.date) > new Date()) {
    res.status(400).json({ error: "Cannot send feedback survey for a future event" });
    return;
  }

  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost";

  const allPaidRegs = await db
    .select()
    .from(registrationsTable)
    .where(and(eq(registrationsTable.eventId, eventId), eq(registrationsTable.status, "paid")));

  // Only send to attendees who haven't received a survey yet
  const pendingRegs = allPaidRegs.filter((r) => r.feedbackSentAt === null);
  const alreadySent = allPaidRegs.length - pendingRegs.length;

  let sent = 0;
  let skipped = alreadySent;

  for (const reg of pendingRegs) {
    let token = reg.feedbackToken;

    if (!token) {
      token = randomUUID();
      await db
        .update(registrationsTable)
        .set({ feedbackToken: token })
        .where(eq(registrationsTable.id, reg.id));
    }

    const surveyUrl = `${baseUrl}/feedback/${token}`;

    const ok = await sendFeedbackSurvey({
      to: reg.email,
      firstName: reg.firstName,
      eventTitle: event.title,
      eventDate: event.date,
      surveyUrl,
    });

    if (ok) {
      await db
        .update(registrationsTable)
        .set({ feedbackSentAt: new Date() })
        .where(eq(registrationsTable.id, reg.id));
      sent++;
    } else {
      skipped++;
      logger.warn({ regId: reg.id }, "Failed to send feedback survey email");
    }
  }

  res.json({ sent, skipped, total: allPaidRegs.length });
});

// Public: look up a survey token — returns event info and whether already submitted
router.get("/feedback/:token", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.feedbackToken, token))
    .limit(1);

  if (!reg) {
    res.status(404).json({ error: "Survey link not found or expired" });
    return;
  }

  const [existing] = await db
    .select()
    .from(feedbackResponsesTable)
    .where(eq(feedbackResponsesTable.registrationId, reg.id))
    .limit(1);

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, reg.eventId));

  res.json({
    eventTitle: event?.title ?? "Event",
    eventDate: event?.date ?? null,
    firstName: reg.firstName,
    alreadySubmitted: !!existing,
  });
});

// Public: submit feedback for a token
router.post("/feedback/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  const { rating, comments } = req.body as { rating?: unknown; comments?: unknown };

  if (typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    return;
  }

  const [reg] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.feedbackToken, token))
    .limit(1);

  if (!reg) {
    res.status(404).json({ error: "Survey link not found or expired" });
    return;
  }

  const [existing] = await db
    .select()
    .from(feedbackResponsesTable)
    .where(eq(feedbackResponsesTable.registrationId, reg.id))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Feedback already submitted for this link" });
    return;
  }

  await db.insert(feedbackResponsesTable).values({
    registrationId: reg.id,
    eventId: reg.eventId,
    rating,
    comments: typeof comments === "string" ? comments.trim() || null : null,
  });

  logger.info({ regId: reg.id, rating }, "Feedback submitted");
  res.json({ success: true });
});

// Admin: get all feedback responses for an event
router.get("/admin/events/:id/feedback", requireAdminAuth, async (req, res): Promise<void> => {
  const eventId = Number(req.params.id);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const responses = await db
    .select({
      id: feedbackResponsesTable.id,
      rating: feedbackResponsesTable.rating,
      comments: feedbackResponsesTable.comments,
      submittedAt: feedbackResponsesTable.submittedAt,
      firstName: registrationsTable.firstName,
      lastName: registrationsTable.lastName,
    })
    .from(feedbackResponsesTable)
    .leftJoin(registrationsTable, eq(feedbackResponsesTable.registrationId, registrationsTable.id))
    .where(eq(feedbackResponsesTable.eventId, eventId))
    .orderBy(feedbackResponsesTable.submittedAt);

  res.json(responses);
});

export default router;
