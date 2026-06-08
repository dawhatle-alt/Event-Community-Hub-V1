import { db, eventsTable, registrationsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

export async function recalculateAllSpots(): Promise<void> {
  try {
    await db.update(eventsTable).set({
      spotsRemaining: sql`${eventsTable.capacity} - (
        SELECT COALESCE(SUM(${registrationsTable.quantity}), 0)
        FROM ${registrationsTable}
        WHERE ${registrationsTable.eventId} = ${eventsTable.id}
        AND ${registrationsTable.status} != 'cancelled'
      )`,
    });
    logger.info("Spots recalculated from active registrations on startup");
  } catch (err) {
    logger.error({ err }, "Failed to recalculate spots on startup");
  }
}
