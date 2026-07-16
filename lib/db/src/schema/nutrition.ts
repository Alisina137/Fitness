import { pgTable, serial, text, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

export const nutritionEntriesTable = pgTable("nutrition_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  calories: numeric("calories", { precision: 8, scale: 2 }).notNull(),
  protein: numeric("protein", { precision: 8, scale: 2 }),
  carbs: numeric("carbs", { precision: 8, scale: 2 }),
  fat: numeric("fat", { precision: 8, scale: 2 }),
  fiber: numeric("fiber", { precision: 8, scale: 2 }),
  mealType: mealTypeEnum("meal_type").notNull(),
  servingSize: text("serving_size"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
});

export const insertNutritionEntrySchema = createInsertSchema(nutritionEntriesTable).omit({ id: true });
export type InsertNutritionEntry = z.infer<typeof insertNutritionEntrySchema>;
export type NutritionEntry = typeof nutritionEntriesTable.$inferSelect;
