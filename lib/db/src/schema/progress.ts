import { pgTable, serial, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const progressTypeEnum = pgEnum("progress_type", ["weight", "measurement", "achievement"]);

export const progressEntriesTable = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: progressTypeEnum("type").notNull(),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
  bodyFatPercent: numeric("body_fat_percent", { precision: 5, scale: 2 }),
  chestCm: numeric("chest_cm", { precision: 6, scale: 2 }),
  waistCm: numeric("waist_cm", { precision: 6, scale: 2 }),
  hipsCm: numeric("hips_cm", { precision: 6, scale: 2 }),
  armCm: numeric("arm_cm", { precision: 6, scale: 2 }),
  thighCm: numeric("thigh_cm", { precision: 6, scale: 2 }),
  notes: text("notes"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const insertProgressEntrySchema = createInsertSchema(progressEntriesTable).omit({ id: true });
export const insertAchievementSchema = createInsertSchema(achievementsTable).omit({ id: true });

export type InsertProgressEntry = z.infer<typeof insertProgressEntrySchema>;
export type ProgressEntry = typeof progressEntriesTable.$inferSelect;
export type Achievement = typeof achievementsTable.$inferSelect;
