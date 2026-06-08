import { pgTable, serial, text, integer, numeric, timestamp, varchar, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  userId: varchar("user_id"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  quantity: integer("quantity").notNull().default(1),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  stripeSessionId: text("stripe_session_id"),
  squarePaymentId: text("square_payment_id"),
  status: text("status").notNull().default("pending"),
  confirmationEmailSent: boolean("confirmation_email_sent").notNull().default(false),
  cancellationEmailSent: boolean("cancellation_email_sent").notNull().default(false),
  feedbackToken: text("feedback_token").unique(),
  feedbackSentAt: timestamp("feedback_sent_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  seatingPreference: text("seating_preference"),
  jokersPreference: text("jokers_preference"),
  skillLevel: text("skill_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbackResponsesTable = pgTable("feedback_responses", {
  id: serial("id").primaryKey(),
  registrationId: integer("registration_id").notNull().references(() => registrationsTable.id).unique(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  rating: integer("rating").notNull(),
  comments: text("comments"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waitlistTable = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(registrationsTable).omit({ id: true, createdAt: true });
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
export type FeedbackResponse = typeof feedbackResponsesTable.$inferSelect;
