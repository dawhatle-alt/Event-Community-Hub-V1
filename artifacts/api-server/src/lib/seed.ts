import { db, eventsTable } from "@workspace/db";
import { count, sql } from "drizzle-orm";
import { logger } from "./logger";

const SEED_EVENTS = [
  {
    title: "Spring Gala & Dinner",
    description:
      "An elegant evening celebrating the season with a four-course dinner, live jazz, and dancing. Dress to impress at this signature BougieBams event.",
    date: new Date("2026-07-12T18:00:00"),
    endDate: new Date("2026-07-12T23:00:00"),
    location: "The Grand Ballroom",
    address: "450 Park Avenue, New York, NY 10022",
    price: "120.00",
    capacity: 200,
    spotsRemaining: 200,
    imageUrl: null,
    category: "Gala",
    tags: "dinner,dancing,jazz,formal",
    featured: true,
    published: true,
    stripePriceId: null,
  },
  {
    title: "Art & Wine Mixer",
    description:
      "Explore curated contemporary art while sipping boutique wines. A relaxed social evening perfect for art lovers and collectors.",
    date: new Date("2026-07-20T17:30:00"),
    endDate: new Date("2026-07-20T21:00:00"),
    location: "Chelsea Gallery District",
    address: "529 W 20th St, New York, NY 10011",
    price: "65.00",
    capacity: 80,
    spotsRemaining: 80,
    imageUrl: null,
    category: "Mixer",
    tags: "art,wine,networking,social",
    featured: true,
    published: true,
    stripePriceId: null,
  },
  {
    title: "Rooftop Brunch Soirée",
    description:
      "Join us for a lavish brunch with panoramic city views. Bottomless mimosas, gourmet dishes, and great company await.",
    date: new Date("2026-08-02T11:00:00"),
    endDate: new Date("2026-08-02T14:30:00"),
    location: "Skyline Terrace",
    address: "1 Hudson Yards, New York, NY 10001",
    price: "85.00",
    capacity: 60,
    spotsRemaining: 60,
    imageUrl: null,
    category: "Brunch",
    tags: "brunch,rooftop,mimosas,views",
    featured: true,
    published: true,
    stripePriceId: null,
  },
  {
    title: "Women in Business Luncheon",
    description:
      "A power networking lunch for ambitious women entrepreneurs and executives. Keynote address, panel discussion, and open networking.",
    date: new Date("2026-08-14T12:00:00"),
    endDate: new Date("2026-08-14T15:00:00"),
    location: "The Lounge at Midtown",
    address: "350 Fifth Ave, New York, NY 10118",
    price: "75.00",
    capacity: 120,
    spotsRemaining: 120,
    imageUrl: null,
    category: "Networking",
    tags: "business,networking,women,leadership",
    featured: false,
    published: true,
    stripePriceId: null,
  },
  {
    title: "Luxury Wellness Retreat",
    description:
      "A half-day retreat featuring guided meditation, yoga, holistic wellness workshops, and a healthy catered lunch. Restore, refresh, refocus.",
    date: new Date("2026-08-23T09:00:00"),
    endDate: new Date("2026-08-23T15:00:00"),
    location: "Serenity Spa & Wellness Center",
    address: "211 Central Park West, New York, NY 10024",
    price: "150.00",
    capacity: 40,
    spotsRemaining: 40,
    imageUrl: null,
    category: "Wellness",
    tags: "wellness,yoga,meditation,retreat",
    featured: false,
    published: true,
    stripePriceId: null,
  },
  {
    title: "Community Welcome Mixer",
    description:
      "A free community mixer to welcome new members into the BougieBams family. Light bites, drinks, and great conversation.",
    date: new Date("2026-09-06T15:00:00"),
    endDate: new Date("2026-09-06T18:00:00"),
    location: "BougieBams HQ",
    address: "125 W 25th St, New York, NY 10001",
    price: "0.00",
    capacity: 150,
    spotsRemaining: 150,
    imageUrl: null,
    category: "Mixer",
    tags: "free,community,welcome,social",
    featured: true,
    published: true,
    stripePriceId: null,
  },
];

/**
 * Idempotent data fixups — correct known-bad values introduced before schema migrations.
 * Each fix is a targeted UPDATE with a WHERE clause so it is safe to run on every startup.
 */
export async function applyDataFixups(): Promise<void> {
  try {
    // Fix: event-style-table.svg was the placeholder for the "Style-Your-Own" event.
    // Replace it with the real mat-rack photo so the event banner displays correctly.
    await db
      .update(eventsTable)
      .set({ imageUrl: "mats-rack-2.jpg" })
      .where(sql`${eventsTable.imageUrl} = '/event-style-table.svg'`);
  } catch (err) {
    logger.error({ err }, "Data fixup failed — continuing startup");
  }
}

export async function seedIfEmpty(): Promise<void> {
  try {
    const [{ value }] = await db.select({ value: count() }).from(eventsTable);
    if (value > 0) {
      logger.info({ count: value }, "Database already has events, skipping seed");
      return;
    }

    logger.info("Seeding database with sample events…");
    await db.insert(eventsTable).values(SEED_EVENTS as any);
    logger.info({ count: SEED_EVENTS.length }, "Seed complete");
  } catch (err) {
    logger.error({ err }, "Failed to seed events — continuing startup");
  }
}
