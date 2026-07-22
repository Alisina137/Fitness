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
    isFavorite: row.isFavorite,
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
      isFavorite: workoutTemplatesTable.isFavorite,
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

// Look up a single template by ID, verifying it belongs to the user.
export async function findTemplateById(userId: number, templateId: number) {
  const rows = await db
    .select({
      id: workoutTemplatesTable.id,
      userId: workoutTemplatesTable.userId,
      name: workoutTemplatesTable.name,
      workoutId: workoutTemplatesTable.workoutId,
      isFavorite: workoutTemplatesTable.isFavorite,
      createdAt: workoutTemplatesTable.createdAt,
      updatedAt: workoutTemplatesTable.updatedAt,
      workoutName: workoutPlansTable.name,
    })
    .from(workoutTemplatesTable)
    .innerJoin(workoutPlansTable, eq(workoutTemplatesTable.workoutId, workoutPlansTable.id))
    .where(
      and(
        eq(workoutTemplatesTable.id, templateId),
        eq(workoutTemplatesTable.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ? serializeWorkoutTemplate(rows[0]) : null;
}

// Case-insensitive duplicate name check that excludes the template being edited.
export async function findTemplateByNameExcluding(
  userId: number,
  name: string,
  excludeId: number,
) {
  const templates = await db
    .select({ id: workoutTemplatesTable.id, name: workoutTemplatesTable.name })
    .from(workoutTemplatesTable)
    .where(and(eq(workoutTemplatesTable.userId, userId)));
  const target = name.trim().toLowerCase();
  return (
    templates.find(
      (t) => t.id !== excludeId && t.name.trim().toLowerCase() === target,
    ) ?? null
  );
}

// Rename a template; returns the updated record.
export async function updateWorkoutTemplate(
  userId: number,
  templateId: number,
  newName: string,
) {
  const [updated] = await db
    .update(workoutTemplatesTable)
    .set({ name: newName.trim(), updatedAt: new Date() })
    .where(
      and(
        eq(workoutTemplatesTable.id, templateId),
        eq(workoutTemplatesTable.userId, userId),
      ),
    )
    .returning();
  return updated ?? null;
}

// Generate a unique copy name for a template. Tries "Name (Copy)", then
// "Name (Copy 2)", "Name (Copy 3)", … until an unused name is found.
export async function generateCopyName(userId: number, originalName: string): Promise<string> {
  const existing = await db
    .select({ name: workoutTemplatesTable.name })
    .from(workoutTemplatesTable)
    .where(eq(workoutTemplatesTable.userId, userId));

  const taken = new Set(existing.map((t) => t.name.trim().toLowerCase()));

  const base = `${originalName} (Copy)`;
  if (!taken.has(base.toLowerCase())) return base;

  for (let n = 2; ; n++) {
    const candidate = `${originalName} (Copy ${n})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

// Duplicate a template: create a new row referencing the same workout with a
// generated unique name. Returns the new template, or null when the source
// template does not exist or belongs to a different user.
export async function duplicateWorkoutTemplate(
  userId: number,
  templateId: number,
): Promise<ReturnType<typeof serializeWorkoutTemplate> | null> {
  const source = await findTemplateById(userId, templateId);
  if (!source) return null;

  const copyName = await generateCopyName(userId, source.name);

  const [newRow] = await db
    .insert(workoutTemplatesTable)
    .values({ userId, name: copyName, workoutId: source.workoutId })
    .returning();

  return serializeWorkoutTemplate({ ...newRow, workoutName: source.workoutName });
}

// Toggle the isFavorite flag on a template. Returns the updated serialized
// template, or null when the template does not exist / belong to the user.
export async function toggleTemplateFavorite(
  userId: number,
  templateId: number,
): Promise<ReturnType<typeof serializeWorkoutTemplate> | null> {
  const current = await findTemplateById(userId, templateId);
  if (!current) return null;

  const [updated] = await db
    .update(workoutTemplatesTable)
    .set({ isFavorite: !current.isFavorite, updatedAt: new Date() })
    .where(
      and(
        eq(workoutTemplatesTable.id, templateId),
        eq(workoutTemplatesTable.userId, userId),
      ),
    )
    .returning();

  if (!updated) return null;
  return serializeWorkoutTemplate({ ...updated, workoutName: current.workoutName });
}

// Delete a template owned by the user. Returns true when a row was removed.
export async function deleteWorkoutTemplate(
  userId: number,
  templateId: number,
): Promise<boolean> {
  const result = await db
    .delete(workoutTemplatesTable)
    .where(
      and(
        eq(workoutTemplatesTable.id, templateId),
        eq(workoutTemplatesTable.userId, userId),
      ),
    )
    .returning({ id: workoutTemplatesTable.id });
  return result.length > 0;
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
