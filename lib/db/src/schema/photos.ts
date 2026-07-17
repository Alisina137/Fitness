import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const photoTypeEnum = pgEnum("photo_type", ["front", "side", "back", "custom"]);

export const progressPhotosTable = pgTable("progress_photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  photoType: photoTypeEnum("photo_type").notNull(),
  notes: text("notes"),
  takenAt: timestamp("taken_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProgressPhoto = typeof progressPhotosTable.$inferSelect;
export type InsertProgressPhoto = typeof progressPhotosTable.$inferInsert;
