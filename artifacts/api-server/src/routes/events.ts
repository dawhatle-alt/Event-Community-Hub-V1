import { Router, type IRouter } from "express";
import { eq, asc, sql } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  CreateEventBody,
  UpdateEventBody,
  GetEventParams,
  UpdateEventParams,
  DeleteEventParams,
} from "@workspace/api-zod";
import { requireAdminAuth } from "../middleware/adminAuth";

const router: IRouter = Router();

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof sql>[] = [];

  if (query.success) {
    if (query.data.featured === true) {
      conditions.push(sql`${eventsTable.featured} = true`);
    }
    if (query.data.upcoming === true) {
      conditions.push(sql`${eventsTable.date} >= NOW()`);
    }
    if (query.data.category) {
      conditions.push(sql`${eventsTable.category} = ${query.data.category}`);
    }
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined)
    .orderBy(asc(eventsTable.date));

  const mapped = events.map((e) => ({
    ...e,
    price: Number(e.price),
    spotsRemaining: e.spotsRemaining ?? null,
  }));

  res.json(mapped);
});

// Static routes MUST come before /:id dynamic route
router.get("/events/featured", async (_req, res): Promise<void> => {
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.featured, true))
    .orderBy(asc(eventsTable.date))
    .limit(6);

  const mapped = events.map((e) => ({
    ...e,
    price: Number(e.price),
    spotsRemaining: e.spotsRemaining ?? null,
  }));

  res.json(mapped);
});

router.get("/events/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .selectDistinct({ category: eventsTable.category })
    .from(eventsTable)
    .orderBy(asc(eventsTable.category));

  res.json(rows.map((r) => r.category));
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null });
});

// Admin-only write endpoints
router.post("/events", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db.insert(eventsTable).values(parsed.data as any).returning();
  res.status(201).json({ ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null });
});

router.patch("/events/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .update(eventsTable)
    .set(parsed.data as any)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null });
});

router.delete("/events/:id", requireAdminAuth, async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [event] = await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id)).returning();
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
