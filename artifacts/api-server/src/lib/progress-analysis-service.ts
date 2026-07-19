import { db } from "@workspace/db";
import {
  goalsTable,
  progressEntriesTable,
  progressPhotosTable,
  workoutCompletionsTable,
  personalRecordsTable,
} from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressSummary = {
  goals: {
    active: number;
    completed: number;
  };
  bodyMeasurements: {
    latestDate: string | null;
    latestWeight: number | null;
    latestBodyFat: number | null;
  };
  progressPhotos: {
    total: number;
  };
  workouts: {
    totalCompleted: number;
    currentStreak: number;
  };
  personalRecords: {
    total: number;
    latest: {
      exerciseName: string;
      recordType: string;
      value: number;
      unit: string;
      achievedAt: string;
    } | null;
  };
};

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Aggregates all progress data for a given user into a single structured object.
 * Handles new users and missing data gracefully — all fields default to zero/null.
 * Designed to be reused by future AI Coach features.
 */
export async function getUserProgressSummary(userId: number): Promise<ProgressSummary> {
  // Run all DB queries concurrently
  const [
    activeGoalsResult,
    completedGoalsResult,
    latestMeasurementRows,
    photoCountResult,
    workoutCompletionRows,
    latestPRRows,
    prCountResult,
  ] = await Promise.all([
    // Active goals count
    db
      .select({ count: count() })
      .from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "active"))),

    // Completed goals count
    db
      .select({ count: count() })
      .from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "completed"))),

    // Latest body measurement entry
    db
      .select()
      .from(progressEntriesTable)
      .where(eq(progressEntriesTable.userId, userId))
      .orderBy(desc(progressEntriesTable.loggedAt))
      .limit(1),

    // Total progress photos
    db
      .select({ count: count() })
      .from(progressPhotosTable)
      .where(eq(progressPhotosTable.userId, userId)),

    // Workout completions (all, for count + streak calculation)
    db
      .select({ completedAt: workoutCompletionsTable.completedAt })
      .from(workoutCompletionsTable)
      .where(eq(workoutCompletionsTable.userId, userId))
      .orderBy(workoutCompletionsTable.completedAt),

    // Latest personal record
    db
      .select()
      .from(personalRecordsTable)
      .where(eq(personalRecordsTable.userId, userId))
      .orderBy(desc(personalRecordsTable.achievedAt))
      .limit(1),

    // Total personal records count
    db
      .select({ count: count() })
      .from(personalRecordsTable)
      .where(eq(personalRecordsTable.userId, userId)),
  ]);

  // ─── Workout streak ─────────────────────────────────────────────────────────
  let currentStreak = 0;
  if (workoutCompletionRows.length > 0) {
    // Deduplicate by calendar day, sort descending, walk back from today
    const days = new Set(
      workoutCompletionRows.map((c) => c.completedAt.toISOString().split("T")[0]),
    );
    const sortedDays = [...days].sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    let checkDate = today;
    for (const day of sortedDays) {
      if (day === checkDate) {
        currentStreak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split("T")[0];
      } else {
        break;
      }
    }
  }

  const measurement = latestMeasurementRows[0] ?? null;
  const pr = latestPRRows[0] ?? null;

  return {
    goals: {
      active: activeGoalsResult[0]?.count ?? 0,
      completed: completedGoalsResult[0]?.count ?? 0,
    },
    bodyMeasurements: {
      latestDate: measurement ? measurement.loggedAt.toISOString() : null,
      latestWeight: measurement?.weightKg ? Number(measurement.weightKg) : null,
      latestBodyFat: measurement?.bodyFatPercent
        ? Number(measurement.bodyFatPercent)
        : null,
    },
    progressPhotos: {
      total: photoCountResult[0]?.count ?? 0,
    },
    workouts: {
      totalCompleted: workoutCompletionRows.length,
      currentStreak,
    },
    personalRecords: {
      total: prCountResult[0]?.count ?? 0,
      latest: pr
        ? {
            exerciseName: pr.exerciseName,
            recordType: pr.recordType,
            value: Number(pr.value),
            unit: pr.unit,
            achievedAt: pr.achievedAt.toISOString(),
          }
        : null,
    },
  };
}
