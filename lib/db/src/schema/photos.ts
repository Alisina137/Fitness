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

// ─── Photo Reminder Settings ──────────────────────────────────────────────────

export const reminderFrequencyEnum = pgEnum("reminder_frequency", [
  "weekly",
  "every2weeks",
  "monthly",
  "disabled",
]);

export const photoReminderSettingsTable = pgTable("photo_reminder_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  frequency: reminderFrequencyEnum("frequency").notNull().default("weekly"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PhotoReminderSettings = typeof photoReminderSettingsTable.$inferSelect;
export type InsertPhotoReminderSettings = typeof photoReminderSettingsTable.$inferInsert;
