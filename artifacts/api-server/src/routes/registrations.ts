import { Router, type IRouter } from "express";
import { eq, count, sum, sql, and, gt, ne, or, ilike } from "drizzle-orm";
import { db, eventsTable, registrationsTable } from "@workspace/db";
import {
  ListEventRegistrationsParams,
  CreateCheckoutSessionBody,
  GetRegistrationBySessionQueryParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAdminAuth } from "../middleware/adminAuth";
import { sendRegistrationConfirmation, sendCancellationConfirmation, sendCancelLinksEmail } from "../lib/email";
import { waitlistTable } from "@workspace/db";
import { notifyWaitlistSpots } from "../lib/notifyWaitlist";
import { finalizePayment } from "../lib/finalizePayment";
import { createHmac, timingSafeEqual } from "crypto";

const CANCEL_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getCancelTokenSecret(): string {
  const secret = process.env.CANCEL_TOKEN_SECRET;
  if (!secret) throw new Error("CANCEL_TOKEN_SECRET environment variable is not set");
  return secret;
}

function generateCancelToken(registrationId: number, email: string): string {
  const secret = getCancelTokenSecret();
  const expiry = Date.now() + CANCEL_TOKEN_TTL_MS;
  const payload = `${registrationId}:${email.toLowerCase()}:${expiry}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyCancelToken(token: string, registrationId: number, email: string): boolean {
  try {
    const secret = getCancelTokenSecret();
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return false;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const payload = Buffer.from(payloadB64, "base64url").toString();
    const parts = payload.split(":");
    if (parts.length !== 3) return false;
    const [idStr, tokenEmail, expiryStr] = parts;
    if (Number(idStr) !== registrationId) return false;
    if (tokenEmail.toLowerCase() !== email.toLowerCase()) return false;
    if (Date.now() > Number(expiryStr)) return false;
    const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}
const router: IRouter = Router();


// Authenticated user: list their own registrations with event details
router.get("/registrations/my", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const regs = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.userId, req.user.id))
    .orderBy(sql`${registrationsTable.createdAt} DESC`);

  const results = await Promise.all(
    regs.map(async (reg) => {
      const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, reg.eventId));
      return {
        registration: { ...reg, totalAmount: Number(reg.totalAmount) },
        event: event ? { ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null } : null,
      };
    })
  );

  res.json(results.filter((r) => r.event !== null));
});

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

  const { eventId, firstName, lastName, email, phone, quantity = 1, seatingPreference, jokersPreference, skillLevel, couponCode, referredBy } = parsed.data;
  const userId = req.isAuthenticated() ? req.user.id : null;
  const { randomBytes } = await import("crypto");
  const referralCode = `BB${randomBytes(4).toString("hex").toUpperCase()}`;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  // Reject unpublished events and events that have already passed
  if (!event.published) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (new Date(event.date) < new Date()) {
    res.status(400).json({ error: "This event has already passed." });
    return;
  }

  // Server-side capacity enforcement
  const spotsAvailable = event.spotsRemaining ?? event.capacity;
  if (spotsAvailable < quantity) {
    res.status(400).json({ error: `Only ${spotsAvailable} spot(s) remaining for this event.` });
    return;
  }

  // Coupon code validation: if code provided but doesn't match, reject immediately
  const couponApplied = !!(couponCode && event.couponCode &&
    event.couponCode.trim().toUpperCase() === couponCode.trim().toUpperCase());
  if (couponCode && !couponApplied) {
    res.status(400).json({ error: "Invalid coupon code." });
    return;
  }

  const effectivePrice = couponApplied ? 0 : Number(event.price);
  const totalAmount = effectivePrice * quantity;

  const baseUrl = process.env.WEBHOOK_BASE_URL ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost");

  // Free events or valid coupon: skip Square entirely, confirm immediately
  if (effectivePrice === 0) {
    const sessionId = `free_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Use the same row-lock transaction as the paid path to prevent concurrent overselling
    type FreeTxResult =
      | { ok: true; reg: typeof registrationsTable.$inferSelect }
      | { ok: false; statusCode: number; message: string };

    const freeTx = await db.transaction(async (tx): Promise<FreeTxResult> => {
      const lockResult = await tx.execute(
        sql`SELECT capacity FROM events WHERE id = ${eventId} FOR UPDATE`
      );
      const lockedEvent = lockResult.rows?.[0] as { capacity: number } | undefined;
      if (!lockedEvent) return { ok: false, statusCode: 404, message: "Event not found" };

      const takenResult = await tx.execute(
        sql`SELECT COALESCE(SUM(quantity), 0) AS taken FROM registrations WHERE event_id = ${eventId} AND status = 'paid'`
      );
      const taken = Number((takenResult.rows?.[0] as any)?.taken ?? 0);
      const realSpotsAvailable = lockedEvent.capacity - taken;

      if (realSpotsAvailable < quantity) {
        return { ok: false, statusCode: 400, message: `Only ${realSpotsAvailable} spot(s) remaining for this event.` };
      }

      const [reg] = await tx.insert(registrationsTable).values({
        eventId,
        userId: userId ?? undefined,
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        quantity,
        totalAmount: "0",
        stripeSessionId: sessionId,
        status: "paid",
        seatingPreference: seatingPreference ?? null,
        jokersPreference: jokersPreference ?? null,
        skillLevel: skillLevel ?? null,
        referralCode,
        referredBy: referredBy ?? null,
      }).returning();

      await tx.update(eventsTable).set({
        spotsRemaining: sql`${eventsTable.capacity} - (
          SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
          FROM ${registrationsTable}
          WHERE ${registrationsTable.eventId} = ${eventsTable.id}
          AND ${registrationsTable.status} = 'paid'
        )`,
      }).where(eq(eventsTable.id, eventId));

      return { ok: true, reg };
    });

    if (!freeTx.ok) {
      res.status(freeTx.statusCode).json({ error: freeTx.message });
      return;
    }

    const freeReg = freeTx.reg;

    // Send confirmation email (non-blocking — never fail the registration if email fails)
    sendRegistrationConfirmation({
      to: email,
      firstName,
      eventTitle: event.title,
      eventDate: event.date,
      eventEndDate: event.endDate,
      eventLocation: event.location,
      eventAddress: event.address,
      quantity,
      totalAmount: 0,
    }).then((sent) => {
      if (sent) {
        return db.update(registrationsTable)
          .set({ confirmationEmailSent: true })
          .where(and(eq(registrationsTable.id, freeReg.id), eq(registrationsTable.confirmationEmailSent, false)));
      }
    }).catch(() => {});

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

  // Wrap capacity check + INSERT in a transaction with row lock to prevent concurrent over-selling.
  // We re-count live paid registrations inside the lock rather than trusting the cached field.
  type PaidTxResult =
    | { ok: true; registration: typeof registrationsTable.$inferSelect }
    | { ok: false; statusCode: number; message: string };

  const paidTx = await db.transaction(async (tx): Promise<PaidTxResult> => {
    const lockResult = await tx.execute(
      sql`SELECT capacity FROM events WHERE id = ${eventId} FOR UPDATE`
    );
    const lockedEvent = lockResult.rows?.[0] as { capacity: number } | undefined;
    if (!lockedEvent) return { ok: false, statusCode: 404, message: "Event not found" };

    const takenResult = await tx.execute(
      sql`SELECT COALESCE(SUM(quantity), 0) AS taken FROM registrations WHERE event_id = ${eventId} AND status = 'paid'`
    );
    const taken = Number((takenResult.rows?.[0] as any)?.taken ?? 0);
    const realSpotsAvailable = lockedEvent.capacity - taken;

    if (realSpotsAvailable < quantity) {
      return { ok: false, statusCode: 400, message: `Only ${realSpotsAvailable} spot(s) remaining for this event.` };
    }

    const [reg] = await tx
      .insert(registrationsTable)
      .values({
        eventId,
        userId: userId ?? undefined,
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        quantity,
        totalAmount: String(totalAmount),
        status: "pending",
        seatingPreference: seatingPreference ?? null,
        jokersPreference: jokersPreference ?? null,
        skillLevel: skillLevel ?? null,
        referralCode,
        referredBy: referredBy ?? null,
      })
      .returning();

    return { ok: true, registration: reg };
  });

  if (!paidTx.ok) {
    res.status(paidTx.statusCode).json({ error: paidTx.message });
    return;
  }
  const registration = paidTx.registration;

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
      redirectUrl: `${baseUrl}/events/confirmation?sessionId=pending`,
      askForShippingAddress: false,
    },
    prePopulatedData: {
      buyerEmail: email,
    },
  });

  const paymentLink = response.paymentLink;
  if (!paymentLink?.url || !paymentLink?.orderId || !paymentLink?.id) {
    throw new Error("Square did not return a payment link URL");
  }

  // Update the payment link's redirectUrl to use the unguessable Square orderId so the
  // confirmation endpoint never needs to handle sequential registration IDs.
  await square.checkout.paymentLinks.update({
    id: paymentLink.id,
    paymentLink: {
      version: paymentLink.version ?? 1,
      checkoutOptions: {
        redirectUrl: `${baseUrl}/events/confirmation?sessionId=${paymentLink.orderId}`,
      },
    },
  });

  // Store Square orderId — used by both the webhook and the confirmation endpoint for lookup
  await db
    .update(registrationsTable)
    .set({ stripeSessionId: paymentLink.orderId })
    .where(eq(registrationsTable.id, registration.id));

  logger.info({ orderId: paymentLink.orderId, registrationId: registration.id }, "Square payment link created");

  res.json({ url: paymentLink.url, sessionId: paymentLink.orderId });
}

