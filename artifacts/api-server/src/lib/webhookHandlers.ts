import { eq } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import { logger } from "./logger";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    let stripe: any;
    try {
      const { getUncachableStripeClient } = await import('./stripeClient');
      stripe = await getUncachableStripeClient();
    } catch {
      throw new Error("Stripe not connected");
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set. Webhook signature verification is required.");
    }

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const sessionId: string = session.id;
      const paymentStatus: string = session.payment_status;

      if (paymentStatus === "paid") {
        const updated = await db
          .update(registrationsTable)
          .set({ status: "paid" })
          .where(eq(registrationsTable.stripeSessionId, sessionId))
          .returning();

        if (updated.length > 0) {
          logger.info({ sessionId, registrationId: updated[0].id }, "Registration marked paid via webhook");
        } else {
          logger.warn({ sessionId }, "Webhook: no registration found for session");
        }
      }
    }
  }
}
