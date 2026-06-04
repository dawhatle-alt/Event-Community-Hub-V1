import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Register Square webhook route BEFORE express.json() middleware
// The webhook needs the raw string body for signature verification
app.post(
  "/api/square/webhook",
  express.text({ type: "application/json" }),
  async (req, res): Promise<void> => {
    const signature = req.headers["x-square-hmacsha256-signature"] as string | undefined;
    const notificationUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/api/square/webhook`;

    try {
      const { WebhookHandlers } = await import("./lib/webhookHandlers");
      await WebhookHandlers.processSquareWebhook(
        typeof req.body === "string" ? req.body : JSON.stringify(req.body),
        signature ?? "",
        notificationUrl
      );
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ err: error }, "Square webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