router.post("/registrations/pay", async (req, res): Promise<void> => {
  const { sessionId, sourceId } = req.body as { sessionId?: string; sourceId?: string };
  if (!sessionId || !sourceId) {
    res.status(400).json({ error: "sessionId and sourceId are required" });
    return;
  }

  const [registration] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.stripeSessionId, sessionId))
    .limit(1);

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }
  if (registration.status === "paid") {
    res.json({ sessionId, alreadyPaid: true });
    return;
  }
  if (registration.status !== "pending") {
    res.status(400).json({ error: "Registration is not in a payable state" });
    return;
  }

  const { getSquareClient, getSquareLocationId } = await import("../lib/squareClient");
  const square = getSquareClient();
  const locationId = getSquareLocationId();

  const [eventForNote] = await db
    .select({ title: eventsTable.title })
    .from(eventsTable)
    .where(eq(eventsTable.id, registration.eventId))
    .limit(1);

  const amountCents = BigInt(Math.round(Number(registration.totalAmount) * 100));
  const idempotencyKey = `pay_${registration.id}_${Date.now()}`;
  const ticketLabel = registration.quantity === 1 ? "ticket" : "tickets";
  const paymentNote = eventForNote
    ? `${registration.firstName} ${registration.lastName} — ${eventForNote.title} (${registration.quantity} ${ticketLabel})`
    : `${registration.firstName} ${registration.lastName}`;

  const paymentResponse = await square.payments.create({
    idempotencyKey,
    sourceId,
    amountMoney: { amount: amountCents, currency: "USD" },
    locationId,
    buyerEmailAddress: registration.email,
    note: paymentNote,
  });

  const payment = paymentResponse.payment;
  if (!payment || payment.status !== "COMPLETED") {
    const errorDetail = (paymentResponse as any)?.errors?.[0]?.detail ?? "Payment was not completed";
    res.status(402).json({ error: errorDetail });
    return;
  }

  const finalized = await finalizePayment(sessionId, payment.id ?? null);
  if (!finalized) {
    // Payment was already captured by Square but the event is now sold out.
    // Immediately refund so the customer is not charged.
    try {
      await square.refunds.refundPayment({
        idempotencyKey: `oversold-refund-${payment.id!}-${Date.now()}`,
        paymentId: payment.id!,
        amountMoney: { amount: amountCents, currency: "USD" },
        reason: "Event sold out — automatic refund",
      });
      logger.info({ paymentId: payment.id }, "Refund issued for oversold event via /registrations/pay");
    } catch (refundErr) {
      logger.error({ refundErr, paymentId: payment.id }, "CRITICAL: Could not refund oversold charge — manual intervention required");
    }
    res.status(409).json({ error: "This event is now sold out. Your payment has been refunded." });
    return;
  }

  logger.info({ registrationId: registration.id, paymentId: payment.id }, "Web Payments SDK payment completed");
  res.json({ sessionId, paymentId: payment.id });
});

