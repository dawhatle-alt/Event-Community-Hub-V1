import { Router, type IRouter } from "express";
import { eq, count, sum, sql } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import {
  ListEventRegistrationsParams,
  CreateCheckoutSessionBody,
  GetRegistrationBySessionQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAdminAuth } from "../middleware/adminAuth";

const router: IRouter = Router();

// Admin-only: list registrations for an event
router.get("/events/:id/registrations", requireAdminAuth, async (req, res): Promise<void> => {
  const params = ListEventRegistrationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const regs = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.eventId, params.data.id))
    .orderBy(registrationsTable.createdAt);

  res.json(regs.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })));
});

router.post("/registrations/checkout", async (req, res): Promise<void> => {
  const parsed = CreateCheckoutSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { eventId, firstName, lastName, email, phone, quantity = 1 } = parsed.data;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  // Server-side capacity enforcement: prevent overbooking
  const spotsAvailable = event.spotsRemaining ?? event.capacity;
  if (spotsAvailable < quantity) {
    res.status(400).json({ error: `Only ${spotsAvailable} spot(s) remaining for this event.` });
    return;
  }

  const totalAmount = Number(event.price) * quantity;

  // If Stripe is connected, use it; otherwise create a mock registration
  try {
    const { getUncachableStripeClient } = await import("../lib/stripeClient");
    const stripe = await getUncachableStripeClient();

    const priceId = event.stripePriceId;
    const lineItems = priceId
      ? [{ price: priceId, quantity }]
      : [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(Number(event.price) * 100),
              product_data: { name: event.title },
            },
            quantity,
          },
        ];

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost";

    const [registration] = await db
      .insert(registrationsTable)
      .values({
        eventId,
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        quantity,
        totalAmount: String(totalAmount),
        status: "pending",
      })
      .returning();

    // Decrement spots_remaining
    await db
      .update(eventsTable)
      .set({ spotsRemaining: sql`GREATEST(0, COALESCE(${eventsTable.spotsRemaining}, ${eventsTable.capacity}) - ${quantity})` })
      .where(eq(eventsTable.id, eventId));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}/events/confirmation?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events/${eventId}`,
      customer_email: email,
      metadata: {
        registrationId: String(registration.id),
        eventId: String(eventId),
      },
    });

    await db
      .update(registrationsTable)
      .set({ stripeSessionId: session.id })
      .where(eq(registrationsTable.id, registration.id));

    res.json({ url: session.url!, sessionId: session.id });
  } catch (err: any) {
    if (
      err?.message?.includes("integration not connected") ||
      err?.message?.includes("Missing Replit environment")
    ) {
      logger.warn("Stripe not connected — creating mock registration");

      const sessionId = `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await db
        .insert(registrationsTable)
        .values({
          eventId,
          firstName,
          lastName,
          email,
          phone: phone ?? null,
          quantity,
          totalAmount: String(totalAmount),
          stripeSessionId: sessionId,
          status: event.price === "0" || Number(event.price) === 0 ? "paid" : "pending",
        })
        .returning();

      // Decrement spots_remaining
      await db
        .update(eventsTable)
        .set({ spotsRemaining: sql`GREATEST(0, COALESCE(${eventsTable.spotsRemaining}, ${eventsTable.capacity}) - ${quantity})` })
        .where(eq(eventsTable.id, eventId));

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "http://localhost";

      res.json({
        url: `${baseUrl}/events/confirmation?sessionId=${sessionId}`,
        sessionId,
      });
      return;
    }
    throw err;
  }
});

router.get("/registrations/confirmation", async (req, res): Promise<void> => {
  const query = GetRegistrationBySessionQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { sessionId } = query.data;

  if (!sessionId.startsWith("mock_")) {
    try {
      const { getUncachableStripeClient } = await import("../lib/stripeClient");
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === "paid") {
        await db
          .update(registrationsTable)
          .set({ status: "paid" })
          .where(eq(registrationsTable.stripeSessionId, sessionId));
      }
    } catch {
      // Stripe not connected — just return what we have
    }
  }

  const [registration] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.stripeSessionId, sessionId));

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, registration.eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({
    registration: { ...registration, totalAmount: Number(registration.totalAmount) },
    event: { ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null },
  });
});

// Admin-only: registration stats
router.get("/registrations/stats", requireAdminAuth, async (_req, res): Promise<void> => {
  const [totals] = await db
    .select({
      totalRegistrations: count(registrationsTable.id),
      totalRevenue: sum(registrationsTable.totalAmount),
    })
    .from(registrationsTable)
    .where(eq(registrationsTable.status, "paid"));

  const [eventCounts] = await db
    .select({ total: count(eventsTable.id) })
    .from(eventsTable);

  const [upcomingCount] = await db
    .select({ upcoming: count(eventsTable.id) })
    .from(eventsTable)
    .where(sql`${eventsTable.date} >= NOW()`);

  const recentRegs = await db
    .select()
    .from(registrationsTable)
    .orderBy(sql`${registrationsTable.createdAt} DESC`)
    .limit(5);

  res.json({
    totalRegistrations: Number(totals?.totalRegistrations ?? 0),
    totalRevenue: Number(totals?.totalRevenue ?? 0),
    totalEvents: Number(eventCounts?.total ?? 0),
    upcomingEvents: Number(upcomingCount?.upcoming ?? 0),
    recentRegistrations: recentRegs.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })),
  });
});

export default router;
