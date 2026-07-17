/**
 * Analytics Engine
 *
 * Pure calculation functions + DB-backed aggregation services.
 * No Express logic lives here — only data processing.
 */

import { db } from "@workspace/db";
import {
  workoutCompletionsTable,
  workoutAnalyticsTable,
  exercisePerformanceTable,
  personalRecordsTable,
  exercisesTable,
  userProfilesTable,
} from "@workspace/db";
import type { CompletedExerciseLog } from "@workspace/db";
import { eq, and, gte, desc, sql, count, sum, avg } from "drizzle-orm";

// ─── Pure calculation functions ───────────────────────────────────────────────

/**
 * Volume = Weight (kg) × Reps × Sets  (per set, summed across all sets/exercises)
 * Returns total volume in kg for a completed workout.
 */
export function calculateWorkoutVolume(exercises: CompletedExerciseLog[]): number {
  let total = 0;
  for (const ex of exercises) {
    if (ex.skipped) continue;
    for (const set of ex.sets ?? []) {
      const weight = set.weightKg ?? 0;
      const reps = set.repsCompleted ?? 0;
      total += weight * reps;
    }
  }
  return Math.round(total * 100) / 100;
}

/**
 * Calculates per-exercise progress metrics from a sorted history of
 * exercise performance rows (oldest → newest).
 */
export function calculateExerciseProgress(history: Array<{
  date: Date;
  maxWeightKg: number | null;
  totalVolume: number;
  totalReps: number;
  totalSets: number;
}>): {
  firstDate: Date | null;
  latestDate: Date | null;
  sessions: number;
  weightChangePct: number | null;   // % change first → latest max weight
  volumeChangePct: number | null;   // % change first → latest volume
  strengthTrend: "improving" | "stable" | "declining";
  avgWeightKg: number | null;
  maxWeightEver: number | null;
} {
  if (history.length === 0) {
    return {
      firstDate: null, latestDate: null, sessions: 0,
      weightChangePct: null, volumeChangePct: null,
      strengthTrend: "stable", avgWeightKg: null, maxWeightEver: null,
    };
  }

  const first = history[0];
  const latest = history[history.length - 1];

  const weights = history.map((h) => h.maxWeightKg).filter((w): w is number => w !== null);
  const avgWeightKg = weights.length > 0 ? weights.reduce((s, v) => s + v, 0) / weights.length : null;
  const maxWeightEver = weights.length > 0 ? Math.max(...weights) : null;

  let weightChangePct: number | null = null;
  if (first.maxWeightKg && latest.maxWeightKg) {
    weightChangePct = Math.round(((latest.maxWeightKg - first.maxWeightKg) / first.maxWeightKg) * 100);
  }

  let volumeChangePct: number | null = null;
  if (first.totalVolume > 0 && latest.totalVolume > 0) {
    volumeChangePct = Math.round(((latest.totalVolume - first.totalVolume) / first.totalVolume) * 100);
  }

  // Trend: compare last third vs first third of sessions
  let strengthTrend: "improving" | "stable" | "declining" = "stable";
  if (weights.length >= 3) {
    const third = Math.floor(weights.length / 3);
    const earlyAvg = weights.slice(0, third).reduce((s, v) => s + v, 0) / third;
    const lateAvg = weights.slice(-third).reduce((s, v) => s + v, 0) / third;
    if (lateAvg >= earlyAvg * 1.03) strengthTrend = "improving";
    else if (lateAvg <= earlyAvg * 0.97) strengthTrend = "declining";
  }

  return {
    firstDate: new Date(first.date),
    latestDate: new Date(latest.date),
    sessions: history.length,
    weightChangePct,
    volumeChangePct,
    strengthTrend,
    avgWeightKg: avgWeightKg !== null ? Math.round(avgWeightKg * 10) / 10 : null,
    maxWeightEver,
  };
}

/**
 * Workouts per week over a given number of days.
 */
export function calculateTrainingFrequency(completionDates: Date[], days = 28): number {
  const weeks = days / 7;
  return Math.round((completionDates.length / weeks) * 10) / 10;
}

/**
 * Consistency score 0-100.
 *
 * Formula: (workouts completed in period / target workouts in period) × 100, capped at 100.
 * Target is derived from the user's weeklyWorkoutTarget profile field.
 */