router.get("/registrations/confirmation", async (req, res): Promise<void> => {
  const query = GetRegistrationBySessionQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { sessionId } = query.data;

  // Look up exclusively by stripeSessionId (Square orderId UUID or free_xxx token).
  // Numeric registration ID lookup is intentionally absent — sequential IDs allow
  // unauthenticated enumeration of all registrant PII.
  let registration = (
    await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.stripeSessionId, sessionId))
      .limit(1)
  )[0];

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }

  // If the webhook hasn't fired yet, poll Square directly and finalize if already paid
  if (registration.status === "pending" && registration.stripeSessionId) {
    try {
      const { getSquareClient } = await import("../lib/squareClient");
      const square = getSquareClient();
      const orderResp = await square.orders.get({ orderId: registration.stripeSessionId });
      const order = orderResp.order;
      if ((order as any)?.state === "COMPLETED") {
        const tenders = (order as any)?.tenders;
        const paymentId = Array.isArray(tenders) && tenders.length > 0 ? (tenders[0].id ?? null) : null;
        const finalized = await finalizePayment(registration.stripeSessionId, paymentId);
        if (finalized) registration = finalized;
      }
    } catch (err) {
      logger.warn({ err }, "Could not verify Square order status on confirmation page");
    }
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, registration.eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({
    registration: {
      id: registration.id,
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      status: registration.status,
      quantity: registration.quantity,
      totalAmount: Number(registration.totalAmount),
      referralCode: registration.referralCode ?? null,
      referredBy: registration.referredBy ?? null,
    },
    event: {
      id: event.id,
      title: event.title,
      date: event.date,
      endDate: event.endDate ?? null,
      location: event.location,
      address: event.address ?? null,
    },
  });
});

