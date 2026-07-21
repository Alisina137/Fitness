import { pgTable, serial, text, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { workoutPlansTable } from "./workouts";

// ─── Workout Templates ────────────────────────────────────────────────────────
// A reusable, user-named reference to an existing workout plan. Templates never
// duplicate workout data — they point at the underlying workout via workoutId.

export const workoutTemplatesTable = pgTable(
  "workout_templates",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    workoutId: integer("workout_id")
      .notNull()
      .references(() => workoutPlansTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [unique("workout_templates_user_name").on(t.userId, t.name)],
);

export const insertWorkoutTemplateSchema = createInsertSchema(workoutTemplatesTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type WorkoutTemplateRow = typeof workoutTemplatesTable.$inferSelect;
export type InsertWorkoutTemplate = z.infer<typeof insertWorkoutTemplateSchema>;
