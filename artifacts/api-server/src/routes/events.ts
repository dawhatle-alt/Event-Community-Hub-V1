import { Router, type IRouter } from "express";
import { eq, asc, sql, ilike, or } from "drizzle-orm";
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

function isAdminRequest(req: any): boolean {
  const authHeader = req.headers.authorization as string | undefined;
  const adminPassword = process.env.ADMIN_PASSWORD;
  return !!(adminPassword && authHeader === `Bearer ${adminPassword}`);
}

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  const conditions: ReturnType<typeof sql>[] = [];

  // Public listing always filters to published=true unless admin token provided
  if (!isAdminRequest(req)) {
    conditions.push(sql`${eventsTable.published} = true`);
  }

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
    // Server-side search: filter by title, description, location, or category
    if (query.data.search) {
      const term = `%${query.data.search}%`;
      conditions.push(
        sql`(${eventsTable.title} ILIKE ${term} OR ${eventsTable.description} ILIKE ${term} OR ${eventsTable.location} ILIKE ${term} OR ${eventsTable.category} ILIKE ${term})`
      );
    }
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined)
    .orderBy(asc(eventsTable.date));

  const isAdmin = isAdminRequest(req);
  const mapped = events.map((e) => {
    const { couponCode: _coupon, ...rest } = e;
    return {
      ...(isAdmin ? e : rest),
      price: Number(e.price),
      spotsRemaining: e.spotsRemaining ?? null,
    };
  });

  res.json(mapped);
});

// Static routes MUST come before /:id dynamic route
router.get("/events/featured", async (_req, res): Promise<void> => {
  const events = await db
    .select()
    .from(eventsTable)
    .where(sql`${eventsTable.featured} = true AND ${eventsTable.published} = true`)
    .orderBy(asc(eventsTable.date))
    .limit(6);

  const mapped = events.map((e) => {
    const { couponCode: _coupon, ...rest } = e;
    return { ...rest, price: Number(e.price), spotsRemaining: e.spotsRemaining ?? null };
  });

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

  // Enforce published check — drafts only accessible to admin
  if (!event.published && !isAdminRequest(req)) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const { couponCode: _coupon, ...publicEvent } = event;
  res.json({
    ...(isAdminRequest(req) ? event : publicEvent),
    price: Number(event.price),
    spotsRemaining: event.spotsRemaining ?? null,
  });
});

// Admin-only write endpoints
router.post("/events", requireAdminAuth, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const insertData = {
    ...parsed.data,
    // Initialize spotsRemaining to capacity if not explicitly provided
    spotsRemaining: (parsed.data as any).spotsRemaining ?? parsed.data.capacity,
  };
  const [event] = await db.insert(eventsTable).values(insertData as any).returning();
  res.status(201).json({ ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null });
});

// PATCH is used by OpenAPI spec; PUT alias provided for spec compatibility
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

  // If capacity is being changed, auto-adjust spotsRemaining by the same delta
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.capacity !== undefined) {
    const [current] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id)).limit(1);
    if (current) {
      const delta = parsed.data.capacity - current.capacity;
      const currentSpots = current.spotsRemaining ?? current.capacity;
      updateData.spotsRemaining = Math.max(0, currentSpots + delta);
    }
  }

  const [event] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json({ ...event, price: Number(event.price), spotsRemaining: event.spotsRemaining ?? null });
});

// PUT alias (task requirement compatibility)
router.put("/events/:id", requireAdminAuth, async (req, res): Promise<void> => {
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

// Public: validate a coupon code for an event (returns valid: bool, never exposes the code)
router.post("/events/:id/validate-coupon", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "code is required" });
    return;
  }
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event || (!event.published && !isAdminRequest(req))) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const valid = !!(event.couponCode && event.couponCode.trim().toUpperCase() === code.trim().toUpperCase());
  res.json({ valid });
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