// Guest: request cancellation links be sent to an email address
router.post("/registrations/send-cancel-link", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const baseUrl = process.env.WEBHOOK_BASE_URL ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost");

  try {
    // Find upcoming non-cancelled registrations for this email
    const now = new Date();
    const rows = await db
      .select({ r: registrationsTable, e: eventsTable })
      .from(registrationsTable)
      .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
      .where(
        and(
          eq(registrationsTable.email, email.toLowerCase()),
          ne(registrationsTable.status, "cancelled"),
          gt(eventsTable.date, now)
        )
      );

    // Always respond 200 to avoid email enumeration
    if (rows.length === 0) {
      res.json({ sent: true });
      return;
    }

    const firstName = rows[0].r.firstName;
    const regs = rows.map(({ r, e }) => ({
      eventTitle: e.title,
      eventDate: new Date(e.date),
      quantity: r.quantity,
      totalAmount: Number(r.totalAmount),
      cancelUrl: `${baseUrl}/cancel?reg=${r.id}&token=${generateCancelToken(r.id, email)}`,
    }));

    sendCancelLinksEmail({ to: email.toLowerCase(), firstName, registrations: regs }).catch(() => {});

    res.json({ sent: true });
  } catch (err) {
    logger.error({ err }, "send-cancel-link error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Guest: fetch registration info for the cancel page (verifies HMAC token)
router.get("/registrations/:id/cancel-info", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const token = String(req.query.token ?? "");
  if (isNaN(id) || !token) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const row = await db
    .select({ r: registrationsTable, e: eventsTable })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(eq(registrationsTable.id, id))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!row) { res.status(404).json({ error: "Registration not found" }); return; }
  if (!verifyCancelToken(token, id, row.r.email)) {
    res.status(400).json({ error: "Invalid or expired cancellation link" });
    return;
  }

  res.json({
    id: row.r.id,
    firstName: row.r.firstName,
    lastName: row.r.lastName,
    status: row.r.status,
    quantity: row.r.quantity,
    totalAmount: Number(row.r.totalAmount),
    eventTitle: row.e.title,
    eventDate: row.e.date,
    eventLocation: row.e.location,
    eventAddress: row.e.address,
  });
});

// Guest: cancel a registration using the HMAC token from the email link
router.post("/registrations/:id/cancel-by-token", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const token = String(req.query.token ?? "");
  if (isNaN(id) || !token) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  type TxResult =
    | { outcome: "not_found" }
    | { outcome: "bad_token" }
    | { outcome: "already_cancelled" }
    | { outcome: "event_passed" }
    | { outcome: "ok"; email: string; firstName: string; eventId: number; prevStatus: string; squarePaymentId: string | null; totalAmount: string; quantity: number };

  const result = await db.transaction(async (tx): Promise<TxResult> => {
    const locked = await tx.execute(
      sql`SELECT r.id, r.email, r.first_name, r.status, r.quantity, r.event_id, r.square_payment_id, r.total_amount, e.date AS event_date
          FROM registrations r JOIN events e ON e.id = r.event_id
          WHERE r.id = ${id} FOR UPDATE OF r`
    );
    const reg = (locked.rows?.[0] ?? null) as {
      id: number; email: string; first_name: string; status: string; quantity: number;
      event_id: number; square_payment_id: string | null; total_amount: string; event_date: string | Date | null;
    } | null;

    if (!reg) return { outcome: "not_found" };
    if (!verifyCancelToken(token, id, reg.email)) return { outcome: "bad_token" };
    if (reg.status === "cancelled") return { outcome: "already_cancelled" };
    const eventDate = reg.event_date ? new Date(reg.event_date) : null;
    if (eventDate && eventDate < new Date()) return { outcome: "event_passed" };

    await tx.update(registrationsTable).set({ status: "cancelled" }).where(eq(registrationsTable.id, id));

    return {
      outcome: "ok",
      email: reg.email,
      firstName: reg.first_name,
      eventId: Number(reg.event_id),
      prevStatus: reg.status,
      squarePaymentId: reg.square_payment_id,
      totalAmount: reg.total_amount,
      quantity: Number(reg.quantity),
    };
  });

  if (result.outcome === "not_found") { res.status(404).json({ error: "Registration not found" }); return; }
  if (result.outcome === "bad_token") { res.status(400).json({ error: "Invalid or expired cancellation link" }); return; }
  if (result.outcome === "already_cancelled") { res.status(400).json({ error: "Registration is already cancelled" }); return; }
  if (result.outcome === "event_passed") { res.status(400).json({ error: "Cannot cancel a registration for an event that has already passed" }); return; }

  await db.update(eventsTable).set({
    spotsRemaining: sql`${eventsTable.capacity} - (
      SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
      FROM ${registrationsTable}
      WHERE ${registrationsTable.eventId} = ${eventsTable.id}
      AND ${registrationsTable.status} = 'paid'
    )`,
  }).where(eq(eventsTable.id, result.eventId));

  // Issue Square refund if applicable
  let refundStatus: "refunded" | "no_payment" | "failed" = "no_payment";
  if (result.prevStatus === "paid" && result.squarePaymentId) {
    try {
      const { getSquareClient } = await import("../lib/squareClient");
      const sq = getSquareClient();
      const amountCents = BigInt(Math.round(Number(result.totalAmount) * 100));
      await sq.refunds.refundPayment({
        idempotencyKey: `guest-cancel-reg-${id}-${Date.now()}`,
        amountMoney: { amount: amountCents, currency: "USD" },
        paymentId: result.squarePaymentId,
        reason: "Registration cancelled by attendee (guest)",
      });
      refundStatus = "refunded";
    } catch (err) {
      refundStatus = "failed";
      logger.error({ err, registrationId: id }, "Square refund failed on guest cancel");
    }
  }

  // Send cancellation confirmation email (non-blocking)
  const [eventRow] = await db.select().from(eventsTable).where(eq(eventsTable.id, result.eventId));
  if (eventRow) {
    sendCancellationConfirmation({
      to: result.email,
      firstName: result.firstName,
      eventTitle: eventRow.title,
      eventDate: new Date(eventRow.date),
      quantity: result.quantity,
    }).catch(() => {});
  }

  // Notify next waitlisted person that a spot opened (non-blocking)
  notifyWaitlistSpots(result.eventId, 1).catch(() => {});

  res.json({ success: true, refundStatus });
});

