import { pgTable, serial, text, integer, numeric, pgEnum, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const difficultyEnum = pgEnum("difficulty", ["beginner", "intermediate", "advanced", "expert"]);
export const trainingTypeEnum = pgEnum("training_type", [
  "strength", "hypertrophy", "cardio", "mobility", "flexibility", "hiit", "rehabilitation", "functional"
]);

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),

  // Basic info
  name: text("name").notNull(),
  shortDescription: text("short_description"),
  instructions: text("instructions"),
  category: text("category").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  trainingType: trainingTypeEnum("training_type"),
  caloriesPerMinute: numeric("calories_per_minute", { precision: 5, scale: 2 }),

  // Muscle targeting
  primaryMuscles: text("primary_muscles").array().default([]).notNull(),
  secondaryMuscles: text("secondary_muscles").array().default([]).notNull(),
  muscleGroups: text("muscle_groups").array().default([]).notNull(), // combined, kept for backwards compat

  // Equipment
  equipment: text("equipment").array().default([]).notNull(),

  // Safety
  commonMistakes: text("common_mistakes"),
  safetyTips: text("safety_tips"),
  contraindications: text("contraindications"),

  // Alternatives & progressions
  alternativeExercises: text("alternative_exercises").array().default([]).notNull(),
  progressions: jsonb("progressions").$type<{
    easier?: string;
    harder?: string;
  }>().default({}),

  // Media
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  gifUrl: text("gif_url"),

  // AI readiness tags
  goals: text("goals").array().default([]).notNull(), // lose_fat, build_muscle, etc.
  tags: text("tags").array().default([]).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true, createdAt: true });
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
