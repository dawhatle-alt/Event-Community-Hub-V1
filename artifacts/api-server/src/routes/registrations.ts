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
// Two route aliases: /events/:id/registrations and /registrations?eventId=:id
router.get("/registrations", requireAdminAuth, async (req, res): Promise<void> => {
  const eventIdParam = req.query.eventId;
  if (!eventIdParam) {
    res.status(400).json({ error: "eventId query parameter required" });
    return;
  }
  const eventId = Number(eventIdParam);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }
  const regs = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.eventId, eventId))
    .orderBy(registrationsTable.createdAt);
  res.json(regs.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })));
});

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

// POST /events/:id/register — alias for /registrations/checkout that reads eventId from path
router.post("/events/:id/register", async (req, res): Promise<void> => {
  req.body = { ...req.body, eventId: Number(req.params.id) };
  return checkoutHandler(req, res);
});

router.post("/registrations/checkout", async (req, res): Promise<void> => {
  return checkoutHandler(req, res);
});

async function checkoutHandler(req: any, res: any): Promise<void> {
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

  // Server-side capacity enforcement
  const spotsAvailable = event.spotsRemaining ?? event.capacity;
  if (spotsAvailable < quantity) {
    res.status(400).json({ error: `Only ${spotsAvailable} spot(s) remaining for this event.` });
    return;
  }

  const totalAmount = Number(event.price) * quantity;

  const baseUrl = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost";

  // Free events: skip Square entirely, confirm immediately
  if (Number(event.price) === 0) {
    const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await db.insert(registrationsTable).values({
      eventId,
      firstName,
      lastName,
      email,
      phone: phone ?? null,
      quantity,
      totalAmount: "0",
      stripeSessionId: sessionId,
      status: "paid",
    });

    await db
      .update(eventsTable)
      .set({ spotsRemaining: sql`GREATEST(0, COALESCE(${eventsTable.spotsRemaining}, ${eventsTable.capacity}) - ${quantity})` })
      .where(eq(eventsTable.id, eventId));

    res.json({
      url: `${baseUrl}/events/confirmation?sessionId=${sessionId}`,
      sessionId,
    });
    return;
  }

  // Square Payment Links checkout
  const { getSquareClient, getSquareLocationId } = await import("../lib/squareClient");
  const square = getSquareClient();
  const locationId = getSquareLocationId();

  const idempotencyKey = `reg_${eventId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Create a pending registration first
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

  // Use quickPay for a simple hosted checkout — one item, no order management overhead
  const amountCents = BigInt(Math.round(Number(event.price) * 100 * quantity));

  const response = await square.checkout.paymentLinks.create({
    idempotencyKey,
    quickPay: {
      name: `${event.title}${quantity > 1 ? ` x${quantity}` : ""}`,
      priceMoney: {
        amount: amountCents,
        currency: "USD",
      },
      locationId,
    },
    checkoutOptions: {
      redirectUrl: `${baseUrl}/events/confirmation?sessionId=${registration.id}`,
      askForShippingAddress: false,
    },
    prePopulatedData: {
      buyerEmail: email,
    },
  });

  const paymentLink = response.paymentLink;
  if (!paymentLink?.url || !paymentLink?.orderId) {
    throw new Error("Square did not return a payment link URL");
  }

  // Store the Square order ID in the stripeSessionId column (reused as generic provider session ID)
  await db
    .update(registrationsTable)
    .set({ stripeSessionId: paymentLink.orderId })
    .where(eq(registrationsTable.id, registration.id));

  logger.info({ orderId: paymentLink.orderId, registrationId: registration.id }, "Square payment link created");

  res.json({ url: paymentLink.url, sessionId: String(registration.id) });
}

router.get("/registrations/confirmation", async (req, res): Promise<void> => {
  const query = GetRegistrationBySessionQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { sessionId } = query.data;

  // sessionId can be: free_xxx, numeric registration id (from Square redirect), or Square order ID
  // Try to find by stripeSessionId first, then by registration id (numeric)
  let registration = (
    await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.stripeSessionId, sessionId))
      .limit(1)
  )[0];

  // Square redirect uses registration.id as sessionId param
  if (!registration && /^\d+$/.test(sessionId)) {
    const regId = parseInt(sessionId, 10);
    registration = (
      await db
        .select()
        .from(registrationsTable)
        .where(eq(registrationsTable.id, regId))
        .limit(1)
    )[0];

    // If still pending, check Square order status
    if (registration && registration.status === "pending" && registration.stripeSessionId) {
      try {
        const { getSquareClient } = await import("../lib/squareClient");
        const square = getSquareClient();
        const orderResp = await square.orders.get({ orderId: registration.stripeSessionId });
        const order = orderResp.order;
        if (order?.state === "COMPLETED") {
          await db
            .update(registrationsTable)
            .set({ status: "paid" })
            .where(eq(registrationsTable.id, registration.id));
          registration = { ...registration, status: "paid" };
        }
      } catch (err) {
        logger.warn({ err }, "Could not verify Square order status");
      }
    }
  }

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