// Authenticated user: cancel their own registration
router.delete("/registrations/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid registration id" });
    return;
  }

  type TxResult =
    | { outcome: "not_found" }
    | { outcome: "forbidden" }
    | { outcome: "already_cancelled" }
    | { outcome: "event_passed" }
    | { outcome: "ok"; prevStatus: string; quantity: number; eventId: number; squarePaymentId: string | null; totalAmount: string };

  // Use a transaction with FOR UPDATE to lock the row, capturing the pre-update status
  // atomically. This prevents a concurrent webhook payment from slipping between our read
  // and write and causing a stale prevStatus decision outside the transaction.
  const result = await db.transaction(async (tx): Promise<TxResult> => {
    const locked = await tx.execute(
      sql`SELECT r.id, r.user_id, r.status, r.quantity, r.event_id, r.square_payment_id, r.total_amount, e.date AS event_date
          FROM registrations r
          JOIN events e ON e.id = r.event_id
          WHERE r.id = ${id} FOR UPDATE OF r`
    );
    const reg = (locked.rows?.[0] ?? null) as {
      id: number;
      user_id: string | null;
      status: string;
      quantity: number;
      event_id: number;
      square_payment_id: string | null;
      total_amount: string;
      event_date: string | Date | null;
    } | null;

    if (!reg) return { outcome: "not_found" };
    if (reg.user_id !== req.user.id) return { outcome: "forbidden" };
    if (reg.status === "cancelled") return { outcome: "already_cancelled" };

    const eventDate = reg.event_date ? new Date(reg.event_date) : null;
    if (eventDate && eventDate < new Date()) return { outcome: "event_passed" };

    await tx
      .update(registrationsTable)
      .set({ status: "cancelled" })
      .where(eq(registrationsTable.id, id));

    return {
      outcome: "ok",
      prevStatus: reg.status,
      quantity: Number(reg.quantity),
      eventId: Number(reg.event_id),
      squarePaymentId: reg.square_payment_id,
      totalAmount: reg.total_amount,
    };
  });

  if (result.outcome === "not_found") {
    res.status(404).json({ error: "Registration not found" });
    return;
  }
  if (result.outcome === "forbidden") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (result.outcome === "already_cancelled") {
    res.status(400).json({ error: "Registration is already cancelled" });
    return;
  }
  if (result.outcome === "event_passed") {
    res.status(400).json({ error: "Cannot cancel a registration for an event that has already passed" });
    return;
  }

  // Recalculate spots from the live registration count so any historical drift self-heals.
  await db
    .update(eventsTable)
    .set({
      spotsRemaining: sql`${eventsTable.capacity} - (
        SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
        FROM ${registrationsTable}
        WHERE ${registrationsTable.eventId} = ${eventsTable.id}
        AND ${registrationsTable.status} = 'paid'
      )`,
    })
    .where(eq(eventsTable.id, result.eventId));

  // Send cancellation confirmation email (non-blocking — never fail the cancellation if email fails)
  Promise.all([
    db.select().from(registrationsTable).where(eq(registrationsTable.id, id)).limit(1),
    db.select().from(eventsTable).where(eq(eventsTable.id, result.eventId)).limit(1),
  ]).then(([[reg], [event]]) => {
    if (reg && event && !reg.cancellationEmailSent) {
      sendCancellationConfirmation({
        to: reg.email,
        firstName: reg.firstName,
        eventTitle: event.title,
        eventDate: event.date,
        quantity: result.quantity,
      }).then((sent) => {
        if (sent) {
          return db.update(registrationsTable)
            .set({ cancellationEmailSent: true })
            .where(and(eq(registrationsTable.id, id), eq(registrationsTable.cancellationEmailSent, false)));
        }
      }).catch(() => {});
    }
  }).catch(() => {});

  // Issue a Square refund if the registration was paid and has a payment ID.
  // Pending registrations were never charged, so no refund is needed for them.
  let refundStatus: "refunded" | "no_payment" | "failed" = "no_payment";
  if (result.prevStatus === "paid" && result.squarePaymentId) {
    try {
      const { getSquareClient } = await import("../lib/squareClient");
      const square = getSquareClient();
      const amountCents = BigInt(Math.round(Number(result.totalAmount) * 100));
      await square.refunds.refundPayment({
        idempotencyKey: `user-cancel-reg-${id}-${Date.now()}`,
        amountMoney: { amount: amountCents, currency: "USD" },
        paymentId: result.squarePaymentId,
        reason: "Registration cancelled by attendee",
      });
      refundStatus = "refunded";
      logger.info({ registrationId: id, paymentId: result.squarePaymentId }, "Square refund issued on user self-cancel");
    } catch (err) {
      refundStatus = "failed";
      logger.error({ err, registrationId: id }, "Square refund failed on user self-cancel");
    }
  }

  // Notify next waitlisted person that a spot opened (non-blocking)
  notifyWaitlistSpots(result.eventId, 1).catch(() => {});

  res.json({ success: true, refundStatus });
});

