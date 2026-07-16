import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// ─── Existing AI Chat tables ────────────────────────────────────────────────

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const conversationsTable = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  lastMessageAt: timestamp("last_message_at"),
  messageCount: integer("message_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── AI Workout Generation tables ───────────────────────────────────────────

export type GeneratedExercise = {
  exerciseId: number;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  tempo?: string;
  estimatedCaloriesPerSet: number;
  muscleGroups: string[];
  equipment: string[];
  reasoning: string;
};

export type GeneratedDay = {
  dayOfWeek: number;
  dayName: string;
  title: string;
  focusArea: string;
  estimatedDurationMinutes: number;
  estimatedCalories: number;
  exercises: GeneratedExercise[];
  reasoning: string;
};

export type ScoreBreakdown = {
  goalMatch: number;
  equipmentMatch: number;
  levelMatch: number;
  historyScore: number;
  profileComplete: number;
  total: number;
  improvementTips: string[];
};

export type GeneratedPlan = {
  name: string;
  description: string;
  goal: string;
  split: string;
  durationWeeks: number;
  difficulty: string;
  days: GeneratedDay[];
  overallReasoning: string;
  adaptationNotes: string;
  progressionRecommendation: string;
};

export const aiGeneratedWorkoutsTable = pgTable("ai_generated_workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  workoutPlanId: integer("workout_plan_id"), // set after user saves
  generatedPlan: jsonb("generated_plan").notNull().$type<GeneratedPlan>(),
  reasoning: text("reasoning"),
  personalizationScore: integer("personalization_score"),
  scoreBreakdown: jsonb("score_breakdown").$type<ScoreBreakdown>(),
  status: text("status").default("draft").notNull(), // draft | saved | rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workoutAdaptationsTable = pgTable("workout_adaptations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  previousWorkoutId: integer("previous_workout_id"),
  newWorkoutId: integer("new_workout_id"),
  adaptationType: text("adaptation_type").notNull(), // progressive_overload | deload | missed_workouts | exercise_swap
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generationHistoryTable = pgTable("generation_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  goal: text("goal"),
  durationMinutes: integer("duration_minutes"),
  successRating: integer("success_rating"), // 1-5
  generationDate: timestamp("generation_date").defaultNow().notNull(),
});

// ─── Schemas and types ───────────────────────────────────────────────────────

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({ id: true, createdAt: true, messageCount: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export const insertAiGeneratedWorkoutSchema = createInsertSchema(aiGeneratedWorkoutsTable).omit({ id: true, createdAt: true });

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type AiGeneratedWorkout = typeof aiGeneratedWorkoutsTable.$inferSelect;
export type WorkoutAdaptation = typeof workoutAdaptationsTable.$inferSelect;
export type GenerationHistory = typeof generationHistoryTable.$inferSelect;
