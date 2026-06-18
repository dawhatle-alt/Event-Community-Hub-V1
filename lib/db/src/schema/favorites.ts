import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const favoriteProductImagesTable = pgTable("favorite_product_images", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull().unique(),
  objectPath: text("object_path").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
