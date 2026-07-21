/**
 * Workout Template Service
 *
 * Reusable logic for the Workout Templates system (Phase 1 — Foundation).
 * A template is a user-named, reusable reference to an existing workout plan;
 * it never duplicates the underlying workout data.
 *
 * Used by: workout-templates routes.
 */

import { db } from "@workspace/db";
import { workoutTemplatesTable, workoutPlansTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";

export type WorkoutTemplateRecord = typeof workoutTemplatesTable.$inferSelect;

// A template joined with its underlying workout's name, ready for serialization.
export type WorkoutTemplateWithWorkout = WorkoutTemplateRecord & {
  workoutName: string;
};

export function serializeWorkoutTemplate(row: WorkoutTemplateWithWorkout) {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    workoutId: row.workoutId,
    workoutName: row.workoutName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Resolve a workout that belongs to the given user. Returns null when the
// workout does not exist or is owned by someone else.
export async function findUserWorkout(userId: number, workoutId: number) {
  const [workout] = await db
    .select({ id: workoutPlansTable.id, name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, workoutId), eq(workoutPlansTable.userId, userId)))
    .limit(1);
  return workout ?? null;
}

// Case-insensitive lookup of an existing template name for a user.
export async function findTemplateByName(userId: number, name: string) {
  const templates = await db
    .select({ id: workoutTemplatesTable.id, name: workoutTemplatesTable.name })
    .from(workoutTemplatesTable)
    .where(eq(workoutTemplatesTable.userId, userId));
  const target = name.trim().toLowerCase();
  return templates.find((t) => t.name.trim().toLowerCase() === target) ?? null;
}

export async function listUserWorkoutTemplates(userId: number) {
  const rows = await db
    .select({
      id: workoutTemplatesTable.id,
      userId: workoutTemplatesTable.userId,
      name: workoutTemplatesTable.name,
      workoutId: workoutTemplatesTable.workoutId,
      createdAt: workoutTemplatesTable.createdAt,
      updatedAt: workoutTemplatesTable.updatedAt,
      workoutName: workoutPlansTable.name,
    })
    .from(workoutTemplatesTable)
    .innerJoin(workoutPlansTable, eq(workoutTemplatesTable.workoutId, workoutPlansTable.id))
    .where(eq(workoutTemplatesTable.userId, userId))
    .orderBy(desc(workoutTemplatesTable.createdAt));

  return rows.map(serializeWorkoutTemplate);
}

export async function createUserWorkoutTemplate(
  userId: number,
  name: string,
  workoutId: number,
  workoutName: string,
) {
  const [row] = await db
    .insert(workoutTemplatesTable)
    .values({ userId, name: name.trim(), workoutId })
    .returning();

  return serializeWorkoutTemplate({ ...row, workoutName });
}
