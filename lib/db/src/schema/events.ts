import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  location: text("location").notNull(),
  address: text("address"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  capacity: integer("capacity").notNull().default(100),
  spotsRemaining: integer("spots_remaining"),
  imageUrl: text("image_url"),
  category: text("category").notNull().default("General"),
  tags: text("tags"),
  featured: boolean("featured").notNull().default(false),
  stripePriceId: text("stripe_price_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
