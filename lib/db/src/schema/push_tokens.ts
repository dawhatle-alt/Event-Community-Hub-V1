import { pgTable, serial, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("idx_push_tokens_user_id").on(table.userId)]
);

export type PushToken = typeof pushTokensTable.$inferSelect;
