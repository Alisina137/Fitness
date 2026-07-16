import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "premium", "elite"]);
export const genderEnum = pgEnum("gender", ["male", "female", "non_binary", "prefer_not_to_say"]);

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
  age: integer("age"),
  gender: genderEnum("gender"),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  fitnessLevel: text("fitness_level").default("beginner").notNull(),
  goals: text("goals").array().default([]).notNull(),
  equipmentAvailable: text("equipment_available").array().default([]).notNull(),
  injuries: text("injuries").array().default([]).notNull(),
  weeklyWorkoutTarget: integer("weekly_workout_target").default(3),
  calorieGoal: integer("calorie_goal").default(2000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({ id: true, updatedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type UserProfile = typeof userProfilesTable.$inferSelect;