// Admin-only: cancel any registration (bypasses user-ownership check)
router.post("/registrations/:id/cancel", requireAdminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid registration id" });
    return;
  }

  type TxResult =
    | { outcome: "not_found" }
    | { outcome: "already_cancelled" }
    | { outcome: "ok"; prevStatus: string; quantity: number; eventId: number; squarePaymentId: string | null; totalAmount: string };

  const result = await db.transaction(async (tx): Promise<TxResult> => {
    const locked = await tx.execute(
      sql`SELECT id, status, quantity, event_id, square_payment_id, total_amount FROM registrations WHERE id = ${id} FOR UPDATE`
    );
    const reg = (locked.rows?.[0] ?? null) as {
      id: number;
      status: string;
      quantity: number;
      event_id: number;
      square_payment_id: string | null;
      total_amount: string;
    } | null;

    if (!reg) return { outcome: "not_found" };
    if (reg.status === "cancelled") return { outcome: "already_cancelled" };

    await tx
      .update(registrationsTable)
      .set({ status: "cancelled" })
      .where(eq(registrationsTable.id, id));

    return {
      outcome: "ok",
      prevStatus: reg.status,
      quantity: Number(reg.quantity),
      eventId: Number(reg.event_id),
      squarePaymentId: reg.square_payment_id,
      totalAmount: reg.total_amount,
    };
  });

  if (result.outcome === "not_found") {
    res.status(404).json({ error: "Registration not found" });
    return;
  }
  if (result.outcome === "already_cancelled") {
    res.status(400).json({ error: "Registration is already cancelled" });
    return;
  }

  // Recalculate spots from the live registration count so any historical drift self-heals.
  await db
    .update(eventsTable)
    .set({
      spotsRemaining: sql`${eventsTable.capacity} - (
        SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
        FROM ${registrationsTable}
        WHERE ${registrationsTable.eventId} = ${eventsTable.id}
        AND ${registrationsTable.status} = 'paid'
      )`,
    })
    .where(eq(eventsTable.id, result.eventId));

  // Issue a Square refund if the registration was paid and has a payment ID.
  // Pending registrations were never charged, so no refund is needed for them.
  let refundStatus: "refunded" | "no_payment" | "failed" = "no_payment";
  if (result.prevStatus === "paid" && result.squarePaymentId) {
    try {
      const { getSquareClient } = await import("../lib/squareClient");
      const square = getSquareClient();
      const amountCents = BigInt(Math.round(Number(result.totalAmount) * 100));
      await square.refunds.refundPayment({
        idempotencyKey: `cancel-reg-${id}-${Date.now()}`,
        amountMoney: { amount: amountCents, currency: "USD" },
        paymentId: result.squarePaymentId,
        reason: "Registration cancelled by admin",
      });
      refundStatus = "refunded";
      logger.info({ registrationId: id, paymentId: result.squarePaymentId, amountCents: amountCents.toString() }, "Square refund issued on admin cancel");
    } catch (err) {
      refundStatus = "failed";
      logger.error({ err, registrationId: id, paymentId: result.squarePaymentId }, "Square refund failed on admin cancel");
    }
  }

  // Notify next waitlisted person that a spot opened (non-blocking)
  notifyWaitlistSpots(result.eventId, 1).catch(() => {});

  res.json({ success: true, refundStatus });
});

