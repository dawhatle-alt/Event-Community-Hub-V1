import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import storageRouter from "./storage";
import notificationsRouter from "./notifications";
import feedbackRouter from "./feedback";
import squareRouter from "./square";
import waitlistRouter from "./waitlist";
import favoritesRouter from "./favorites";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(registrationsRouter);
router.use(storageRouter);
router.use(notificationsRouter);
router.use(feedbackRouter);
router.use(squareRouter);
router.use(waitlistRouter);
router.use(favoritesRouter);

export default router;