export function calculateConsistencyScore(completed: number, targetPerWeek: number, days: number): number {
  const targetTotal = (targetPerWeek / 7) * days;
  if (targetTotal <= 0) return 0;
  return Math.min(100, Math.round((completed / targetTotal) * 100));
}

// ─── DB-backed service functions ──────────────────────────────────────────────

/**
 * Process a completed workout: compute analytics, save WorkoutAnalytics row,
 * save ExercisePerformance rows, and detect personal records.
 * Called non-blocking from the workout completion route.
 */
export async function processWorkoutAnalytics(
  userId: number,
  completionId: number,
): Promise<void> {
  const [completion] = await db
    .select()
    .from(workoutCompletionsTable)
    .where(
      and(eq(workoutCompletionsTable.id, completionId), eq(workoutCompletionsTable.userId, userId)),
    )
    .limit(1);

  if (!completion) return;

  const exercises = (completion.exercisesCompleted ?? []) as CompletedExerciseLog[];
  const nonSkipped = exercises.filter((e) => !e.skipped);

  // Aggregate counts
  const totalExercises = nonSkipped.length;
  const totalSets = nonSkipped.reduce((s, e) => s + (e.sets?.length ?? 0), 0);
  const totalReps = nonSkipped.reduce(
    (s, e) => s + e.sets.reduce((sr, set) => sr + (set.repsCompleted ?? 0), 0),
    0,
  );
  const totalVolume = calculateWorkoutVolume(exercises);

  // Muscle groups trained — look up exercises by ID
  const exerciseIds = [...new Set(nonSkipped.map((e) => e.exerciseId).filter(Boolean))];
  let muscleGroupsTrained: string[] = [];
  if (exerciseIds.length > 0) {
    const exRows = await db
      .select({ muscleGroups: exercisesTable.muscleGroups })
      .from(exercisesTable)
      .where(sql`${exercisesTable.id} = ANY(${exerciseIds})`);
    const mgSet = new Set<string>();
    for (const row of exRows) for (const mg of row.muscleGroups ?? []) mgSet.add(mg);
    muscleGroupsTrained = [...mgSet].sort();
  }

  // Save / update WorkoutAnalytics row (idempotent)
  await db
    .insert(workoutAnalyticsTable)
    .values({
      userId,
      workoutCompletionId: completionId,
      date: completion.completedAt,
      totalExercises,
      totalSets,
      totalReps,
      totalVolume: totalVolume.toString(),
      workoutDuration: completion.durationMinutes ?? null,
      caloriesEstimated: completion.caloriesBurned ?? null,
      muscleGroupsTrained,
      difficultyRating: completion.difficultyRating ?? null,
    })
    .onConflictDoUpdate({
      target: workoutAnalyticsTable.workoutCompletionId,
      set: {
        totalExercises,
        totalSets,
        totalReps,
        totalVolume: totalVolume.toString(),
        workoutDuration: completion.durationMinutes ?? null,
        caloriesEstimated: completion.caloriesBurned ?? null,
        muscleGroupsTrained,
        difficultyRating: completion.difficultyRating ?? null,
      },
    });

  // Save ExercisePerformance rows + detect PRs
  await Promise.all(
    nonSkipped.map(async (ex) => {
      if (!ex.exerciseId) return;

      const exSets = ex.sets ?? [];
      const exTotalReps = exSets.reduce((s, set) => s + (set.repsCompleted ?? 0), 0);
      const exTotalSets = exSets.length;
      const exWeights = exSets.map((s) => s.weightKg ?? 0).filter((w) => w > 0);
      const maxWeightKg = exWeights.length > 0 ? Math.max(...exWeights) : null;
      const exVolume = exSets.reduce(
        (s, set) => s + (set.weightKg ?? 0) * (set.repsCompleted ?? 0),
        0,
      );

      // Check if this is a PR (max weight for this user × exercise)
      const [existingPR] = await db
        .select({ value: personalRecordsTable.value })
        .from(personalRecordsTable)
        .where(
          and(
            eq(personalRecordsTable.userId, userId),
            eq(personalRecordsTable.exerciseId, ex.exerciseId),
            eq(personalRecordsTable.recordType, "max_weight"),
          ),
        )
        .limit(1);

      const prevBest = existingPR ? Number(existingPR.value) : 0;
      const isPersonalRecord = maxWeightKg !== null && maxWeightKg > prevBest;

      if (isPersonalRecord && maxWeightKg !== null) {
        await db
          .insert(personalRecordsTable)
          .values({
            userId,
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            recordType: "max_weight",
            value: maxWeightKg.toString(),
            unit: "kg",
            achievedAt: completion.completedAt,
            workoutCompletionId: completionId,
          })
          .onConflictDoNothing();
      }

      await db.insert(exercisePerformanceTable).values({
        userId,
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        workoutCompletionId: completionId,
        date: completion.completedAt,
        maxWeightKg: maxWeightKg?.toString() ?? null,
        totalReps: exTotalReps,
        totalSets: exTotalSets,
        totalVolume: exVolume.toString(),
        isPersonalRecord,
      });
    }),
  );
}

