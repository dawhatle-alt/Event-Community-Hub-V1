import { eq, sql, and } from "drizzle-orm";
import { db, registrationsTable, eventsTable } from "@workspace/db";
import { logger } from "./logger";
import { sendRegistrationConfirmation } from "./email";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Square webhook signature.
 * Square signs with HMAC-SHA256 over (notificationUrl + rawBody).
 */
export function verifySquareWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSignatureKey: string,
  notificationUrl: string
): boolean {
  const payload = notificationUrl + rawBody;
  const hmac = createHmac("sha256", webhookSignatureKey).update(payload).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

export class WebhookHandlers {
  static async processSquareWebhook(rawBody: string, signature: string, notificationUrl: string): Promise<void> {
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!webhookSignatureKey) {
      throw new Error("SQUARE_WEBHOOK_SIGNATURE_KEY is not configured — rejecting webhook");
    }

    const isValid = verifySquareWebhookSignature(rawBody, signature, webhookSignatureKey, notificationUrl);
    if (!isValid) {
      throw new Error("Square webhook signature verification failed");
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new Error("Invalid JSON in webhook payload");
    }

    // Square payment completed event
    if (event.type === "payment.completed" || event.type === "payment.updated") {
      const payment = event.data?.object?.payment;
      if (!payment) return;

      const orderId: string = payment.order_id;
      const status: string = payment.status;

      const paymentId: string = payment.id;

      if (status === "COMPLETED" && orderId) {
        // Only transition pending → paid; never reactivate a cancelled registration
        const updated = await db
          .update(registrationsTable)
          .set({ status: "paid", squarePaymentId: paymentId || null })
          .where(and(eq(registrationsTable.stripeSessionId, orderId), eq(registrationsTable.status, "pending")))
          .returning();

        if (updated.length > 0) {
          const reg = updated[0];
          logger.info({ orderId, registrationId: reg.id }, "Registration marked paid via Square webhook");

          await db
            .update(eventsTable)
            .set({
              spotsRemaining: sql`${eventsTable.capacity} - (
                SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
                FROM ${registrationsTable}
                WHERE ${registrationsTable.eventId} = ${eventsTable.id}
                AND ${registrationsTable.status} != 'cancelled'
              )`,
            })
            .where(eq(eventsTable.id, reg.eventId));

          logger.info({ eventId: reg.eventId, qty: reg.quantity }, "Spots recalculated after Square payment confirmation");

          // Send confirmation email if not already sent (idempotency guard)
          if (!reg.confirmationEmailSent) {
            const [eventForEmail] = await db.select().from(eventsTable).where(eq(eventsTable.id, reg.eventId));
            if (eventForEmail) {
              sendRegistrationConfirmation({
                to: reg.email,
                firstName: reg.firstName,
                eventTitle: eventForEmail.title,
                eventDate: eventForEmail.date,
                eventEndDate: eventForEmail.endDate,
                eventLocation: eventForEmail.location,
                eventAddress: eventForEmail.address,
                quantity: reg.quantity,
                totalAmount: Number(reg.totalAmount),
              }).then((sent) => {
                if (sent) {
                  return db.update(registrationsTable)
                    .set({ confirmationEmailSent: true })
                    .where(and(eq(registrationsTable.id, reg.id), eq(registrationsTable.confirmationEmailSent, false)));
                }
              }).catch(() => {});
            }
          }
        } else {
          logger.warn({ orderId }, "Square webhook: no registration found for order");
        }
      }
    }

    // Square checkout completed — also handle via checkout.order.completed
    if (event.type === "checkout.order.completed") {
      const orderId: string | undefined = event.data?.object?.checkout?.order_id;
      if (!orderId) return;

      // Try to resolve the Square payment ID from the order's tenders for future refunds
      let resolvedPaymentId: string | null = null;
      try {
        const { getSquareClient } = await import("./squareClient");
        const square = getSquareClient();
        const orderResp = await square.orders.get({ orderId });
        const tenders = (orderResp.order as any)?.tenders;
        if (Array.isArray(tenders) && tenders.length > 0) {
          resolvedPaymentId = tenders[0].id ?? null;
        }
      } catch (err) {
        logger.warn({ err, orderId }, "Could not resolve Square payment ID from order tenders");
      }

      // Only transition pending → paid; never reactivate a cancelled registration
      const updated = await db
        .update(registrationsTable)
        .set({ status: "paid", squarePaymentId: resolvedPaymentId })
        .where(and(eq(registrationsTable.stripeSessionId, orderId), eq(registrationsTable.status, "pending")))
        .returning();

      if (updated.length > 0) {
        const reg = updated[0];
        logger.info({ orderId, registrationId: reg.id }, "Registration marked paid via Square checkout webhook");

        await db
          .update(eventsTable)
          .set({
            spotsRemaining: sql`${eventsTable.capacity} - (
              SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
              FROM ${registrationsTable}
              WHERE ${registrationsTable.eventId} = ${eventsTable.id}
              AND ${registrationsTable.status} != 'cancelled'
            )`,
          })
          .where(eq(eventsTable.id, reg.eventId));

        // Send confirmation email if not already sent (idempotency guard)
        if (!reg.confirmationEmailSent) {
          const [eventForEmail] = await db.select().from(eventsTable).where(eq(eventsTable.id, reg.eventId));
          if (eventForEmail) {
            sendRegistrationConfirmation({
              to: reg.email,
              firstName: reg.firstName,
              eventTitle: eventForEmail.title,
              eventDate: eventForEmail.date,
              eventEndDate: eventForEmail.endDate,
              eventLocation: eventForEmail.location,
              eventAddress: eventForEmail.address,
              quantity: reg.quantity,
              totalAmount: Number(reg.totalAmount),
            }).then((sent) => {
              if (sent) {
                return db.update(registrationsTable)
                  .set({ confirmationEmailSent: true })
                  .where(and(eq(registrationsTable.id, reg.id), eq(registrationsTable.confirmationEmailSent, false)));
              }
            }).catch(() => {});
          }
        }
      }
    }
  }
}
