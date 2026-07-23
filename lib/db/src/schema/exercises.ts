import { pgTable, serial, text, integer, numeric, pgEnum, jsonb, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
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

// ─── User Favourite Exercises ─────────────────────────────────────────────────
// Junction table: one row per (user, exercise) pair when the user has favourited it.

export const userFavoriteExercisesTable = pgTable(
  "user_favorite_exercises",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.exerciseId] })],
);

// ─── Exercise Collections ─────────────────────────────────────────────────────

export const exerciseCollectionsTable = pgTable("exercise_collections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const collectionExercisesTable = pgTable(
  "collection_exercises",
  {
    collectionId: integer("collection_id")
      .notNull()
      .references(() => exerciseCollectionsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.exerciseId] })],
);