// Admin-only: reinstate a cancelled registration
router.post("/registrations/:id/reinstate", requireAdminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid registration id" });
    return;
  }

  type TxResult =
    | { outcome: "not_found" }
    | { outcome: "not_cancelled" }
    | { outcome: "ok"; quantity: number; eventId: number };

  const result = await db.transaction(async (tx): Promise<TxResult> => {
    const locked = await tx.execute(
      sql`SELECT id, status, quantity, event_id FROM registrations WHERE id = ${id} FOR UPDATE`
    );
    const reg = (locked.rows?.[0] ?? null) as {
      id: number;
      status: string;
      quantity: number;
      event_id: number;
    } | null;

    if (!reg) return { outcome: "not_found" };
    if (reg.status !== "cancelled") return { outcome: "not_cancelled" };

    await tx
      .update(registrationsTable)
      .set({ status: "paid" })
      .where(eq(registrationsTable.id, id));

    return {
      outcome: "ok",
      quantity: Number(reg.quantity),
      eventId: Number(reg.event_id),
    };
  });

  if (result.outcome === "not_found") {
    res.status(404).json({ error: "Registration not found" });
    return;
  }
  if (result.outcome === "not_cancelled") {
    res.status(400).json({ error: "Registration is not cancelled" });
    return;
  }

  // Recalculate spots from the live registration count so any historical drift self-heals.
  await db
    .update(eventsTable)
    .set({
      spotsRemaining: sql`${eventsTable.capacity} - (
        SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
        FROM ${registrationsTable}
        WHERE ${registrationsTable.eventId} = ${eventsTable.id}
        AND ${registrationsTable.status} = 'paid'
      )`,
    })
    .where(eq(eventsTable.id, result.eventId));

  res.json({ success: true });
});

