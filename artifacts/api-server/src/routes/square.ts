import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/square/config", (_req, res) => {
  const applicationId = process.env.SQUARE_APPLICATION_ID;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = (process.env.SQUARE_ENVIRONMENT ?? "sandbox").toLowerCase();

  if (!applicationId || !locationId) {
    res.status(500).json({ error: "Square is not configured" });
    return;
  }

  res.json({ applicationId, locationId, environment });
});

export default router;
