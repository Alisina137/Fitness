import { pgTable, serial, text, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced"]);

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  muscleGroups: text("muscle_groups").array().default([]).notNull(),
  equipment: text("equipment").array().default([]).notNull(),
  instructions: text("instructions"),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  caloriesPerMinute: numeric("calories_per_minute", { precision: 5, scale: 2 }),
});

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true });
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
