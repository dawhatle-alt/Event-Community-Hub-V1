import { logger } from "./logger";
import { finalizePayment } from "./finalizePayment";
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
        const reg = await finalizePayment(orderId, paymentId || null);
        if (reg) {
          logger.info({ orderId, registrationId: reg.id }, "Registration marked paid via Square webhook");
        } else {
          logger.warn({ orderId }, "Square webhook: no pending registration found for order");
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

      const reg = await finalizePayment(orderId, resolvedPaymentId);
      if (reg) {
        logger.info({ orderId, registrationId: reg.id }, "Registration marked paid via Square checkout webhook");
      }
    }
  }
}
