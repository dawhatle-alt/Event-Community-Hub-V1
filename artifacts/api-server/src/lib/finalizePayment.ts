import { eq, sql, and } from "drizzle-orm";
import { db, registrationsTable, eventsTable } from "@workspace/db";
import { logger } from "./logger";
import { sendRegistrationConfirmation } from "./email";

/**
 * Atomically finalizes a pending Square payment:
 *   1. Marks the registration paid and stores squarePaymentId
 *   2. Recalculates spotsRemaining counting only 'paid' registrations
 *   3. Sends the confirmation email (idempotent, non-blocking)
 *
 * Looks up the registration by stripeSessionId (= Square orderId).
 * Only transitions pending → paid; safe to call multiple times.
 * Returns the updated registration row, or null if no pending row was found.
 */
export async function finalizePayment(
  orderId: string,
  squarePaymentId: string | null
): Promise<typeof registrationsTable.$inferSelect | null> {
  const updated = await db
    .update(registrationsTable)
    .set({ status: "paid", squarePaymentId: squarePaymentId ?? null })
    .where(
      and(
        eq(registrationsTable.stripeSessionId, orderId),
        eq(registrationsTable.status, "pending")
      )
    )
    .returning();

  if (updated.length === 0) return null;
  const reg = updated[0];

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
    .where(eq(eventsTable.id, reg.eventId));

  logger.info(
    { orderId, registrationId: reg.id, eventId: reg.eventId },
    "Registration finalized as paid"
  );

  if (!reg.confirmationEmailSent) {
    const [eventForEmail] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, reg.eventId));
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
      })
        .then((sent) => {
          if (sent) {
            return db
              .update(registrationsTable)
              .set({ confirmationEmailSent: true })
              .where(
                and(
                  eq(registrationsTable.id, reg.id),
                  eq(registrationsTable.confirmationEmailSent, false)
                )
              );
          }
        })
        .catch(() => {});
    }
  }

  return reg;
}
