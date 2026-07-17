/**
 * Personal Records Engine
 *
 * Detects and persists all PR types after workout completion.
 * Single source of truth for personalRecordsTable writes.
 *
 * Record types:
 *   max_weight       — heaviest single set (kg)
 *   max_reps         — most reps in a single set
 *   max_volume       — weight × reps across all sets for one exercise
 *   longest_streak   — consecutive calendar days with a workout (exerciseId = 0)
 */

import { db } from "@workspace/db";
import {
  personalRecordsTable,
  workoutCompletionsTable,
} from "@workspace/db";
import type { CompletedExerciseLog } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Improvement as a percentage (positive = improvement). */
export function calculateImprovement(previous: number, current: number): number {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 10000) / 100; // 2 dp
}

/** Unit string for each record type. */
function unitFor(recordType: string): string {
  switch (recordType) {
    case "max_weight": return "kg";
    case "max_reps":   return "reps";
    case "max_volume": return "kg";
    case "longest_streak": return "days";
    case "fastest_time":   return "seconds";
    default: return "";
  }
}

// ─── Core PR check / save ─────────────────────────────────────────────────────

/**
 * Check whether `newValue` beats the stored record for this user + exercise +
 * recordType. Returns the previous best (null if first time) and whether it's
 * a new record.
 */
export async function checkNewPersonalRecord(
  userId: number,
  exerciseId: number,
  recordType: string,
  newValue: number,
): Promise<{ isNew: boolean; previousValue: number | null; existing: typeof personalRecordsTable.$inferSelect | null }> {
  const [existing] = await db
    .select()
    .from(personalRecordsTable)
    .where(
      and(
        eq(personalRecordsTable.userId, userId),
        eq(personalRecordsTable.exerciseId, exerciseId),
        eq(personalRecordsTable.recordType, recordType),
      ),
    )
    .limit(1);

  const previousValue = existing ? Number(existing.value) : null;
  const isNew = previousValue === null || newValue > previousValue;

  return { isNew, previousValue, existing: existing ?? null };
}

/**
 * Upsert a personal record row. Creates a new one on first occurrence;
 * updates value + previousValue + improvement on subsequent beats.
 */
