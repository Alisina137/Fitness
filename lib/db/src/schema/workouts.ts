import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const workoutPlansTable = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  difficulty: text("difficulty").default("beginner").notNull(),
  category: text("category"),
  exercises: jsonb("exercises").default([]).notNull().$type<WorkoutExerciseJson[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  completionCount: integer("completion_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WorkoutExerciseJson = {
  exerciseId: number;
  name: string;
  sets: number;
  reps?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
};

export const workoutCompletionsTable = pgTable("workout_completions", {
  id: serial("id").primaryKey(),
  workoutPlanId: integer("workout_plan_id").notNull().references(() => workoutPlansTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  durationMinutes: integer("duration_minutes"),
  caloriesBurned: integer("calories_burned"),
  rating: integer("rating"),
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlansTable).omit({ id: true, createdAt: true, updatedAt: true, completionCount: true });
export const insertWorkoutCompletionSchema = createInsertSchema(workoutCompletionsTable).omit({ id: true });

export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = typeof workoutPlansTable.$inferSelect;
export type WorkoutCompletion = typeof workoutCompletionsTable.$inferSelect;
