import { pgTable, serial, text, integer, timestamp, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const goalCategoryEnum = pgEnum("goal_category", [
  "weight_loss",
  "weight_gain",
  "muscle_gain",
  "strength",
  "endurance",
  "body_fat",
  "workout_consistency",
  "custom",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "completed",
  "paused",
  "cancelled",
  "expired",
]);

export const goalPriorityEnum = pgEnum("goal_priority", [
  "high",
  "medium",
  "low",
]);

// ─── Goals Table ──────────────────────────────────────────────────────────────

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: goalCategoryEnum("category").notNull(),
  targetValue: numeric("target_value", { precision: 10, scale: 2 }),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),
  unit: text("unit"),                          // kg, %, workouts/week, reps, etc.
  startDate: timestamp("start_date").notNull().defaultNow(),
  targetDate: timestamp("target_date"),
  priority: goalPriorityEnum("priority").notNull().default("medium"),
  status: goalStatusEnum("status").notNull().default("active"),
  isPrimary: boolean("is_primary").notNull().default(false),
  // Progress tracking (computed and cached on each update)
  progressPercentage: numeric("progress_percentage", { precision: 5, scale: 2 }).default("0"),
  referenceValue: numeric("reference_value", { precision: 10, scale: 2 }),  // starting value at goal creation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Zod schemas ──────────────────────────────────────────────────────────────

export const insertGoalSchema = createInsertSchema(goalsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  targetValue: z.union([z.string(), z.number()]).optional(),
  currentValue: z.union([z.string(), z.number()]).optional(),
});

export const updateGoalSchema = insertGoalSchema.partial();

// ─── Types ────────────────────────────────────────────────────────────────────

export type Goal = typeof goalsTable.$inferSelect;
export type InsertGoal = typeof goalsTable.$inferInsert;
export type GoalCategory = Goal["category"];
export type GoalStatus = Goal["status"];
export type GoalPriority = Goal["priority"];
