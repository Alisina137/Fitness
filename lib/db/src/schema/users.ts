import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "premium", "elite"]);
export const genderEnum = pgEnum("gender", ["male", "female", "non_binary", "prefer_not_to_say"]);
export const activityLevelEnum = pgEnum("activity_level", ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"]);
export const workoutLocationEnum = pgEnum("workout_location", ["home", "gym", "outdoor", "mixed"]);
export const dietPreferenceEnum = pgEnum("diet_preference", ["no_preference", "high_protein", "vegetarian", "vegan", "keto", "mediterranean", "low_carb"]);
export const motivationEnum = pgEnum("motivation", ["look_better", "feel_healthier", "build_confidence", "improve_performance", "prepare_for_event"]);
export const sleepHoursEnum = pgEnum("sleep_hours", ["lt5", "h5_7", "h7_9", "gt9"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("free").notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }).unique(),

  // Basic info
  age: integer("age"),
  gender: genderEnum("gender"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),

  // Goals
  primaryGoal: text("primary_goal"),
  secondaryGoals: text("secondary_goals").array().default([]).notNull(),

  // Experience & activity
  fitnessLevel: text("fitness_level").default("beginner").notNull(),
  activityLevel: activityLevelEnum("activity_level"),

  // Workout preferences
  workoutLocation: workoutLocationEnum("workout_location"),
  equipmentAvailable: text("equipment_available").array().default([]).notNull(),
  weeklyWorkoutTarget: integer("weekly_workout_target").default(3),
  workoutDurationMinutes: integer("workout_duration_minutes"),

  // Health
  injuries: text("injuries").array().default([]).notNull(),
  injuryNotes: text("injury_notes"),

  // Nutrition
  dietPreference: dietPreferenceEnum("diet_preference"),
  foodRestrictions: text("food_restrictions").array().default([]).notNull(),

  // Lifestyle
  motivation: motivationEnum("motivation"),
  sleepHours: sleepHoursEnum("sleep_hours"),

  // Legacy / compatibility
  goals: text("goals").array().default([]).notNull(),
  calorieGoal: integer("calorie_goal").default(2000),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ id: true, updatedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type UserProfile = typeof userProfilesTable.$inferSelect;