// ─── Workout summary ──────────────────────────────────────────────────────────

export async function getWorkoutSummary(userId: number, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [agg] = await db
    .select({
      totalWorkouts: count(),
      totalMinutes: sum(workoutAnalyticsTable.workoutDuration),
      totalVolume: sum(workoutAnalyticsTable.totalVolume),
      totalCalories: sum(workoutAnalyticsTable.caloriesEstimated),
      avgDuration: avg(workoutAnalyticsTable.workoutDuration),
      totalSets: sum(workoutAnalyticsTable.totalSets),
      totalReps: sum(workoutAnalyticsTable.totalReps),
    })
    .from(workoutAnalyticsTable)
    .where(and(eq(workoutAnalyticsTable.userId, userId), gte(workoutAnalyticsTable.date, since)));

  const completionDates = await db
    .select({ date: workoutAnalyticsTable.date })
    .from(workoutAnalyticsTable)
    .where(and(eq(workoutAnalyticsTable.userId, userId), gte(workoutAnalyticsTable.date, since)));

  const [profile] = await db
    .select({ weeklyWorkoutTarget: userProfilesTable.weeklyWorkoutTarget })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  const weeklyTarget = profile?.weeklyWorkoutTarget ?? 3;
  const completed = Number(agg?.totalWorkouts ?? 0);
  const consistency = calculateConsistencyScore(completed, weeklyTarget, days);
  const frequency = calculateTrainingFrequency(completionDates.map((r) => new Date(r.date)), days);

  return {
    totalWorkouts: completed,
    totalMinutes: Number(agg?.totalMinutes ?? 0),
    totalVolume: Math.round(Number(agg?.totalVolume ?? 0)),
    totalCalories: Number(agg?.totalCalories ?? 0),
    avgDuration: Math.round(Number(agg?.avgDuration ?? 0)),
    totalSets: Number(agg?.totalSets ?? 0),
    totalReps: Number(agg?.totalReps ?? 0),
    consistency,
    weeklyFrequency: frequency,
    targetPerWeek: weeklyTarget,
    periodDays: days,
  };
}

// ─── Exercise progress history ────────────────────────────────────────────────

export async function getExerciseProgressHistory(userId: number, exerciseId: number, limit = 30) {
  const rows = await db
    .select()
    .from(exercisePerformanceTable)
    .where(
      and(
        eq(exercisePerformanceTable.userId, userId),
        eq(exercisePerformanceTable.exerciseId, exerciseId),
      ),
    )
    .orderBy(exercisePerformanceTable.date)
    .limit(limit);

  const history = rows.map((r) => ({
    date: new Date(r.date),
    maxWeightKg: r.maxWeightKg !== null ? Number(r.maxWeightKg) : null,
    totalVolume: Number(r.totalVolume),
    totalReps: r.totalReps,
    totalSets: r.totalSets,
    isPersonalRecord: r.isPersonalRecord,
  }));

  const progress = calculateExerciseProgress(history);

  return {
    exerciseId,
    exerciseName: rows[0]?.exerciseName ?? null,
    history,
    progress,
  };
}

// ─── Consistency score ────────────────────────────────────────────────────────

