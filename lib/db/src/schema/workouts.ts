import { pgTable, serial, text, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Workout Plans ────────────────────────────────────────────────────────────

export const workoutPlansTable = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  goal: text("goal"),           // fat_loss | muscle_gain | strength | endurance | general_fitness | mobility
  status: text("status").default("active").notNull(),  // draft | active | archived
  durationMinutes: integer("duration_minutes"),
  durationWeeks: integer("duration_weeks"),
  difficulty: text("difficulty").default("beginner").notNull(),
  category: text("category"),
  isTemplate: boolean("is_template").default(false).notNull(),
  weeklySchedule: jsonb("weekly_schedule").default({}).$type<WeeklySchedule>(),
  progressionRules: jsonb("progression_rules").default({}).$type<ProgressionRules>(),
  exercises: jsonb("exercises").default([]).notNull().$type<WorkoutExerciseJson[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  completionCount: integer("completion_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WeeklySchedule = {
  days?: number[];        // 0=Sun, 1=Mon, ... 6=Sat
  frequency?: number;     // workouts per week
};

export type ProgressionRules = {
  type?: "linear" | "percentage" | "none";
  incrementKg?: number;
  incrementPercent?: number;
  deloadWeek?: number;
};

export type WorkoutExerciseJson = {
  exerciseId: number;
  name: string;
  orderIndex?: number;
  sets: number;
  repsMin?: number | null;
  repsMax?: number | null;
  reps?: number | null;
  weightKg?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;      // e.g. "3-1-2-0" (eccentric-pause-concentric-pause)
  notes?: string | null;
};

// ─── Workout Days ─────────────────────────────────────────────────────────────

export const workoutDaysTable = pgTable("workout_days", {
  id: serial("id").primaryKey(),
  workoutPlanId: integer("workout_plan_id").notNull().references(() => workoutPlansTable.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  title: text("title").notNull(),
  focusArea: text("focus_area"),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  isRestDay: boolean("is_rest_day").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workout Day Exercises ────────────────────────────────────────────────────

export const workoutDayExercisesTable = pgTable("workout_day_exercises", {
  id: serial("id").primaryKey(),
  workoutDayId: integer("workout_day_id").notNull().references(() => workoutDaysTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  sets: integer("sets").default(3).notNull(),
  repsMin: integer("reps_min"),
  repsMax: integer("reps_max"),
  weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
  durationSeconds: integer("duration_seconds"),
  restSeconds: integer("rest_seconds").default(90),
  tempo: text("tempo"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Workout Sessions / Completions ───────────────────────────────────────────

export const workoutCompletionsTable = pgTable("workout_completions", {
  id: serial("id").primaryKey(),
  workoutPlanId: integer("workout_plan_id").notNull().references(() => workoutPlansTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationMinutes: integer("duration_minutes"),
  caloriesBurned: integer("calories_burned"),
  exercisesCompleted: jsonb("exercises_completed").default([]).$type<CompletedExerciseLog[]>(),
  difficultyRating: integer("difficulty_rating"),  // 1-5 (Very Easy → Very Hard)
  rating: integer("rating"),                        // legacy 1-5 star rating
  notes: text("notes"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export type CompletedExerciseLog = {
  exerciseId: number;
  name: string;
  sets: CompletedSetLog[];
  skipped?: boolean;
};

export type CompletedSetLog = {
  setNumber: number;
  repsCompleted?: number;
  weightKg?: number;
  durationSeconds?: number;
  completedAt: string;
};

// ─── Personal Records ─────────────────────────────────────────────────────────

export const personalRecordsTable = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  recordType: text("record_type").notNull(),  // max_weight | max_reps | max_volume
  value: numeric("value", { precision: 8, scale: 2 }).notNull(),
  unit: text("unit").default("kg").notNull(),
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  workoutCompletionId: integer("workout_completion_id").references(() => workoutCompletionsTable.id, { onDelete: "set null" }),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export const insertWorkoutPlanSchema = createInsertSchema(workoutPlansTable).omit({ id: true, createdAt: true, updatedAt: true, completionCount: true });
export const insertWorkoutDaySchema = createInsertSchema(workoutDaysTable).omit({ id: true, createdAt: true });
export const insertWorkoutDayExerciseSchema = createInsertSchema(workoutDayExercisesTable).omit({ id: true, createdAt: true });
export const insertWorkoutCompletionSchema = createInsertSchema(workoutCompletionsTable).omit({ id: true });

export type InsertWorkoutPlan = z.infer<typeof insertWorkoutPlanSchema>;
export type WorkoutPlan = typeof workoutPlansTable.$inferSelect;
export type WorkoutDay = typeof workoutDaysTable.$inferSelect;
export type WorkoutDayExercise = typeof workoutDayExercisesTable.$inferSelect;
export type WorkoutCompletion = typeof workoutCompletionsTable.$inferSelect;
export type PersonalRecord = typeof personalRecordsTable.$inferSelect;
