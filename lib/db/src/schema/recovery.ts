import {
  pgTable, serial, integer, text, real, timestamp, jsonb, date, unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Recovery Profile ─────────────────────────────────────────────────────────
// One per user — updated after every check-in or workout

export const recoveryProfilesTable = pgTable("recovery_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  recoveryScore: integer("recovery_score").default(75).notNull(),
  readinessScore: integer("readiness_score").default(75).notNull(),
  fatigueLevel: text("fatigue_level").default("normal").notNull(), // normal | high | overtraining_risk
  recoveryTrend: text("recovery_trend").default("stable").notNull(), // improving | stable | declining
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// ─── Daily Check-In ───────────────────────────────────────────────────────────
// One per user per day (enforced by unique constraint)

export const dailyCheckInsTable = pgTable("daily_check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  sleepQuality: text("sleep_quality").notNull(), // excellent | good | average | poor
  energyLevel: integer("energy_level").notNull(), // 1-10
  stressLevel: integer("stress_level").notNull(), // 1-10
  muscleSoreness: integer("muscle_soreness").notNull(), // 1-10
  motivationLevel: integer("motivation_level").notNull(), // 1-10
  mood: text("mood"), // great | good | neutral | low
  notes: text("notes"),
  recoveryScore: integer("recovery_score"), // calculated on save
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("daily_check_ins_user_date").on(t.userId, t.date)]);

// ─── Muscle Recovery ──────────────────────────────────────────────────────────
// One row per user per muscle group, upserted after workouts and check-ins

export const muscleRecoveryTable = pgTable("muscle_recovery", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  muscleGroup: text("muscle_group").notNull(),
  lastTrainedDate: timestamp("last_trained_date"),
  trainingVolume: integer("training_volume").default(0).notNull(), // # exercises in last session
  sorenessLevel: integer("soreness_level").default(0).notNull(), // 0-10
  recoveryPercentage: integer("recovery_percentage").default(100).notNull(), // 0-100
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique("muscle_recovery_user_muscle").on(t.userId, t.muscleGroup)]);

// ─── Recovery Scores ──────────────────────────────────────────────────────────
// Computed score records — one per user per day, upserted on every calculation.
// Stores the full factor breakdown alongside the final score for analytics.

export const recoveryScoresTable = pgTable("recovery_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  recoveryScore: integer("recovery_score").notNull(),
  recoveryStatus: text("recovery_status").notNull(), // excellent | good | moderate | poor
  calculationDetails: jsonb("calculation_details").notNull(), // { sleep, energy, soreness, stress, motivation, weighted }
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("recovery_scores_user_date").on(t.userId, t.date)]);

// ─── Wearable Data ────────────────────────────────────────────────────────────
// Prepared for future wearable integrations (not yet connected)
// Supports: apple_health | google_fit | whoop | oura | garmin | fitbit

export const wearableDataTable = pgTable("wearable_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  dataType: text("data_type").notNull(), // hrv | resting_hr | sleep_duration | sleep_stages | steps | spo2 | respiratory_rate
  value: real("value"),
  unit: text("unit"),
  recordedAt: timestamp("recorded_at").notNull(),
  metadata: jsonb("metadata"), // raw payload from integration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const insertDailyCheckInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepQuality: z.enum(["excellent", "good", "average", "poor"]),
  energyLevel: z.number().int().min(1).max(10),
  stressLevel: z.number().int().min(1).max(10),
  muscleSoreness: z.number().int().min(1).max(10),
  motivationLevel: z.number().int().min(1).max(10),
  mood: z.enum(["great", "good", "neutral", "low"]).optional(),
  notes: z.string().max(500).optional(),
});

// ─── TypeScript types ─────────────────────────────────────────────────────────

export type RecoveryProfile = typeof recoveryProfilesTable.$inferSelect;
export type DailyCheckIn = typeof dailyCheckInsTable.$inferSelect;
export type MuscleRecovery = typeof muscleRecoveryTable.$inferSelect;
export type WearableData = typeof wearableDataTable.$inferSelect;
export type RecoveryScore = typeof recoveryScoresTable.$inferSelect;
export type InsertDailyCheckIn = z.infer<typeof insertDailyCheckInSchema>;

/** Per-factor scores (0-100) that make up the recovery score. */
export type ScoreBreakdown = {
  sleep: number;       // 0-100, weight 30%
  energy: number;      // 0-100, weight 25%
  soreness: number;    // 0-100, weight 20% (inverted from soreness input)
  stress: number;      // 0-100, weight 15% (inverted from stress input)
  motivation: number;  // 0-100, weight 10%
};

export type FatigueLevel = "normal" | "high" | "overtraining_risk";
export type RecoveryTrend = "improving" | "stable" | "declining";
export type ReadinessCategory = "excellent" | "good" | "moderate" | "poor";

export type RecoveryContext = {
  recoveryScore: number;
  readinessCategory: ReadinessCategory;
  fatigueLevel: FatigueLevel;
  intensityModifier: number;        // 0.65–1.0 multiplier for AI engine
  fatiguedMuscles: string[];        // muscle groups below 60% recovery
};