export async function getConsistencyData(userId: number, days = 28) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ date: workoutAnalyticsTable.date })
    .from(workoutAnalyticsTable)
    .where(and(eq(workoutAnalyticsTable.userId, userId), gte(workoutAnalyticsTable.date, since)))
    .orderBy(workoutAnalyticsTable.date);

  const [profile] = await db
    .select({ weeklyWorkoutTarget: userProfilesTable.weeklyWorkoutTarget })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  const weeklyTarget = profile?.weeklyWorkoutTarget ?? 3;
  const completed = rows.length;
  const score = calculateConsistencyScore(completed, weeklyTarget, days);
  const frequency = calculateTrainingFrequency(rows.map((r) => new Date(r.date)), days);

  return {
    score,
    completed,
    targetPerWeek: weeklyTarget,
    totalTarget: Math.round((weeklyTarget / 7) * days),
    weeklyFrequency: frequency,
    periodDays: days,
    workoutDates: rows.map((r) => new Date(r.date).toISOString().split("T")[0]),
  };
}

// ─── AI-prep: full performance summary ───────────────────────────────────────

export async function getUserPerformanceSummary(userId: number): Promise<{
  workoutsCompleted: number;
  strengthTrend: "improving" | "stable" | "declining";
  consistency: number;
  weeklyFrequency: number;
  totalVolumeKg: number;
  avgWorkoutMinutes: number;
  weakAreas: string[];
  strongAreas: string[];
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [agg] = await db
    .select({
      totalWorkouts: count(),
      totalVolume: sum(workoutAnalyticsTable.totalVolume),
      avgDuration: avg(workoutAnalyticsTable.workoutDuration),
    })
    .from(workoutAnalyticsTable)
    .where(and(eq(workoutAnalyticsTable.userId, userId), gte(workoutAnalyticsTable.date, thirtyDaysAgo)));

  const completionDates = await db
    .select({ date: workoutAnalyticsTable.date })
    .from(workoutAnalyticsTable)
    .where(and(eq(workoutAnalyticsTable.userId, userId), gte(workoutAnalyticsTable.date, thirtyDaysAgo)));

  // Muscle group coverage — count occurrences
  const allAnalytics = await db
    .select({ muscleGroupsTrained: workoutAnalyticsTable.muscleGroupsTrained })
    .from(workoutAnalyticsTable)
    .where(and(eq(workoutAnalyticsTable.userId, userId), gte(workoutAnalyticsTable.date, thirtyDaysAgo)));

  const mgCounts = new Map<string, number>();
  for (const row of allAnalytics) {
    for (const mg of (row.muscleGroupsTrained as string[]) ?? []) {
      mgCounts.set(mg, (mgCounts.get(mg) ?? 0) + 1);
    }
  }
  const sorted = [...mgCounts.entries()].sort((a, b) => b[1] - a[1]);
  const strongAreas = sorted.slice(0, 3).map(([mg]) => mg);
  const weakAreas = sorted.slice(-3).filter(([, c]) => c < 2).map(([mg]) => mg);

  // Overall strength trend from recent exercise performance
  const recentPerf = await db
    .select({ date: exercisePerformanceTable.date, maxWeightKg: exercisePerformanceTable.maxWeightKg })
    .from(exercisePerformanceTable)
    .where(and(eq(exercisePerformanceTable.userId, userId), gte(exercisePerformanceTable.date, thirtyDaysAgo)))
    .orderBy(exercisePerformanceTable.date);

  const perfHistory = recentPerf.map((r) => ({
    date: new Date(r.date),
    maxWeightKg: r.maxWeightKg !== null ? Number(r.maxWeightKg) : null,
    totalVolume: 0,
    totalReps: 0,
    totalSets: 0,
  }));
  const { strengthTrend } = calculateExerciseProgress(perfHistory);

  const [profile] = await db
    .select({ weeklyWorkoutTarget: userProfilesTable.weeklyWorkoutTarget })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  const weeklyTarget = profile?.weeklyWorkoutTarget ?? 3;
  const completed = Number(agg?.totalWorkouts ?? 0);

  return {
    workoutsCompleted: completed,
    strengthTrend,
    consistency: calculateConsistencyScore(completed, weeklyTarget, 30),
    weeklyFrequency: calculateTrainingFrequency(completionDates.map((r) => new Date(r.date)), 30),
    totalVolumeKg: Math.round(Number(agg?.totalVolume ?? 0)),
    avgWorkoutMinutes: Math.round(Number(agg?.avgDuration ?? 0)),
    weakAreas,
    strongAreas,
  };
}
