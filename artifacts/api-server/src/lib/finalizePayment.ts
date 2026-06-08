import { eq, sql, and } from "drizzle-orm";
import { db, registrationsTable, eventsTable } from "@workspace/db";
import { logger } from "./logger";
import { sendRegistrationConfirmation } from "./email";

/**
 * Atomically finalizes a pending Square payment inside a single transaction:
 *   1. Locks the event row (FOR UPDATE) so concurrent finalizations serialize
 *   2. Re-counts live paid registrations and rejects if the event is at capacity
 *   3. Marks the registration paid and stores squarePaymentId
 *   4. Recalculates spotsRemaining (counting only 'paid') inside the same transaction
 *   5. Sends the confirmation email (idempotent, non-blocking) after commit
 *
 * Looks up the registration by stripeSessionId (= Square orderId).
 * Returns the updated registration row, or null if not found or over capacity.
 */
export async function finalizePayment(
  orderId: string,
  squarePaymentId: string | null
): Promise<typeof registrationsTable.$inferSelect | null> {
  type TxResult =
    | { ok: true; reg: typeof registrationsTable.$inferSelect }
    | { ok: false; reason: "not_found" | "over_capacity" };

  const result = await db.transaction(async (tx): Promise<TxResult> => {
    const [pending] = await tx
      .select()
      .from(registrationsTable)
      .where(
        and(
          eq(registrationsTable.stripeSessionId, orderId),
          eq(registrationsTable.status, "pending")
        )
      )
      .limit(1);

    if (!pending) return { ok: false, reason: "not_found" };

    // Lock the event row so no two concurrent finalizations can both pass capacity
    const lockResult = await tx.execute(
      sql`SELECT capacity FROM events WHERE id = ${pending.eventId} FOR UPDATE`
    );
    const lockedEvent = lockResult.rows?.[0] as { capacity: number } | undefined;
    if (!lockedEvent) return { ok: false, reason: "not_found" };

    // Count only currently paid registrations — pending rows do not hold capacity
    const takenResult = await tx.execute(
      sql`SELECT COALESCE(SUM(quantity), 0) AS taken FROM registrations WHERE event_id = ${pending.eventId} AND status = 'paid'`
    );
    const taken = Number((takenResult.rows?.[0] as any)?.taken ?? 0);
    const spotsAvailable = lockedEvent.capacity - taken;

    if (spotsAvailable < pending.quantity) {
      return { ok: false, reason: "over_capacity" };
    }

    const [updated] = await tx
      .update(registrationsTable)
      .set({ status: "paid", squarePaymentId: squarePaymentId ?? null })
      .where(
        and(
          eq(registrationsTable.id, pending.id),
          eq(registrationsTable.status, "pending")
        )
      )
      .returning();

    if (!updated) return { ok: false, reason: "not_found" };

    // Recalculate spots inside the same transaction (event row is already locked)
    await tx
      .update(eventsTable)
      .set({
        spotsRemaining: sql`${eventsTable.capacity} - (
          SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
          FROM ${registrationsTable}
          WHERE ${registrationsTable.eventId} = ${eventsTable.id}
          AND ${registrationsTable.status} = 'paid'
        )`,
      })
      .where(eq(eventsTable.id, pending.eventId));

    return { ok: true, reg: updated };
  });

  if (!result.ok) {
    if (result.reason === "over_capacity") {
      logger.warn({ orderId }, "Payment finalization rejected: event is at capacity");
    }
    return null;
  }

  const reg = result.reg;
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