export async function savePersonalRecord(opts: {
  userId: number;
  exerciseId: number;
  exerciseName: string;
  recordType: string;
  newValue: number;
  previousValue: number | null;
  workoutCompletionId?: number;
  achievedAt?: Date;
}): Promise<typeof personalRecordsTable.$inferSelect> {
  const { userId, exerciseId, exerciseName, recordType, newValue, previousValue, workoutCompletionId, achievedAt } = opts;
  const improvement = previousValue !== null ? calculateImprovement(previousValue, newValue) : null;

  const [existing] = await db
    .select({ id: personalRecordsTable.id })
    .from(personalRecordsTable)
    .where(
      and(
        eq(personalRecordsTable.userId, userId),
        eq(personalRecordsTable.exerciseId, exerciseId),
        eq(personalRecordsTable.recordType, recordType),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(personalRecordsTable)
      .set({
        value: newValue.toString(),
        previousValue: previousValue?.toString() ?? null,
        improvementPercentage: improvement?.toString() ?? null,
        achievedAt: achievedAt ?? new Date(),
        workoutCompletionId: workoutCompletionId ?? null,
      })
      .where(eq(personalRecordsTable.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(personalRecordsTable)
    .values({
      userId,
      exerciseId,
      exerciseName,
      recordType,
      value: newValue.toString(),
      previousValue: previousValue?.toString() ?? null,
      improvementPercentage: improvement?.toString() ?? null,
      unit: unitFor(recordType),
      achievedAt: achievedAt ?? new Date(),
      workoutCompletionId: workoutCompletionId ?? null,
    })
    .returning();

  return inserted;
}

// ─── Streak calculation ───────────────────────────────────────────────────────

/**
 * Count the user's current consecutive-day streak ending on `today`.
 * Also returns the all-time longest streak.
 */
async function calculateStreaks(userId: number): Promise<{ current: number; longest: number }> {
  // Fetch distinct calendar dates of all completions, newest first
  const rows = await db
    .select({ completedAt: workoutCompletionsTable.completedAt })
    .from(workoutCompletionsTable)
    .where(eq(workoutCompletionsTable.userId, userId))
    .orderBy(desc(workoutCompletionsTable.completedAt));

  if (rows.length === 0) return { current: 0, longest: 0 };

  // Deduplicate to calendar dates
  const dates = [
    ...new Set(rows.map((r) => new Date(r.completedAt).toISOString().split("T")[0])),
  ].sort().reverse(); // newest first

  let current = 1;
  let longest = 1;
  let runLength = 1;

  const todayStr = new Date().toISOString().split("T")[0];
  const latestStr = dates[0];

  // Current streak: must include today or yesterday
  const latestDate = new Date(latestStr);
  const todayDate = new Date(todayStr);
  const daysSinceLast = Math.floor((todayDate.getTime() - latestDate.getTime()) / 86_400_000);

  if (daysSinceLast > 1) {
    // Gap — current streak broken
    current = 0;
  } else {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86_400_000);
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak: scan all dates
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = Math.floor((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diff === 1) {
      runLength++;
      if (runLength > longest) longest = runLength;
    } else {
      runLength = 1;
    }
  }

  return { current, longest };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export type PRResult = {
  exerciseId: number;
  exerciseName: string;
  recordType: string;
  newValue: number;
  previousValue: number | null;
  improvementPercentage: number | null;
  unit: string;
  isFirstRecord: boolean;
};

/**
 * Detect and persist all PR types for a just-completed workout.
 * Called non-blocking after workout completion.
 *
 * Checks: max_weight, max_reps, max_volume per exercise + longest_streak global.
 */
export async function detectAndSavePRs(
  userId: number,
  completionId: number,
): Promise<PRResult[]> {
  const [completion] = await db
    .select()
    .from(workoutCompletionsTable)
    .where(
      and(
        eq(workoutCompletionsTable.id, completionId),
        eq(workoutCompletionsTable.userId, userId),
      ),
    )
    .limit(1);

  if (!completion) return [];

  const exercises = (completion.exercisesCompleted ?? []) as CompletedExerciseLog[];
  const achieved = completion.completedAt;
  const newPRs: PRResult[] = [];

  for (const ex of exercises) {
    if (ex.skipped || !ex.exerciseId || !ex.sets?.length) continue;

    const sets = ex.sets;

    // ── max_weight ──────────────────────────────────────────────────────────
    const weights = sets.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
    if (weights.length > 0) {
      const maxWeight = Math.max(...weights);
      const check = await checkNewPersonalRecord(userId, ex.exerciseId, "max_weight", maxWeight);
      if (check.isNew) {
        await savePersonalRecord({
          userId, exerciseId: ex.exerciseId, exerciseName: ex.name,
          recordType: "max_weight", newValue: maxWeight,
          previousValue: check.previousValue, workoutCompletionId: completionId, achievedAt: achieved,
        });
        newPRs.push({
          exerciseId: ex.exerciseId, exerciseName: ex.name, recordType: "max_weight",
          newValue: maxWeight, previousValue: check.previousValue,
          improvementPercentage: check.previousValue !== null ? calculateImprovement(check.previousValue, maxWeight) : null,
          unit: "kg", isFirstRecord: check.previousValue === null,
        });
      }
    }

    // ── max_reps (single set) ───────────────────────────────────────────────
    const repCounts = sets.map((s) => s.repsCompleted ?? 0).filter((r) => r > 0);
    if (repCounts.length > 0) {
      const maxReps = Math.max(...repCounts);
      const check = await checkNewPersonalRecord(userId, ex.exerciseId, "max_reps", maxReps);
      if (check.isNew) {
        await savePersonalRecord({
          userId, exerciseId: ex.exerciseId, exerciseName: ex.name,
          recordType: "max_reps", newValue: maxReps,
          previousValue: check.previousValue, workoutCompletionId: completionId, achievedAt: achieved,
        });
        newPRs.push({
          exerciseId: ex.exerciseId, exerciseName: ex.name, recordType: "max_reps",
          newValue: maxReps, previousValue: check.previousValue,
          improvementPercentage: check.previousValue !== null ? calculateImprovement(check.previousValue, maxReps) : null,
          unit: "reps", isFirstRecord: check.previousValue === null,
        });
      }
    }

    // ── max_volume (weight × reps, summed across sets) ─────────────────────
    const totalVolume = sets.reduce(
      (sum, s) => sum + (s.weightKg ?? 0) * (s.repsCompleted ?? 0),
      0,
    );
    if (totalVolume > 0) {
      const check = await checkNewPersonalRecord(userId, ex.exerciseId, "max_volume", totalVolume);
      if (check.isNew) {
        await savePersonalRecord({
          userId, exerciseId: ex.exerciseId, exerciseName: ex.name,
          recordType: "max_volume", newValue: totalVolume,
          previousValue: check.previousValue, workoutCompletionId: completionId, achievedAt: achieved,
        });
        newPRs.push({
          exerciseId: ex.exerciseId, exerciseName: ex.name, recordType: "max_volume",
          newValue: totalVolume, previousValue: check.previousValue,
          improvementPercentage: check.previousValue !== null ? calculateImprovement(check.previousValue, totalVolume) : null,
          unit: "kg", isFirstRecord: check.previousValue === null,
        });
      }
    }
  }

  // ── longest_streak (global, exerciseId = 0) ─────────────────────────────
  const { current: currentStreak, longest: longestStreak } = await calculateStreaks(userId);
  const streakToRecord = Math.max(currentStreak, longestStreak);

  if (streakToRecord > 0) {
    const check = await checkNewPersonalRecord(userId, 0, "longest_streak", streakToRecord);
    if (check.isNew) {
      await savePersonalRecord({
        userId, exerciseId: 0, exerciseName: "Workout Streak",
        recordType: "longest_streak", newValue: streakToRecord,
        previousValue: check.previousValue, workoutCompletionId: completionId, achievedAt: achieved,
      });
      newPRs.push({
        exerciseId: 0, exerciseName: "Workout Streak", recordType: "longest_streak",
        newValue: streakToRecord, previousValue: check.previousValue,
        improvementPercentage: check.previousValue !== null ? calculateImprovement(check.previousValue, streakToRecord) : null,
        unit: "days", isFirstRecord: check.previousValue === null,
      });
    }
  }

  return newPRs;
}