// Admin-only: search registrations across all events by name or email
router.get("/registrations/search", requireAdminAuth, async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.json([]);
    return;
  }
  const pattern = `%${q}%`;
  const results = await db
    .select({
      id: registrationsTable.id,
      firstName: registrationsTable.firstName,
      lastName: registrationsTable.lastName,
      email: registrationsTable.email,
      status: registrationsTable.status,
      quantity: registrationsTable.quantity,
      totalAmount: registrationsTable.totalAmount,
      createdAt: registrationsTable.createdAt,
      stripeSessionId: registrationsTable.stripeSessionId,
      eventId: registrationsTable.eventId,
      eventTitle: eventsTable.title,
      eventDate: eventsTable.date,
    })
    .from(registrationsTable)
    .innerJoin(eventsTable, eq(registrationsTable.eventId, eventsTable.id))
    .where(
      or(
        ilike(registrationsTable.firstName, pattern),
        ilike(registrationsTable.lastName, pattern),
        ilike(registrationsTable.email, pattern),
        sql`CONCAT(${registrationsTable.firstName}, ' ', ${registrationsTable.lastName}) ILIKE ${pattern}`
      )
    )
    .orderBy(sql`${registrationsTable.createdAt} DESC`)
    .limit(50);
  res.json(results.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })));
});

// Admin-only: manually mark a pending registration as paid (e.g. when Square webhook was missed)
router.post("/registrations/:id/mark-paid", requireAdminAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid registration id" });
    return;
  }

  const [registration] = await db
    .select()
    .from(registrationsTable)
    .where(eq(registrationsTable.id, id))
    .limit(1);

  if (!registration) {
    res.status(404).json({ error: "Registration not found" });
    return;
  }
  if (registration.status !== "pending") {
    res.status(400).json({ error: `Registration is already ${registration.status}` });
    return;
  }
  if (!registration.stripeSessionId) {
    res.status(400).json({ error: "Registration has no payment session to finalize" });
    return;
  }

  const finalized = await finalizePayment(registration.stripeSessionId, null);
  if (!finalized) {
    res.status(409).json({ error: "Could not mark as paid — event may be at capacity" });
    return;
  }

  logger.info({ registrationId: id }, "Registration manually marked as paid by admin");
  res.json({ success: true });
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

  const [cancellationCount] = await db
    .select({ total: count(registrationsTable.id) })
    .from(registrationsTable)
    .where(eq(registrationsTable.status, "cancelled"));

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
    totalCancellations: Number(cancellationCount?.total ?? 0),
    totalEvents: Number(eventCounts?.total ?? 0),
    upcomingEvents: Number(upcomingCount?.upcoming ?? 0),
    recentRegistrations: recentRegs.map((r) => ({ ...r, totalAmount: Number(r.totalAmount) })),
  });
});

export default router;
