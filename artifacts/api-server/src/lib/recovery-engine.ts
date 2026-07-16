import { db } from "@workspace/db";
import {
  recoveryProfilesTable,
  dailyCheckInsTable,
  muscleRecoveryTable,
  workoutCompletionsTable,
  exercisesTable,
  userProfilesTable,
} from "@workspace/db";
import type {
  InsertDailyCheckIn,
  RecoveryContext,
  FatigueLevel,
  ReadinessCategory,
} from "@workspace/db";
import type { CompletedExerciseLog } from "@workspace/db";
import { eq, desc, gte, and, sql } from "drizzle-orm";

// ─── Constants ────────────────────────────────────────────────────────────────

/** All muscle groups tracked by the system */
export const TRACKED_MUSCLES = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Quadriceps", "Hamstrings", "Glutes", "Calves", "Core", "Abs",
] as const;

/** Hours to full recovery by muscle group (volume-adjusted below) */
const RECOVERY_HOURS: Record<string, number> = {
  Chest: 72, Back: 72, Quadriceps: 72, Hamstrings: 72, Glutes: 72,
  Shoulders: 48, Biceps: 48, Triceps: 48,
  Core: 36, Abs: 36, Calves: 36,
};

const SLEEP_SCORES: Record<string, number> = {
  excellent: 100, good: 75, average: 50, poor: 20,
};

// ─── Recovery Score Algorithm ─────────────────────────────────────────────────

/**
 * Weighted recovery score 0-100 based on check-in data.
 *
 * Weights:  Sleep 30% | Energy 25% | Soreness 20% | Stress 15% | Motivation 10%
 */
export function calculateRecoveryScore(checkIn: InsertDailyCheckIn): number {
  const sleep = SLEEP_SCORES[checkIn.sleepQuality] ?? 50;
  const energy = (checkIn.energyLevel / 10) * 100;
  const soreness = ((10 - checkIn.muscleSoreness) / 10) * 100;  // inverted
  const stress = ((10 - checkIn.stressLevel) / 10) * 100;        // inverted
  const motivation = (checkIn.motivationLevel / 10) * 100;

  return Math.round(
    sleep * 0.30 +
    energy * 0.25 +
    soreness * 0.20 +
    stress * 0.15 +
    motivation * 0.10,
  );
}

// ─── Readiness Classification ─────────────────────────────────────────────────

export type ReadinessInfo = {
  category: ReadinessCategory;
  label: string;
  recommendation: string;
  color: string;       // tailwind-like color token for frontend
  intensityModifier: number;
};

export function classifyReadiness(score: number): ReadinessInfo {
  if (score >= 85) return {
    category: "excellent",
    label: "Peak Recovery",
    recommendation: "Your body is primed for performance. Push hard today.",
    color: "green",
    intensityModifier: 1.0,
  };
  if (score >= 70) return {
    category: "good",
    label: "Well Recovered",
    recommendation: "You're well recovered. Train as planned.",
    color: "blue",
    intensityModifier: 0.95,
  };
  if (score >= 50) return {
    category: "moderate",
    label: "Moderate Recovery",
    recommendation: "Slightly fatigued. Reduce workout intensity by 20–30%.",
    color: "yellow",
    intensityModifier: 0.80,
  };
  return {
    category: "poor",
    label: "Poor Recovery",
    recommendation: "Rest day recommended. Light movement or stretching only.",
    color: "red",
    intensityModifier: 0.65,
  };
}

// ─── Fatigue Detection ────────────────────────────────────────────────────────

type FatigueAnalysis = {
  level: FatigueLevel;
  label: string;
  message: string;
  consecutiveDays: number;
  weeklyVolume: number;
};

async function detectFatigue(userId: number, weeklyTarget: number): Promise<FatigueAnalysis> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const completions = await db
    .select({ completedAt: workoutCompletionsTable.completedAt, difficultyRating: workoutCompletionsTable.difficultyRating })
    .from(workoutCompletionsTable)
    .where(and(eq(workoutCompletionsTable.userId, userId), gte(workoutCompletionsTable.completedAt, fourteenDaysAgo)))
    .orderBy(desc(workoutCompletionsTable.completedAt));

  // Consecutive training days (ending at most 1 day ago to catch yesterday)
  let consecutiveDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const daySet = new Set(
    completions.map((c) => {
      const d = new Date(c.completedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }),
  );

  let checkDay = daySet.has(today.getTime()) ? today : yesterday;
  while (daySet.has(checkDay.getTime())) {
    consecutiveDays++;
    checkDay = new Date(checkDay);
    checkDay.setDate(checkDay.getDate() - 1);
  }

  // Volume in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyVolume = completions.filter((c) => new Date(c.completedAt) >= sevenDaysAgo).length;

  if (consecutiveDays >= 5 || weeklyVolume > weeklyTarget * 1.5) {
    return {
      level: "overtraining_risk",
      label: "Overtraining Risk",
      message: "Your recovery indicators suggest reducing training intensity this week.",
      consecutiveDays,
      weeklyVolume,
    };
  }
  if (consecutiveDays >= 4 || weeklyVolume > weeklyTarget * 1.3) {
    return {
      level: "high",
      label: "High Fatigue",
      message: "Your training load is increasing faster than recovery. Consider a lighter session today.",
      consecutiveDays,
      weeklyVolume,
    };
  }
  return {
    level: "normal",
    label: "Normal Fatigue",
    message: "Fatigue levels are within normal training range. Continue as planned.",
    consecutiveDays,
    weeklyVolume,
  };
}

// ─── Muscle Recovery ──────────────────────────────────────────────────────────

type MuscleStatus = {
  muscleGroup: string;
  recoveryPercentage: number;
  lastTrainedDate: Date | null;
  hoursAgo: number | null;
  status: "recovered" | "recovering" | "fatigued";
  sorenessLevel: number;
};

function calcRecoveryPct(lastTrained: Date, exerciseCount: number, sorenessFromCheckIn: number): number {
  const now = Date.now();
  const hoursAgo = (now - lastTrained.getTime()) / (1000 * 60 * 60);

  // Volume modifier: more exercises = longer recovery needed
  const volumeMod = exerciseCount >= 4 ? 1.35 : exerciseCount >= 2 ? 1.0 : 0.8;

  // Use a default of 48h if muscle not in map (shouldn't happen)
  const baseHours = 48;
  const totalHours = baseHours * volumeMod;

  let pct = Math.min(100, (hoursAgo / totalHours) * 100);

  // Soreness slows recovery (reported by user in check-in)
  if (sorenessFromCheckIn >= 8) pct *= 0.65;
  else if (sorenessFromCheckIn >= 6) pct *= 0.80;
  else if (sorenessFromCheckIn >= 4) pct *= 0.90;

  return Math.round(pct);
}

/** Infer muscle groups from completed exercise logs via DB lookup */
async function extractMusclesFromCompletions(
  completions: Array<{ completedAt: Date; exercisesCompleted: CompletedExerciseLog[] | null }>
): Promise<Map<string, { lastDate: Date; count: number }>> {
  const muscleMap = new Map<string, { lastDate: Date; count: number }>();

  // Collect all unique exerciseIds from completions
  const exerciseIds = new Set<number>();
  for (const c of completions) {
    for (const ex of c.exercisesCompleted ?? []) {
      if (!ex.skipped && ex.exerciseId) exerciseIds.add(ex.exerciseId);
    }
  }

  if (exerciseIds.size === 0) return muscleMap;

  // Look up exercises to get primaryMuscles
  const exercises = await db
    .select({ id: exercisesTable.id, primaryMuscles: exercisesTable.primaryMuscles, muscleGroups: exercisesTable.muscleGroups })
    .from(exercisesTable)
    .where(sql`${exercisesTable.id} = ANY(${Array.from(exerciseIds)})`);

  const exMuscleMap = new Map(exercises.map((e) => [e.id, [...e.primaryMuscles, ...e.muscleGroups]]));

  // Walk completions chronologically (oldest first) so latest date wins per muscle
  const sorted = [...completions].sort((a, b) => +new Date(a.completedAt) - +new Date(b.completedAt));

  for (const c of sorted) {
    const completedAt = new Date(c.completedAt);
    for (const ex of c.exercisesCompleted ?? []) {
      if (ex.skipped || !ex.exerciseId) continue;
      const muscles = exMuscleMap.get(ex.exerciseId) ?? [];
      for (const rawMuscle of muscles) {
        // Normalize to tracked muscle names
        const tracked = normalizeToTracked(rawMuscle);
        if (!tracked) continue;
        const existing = muscleMap.get(tracked);
        muscleMap.set(tracked, {
          lastDate: completedAt > (existing?.lastDate ?? new Date(0)) ? completedAt : existing!.lastDate,
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
  }

  return muscleMap;
}

function normalizeToTracked(raw: string): string | null {
  const r = raw.toLowerCase();
  if (r.includes("chest") || r.includes("pec")) return "Chest";
  if (r.includes("back") || r.includes("lat") || r.includes("rhomboid") || r.includes("trap")) return "Back";
  if (r.includes("shoulder") || r.includes("delt")) return "Shoulders";
  if (r.includes("bicep") || r.includes("brachialis")) return "Biceps";
  if (r.includes("tricep")) return "Triceps";
  if (r.includes("quad") || r.includes("vastus")) return "Quadriceps";
  if (r.includes("hamstring") || r.includes("biceps femoris")) return "Hamstrings";
  if (r.includes("glute") || r.includes("gluteus")) return "Glutes";
  if (r.includes("calf") || r.includes("calves") || r.includes("gastrocnemius") || r.includes("soleus")) return "Calves";
  if (r.includes("core") || r.includes("oblique") || r.includes("transverse")) return "Core";
  if (r.includes("ab") || r.includes("rectus abdominis")) return "Abs";
  return null;
}

// ─── Upsert Muscle Recovery rows ─────────────────────────────────────────────

async function upsertMuscleRecovery(
  userId: number,
  muscleMap: Map<string, { lastDate: Date; count: number }>,
  sorenessLevel: number,
): Promise<void> {
  if (muscleMap.size === 0) return;

  const upserts = Array.from(muscleMap.entries()).map(([muscle, { lastDate, count }]) => {
    const baseHours = RECOVERY_HOURS[muscle] ?? 48;
    const volumeMod = count >= 4 ? 1.35 : count >= 2 ? 1.0 : 0.8;
    const totalHours = baseHours * volumeMod;
    const hoursAgo = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
    let pct = Math.min(100, (hoursAgo / totalHours) * 100);
    if (sorenessLevel >= 8) pct *= 0.65;
    else if (sorenessLevel >= 6) pct *= 0.80;
    else if (sorenessLevel >= 4) pct *= 0.90;

    return db
      .insert(muscleRecoveryTable)
      .values({
        userId,
        muscleGroup: muscle,
        lastTrainedDate: lastDate,
        trainingVolume: count,
        sorenessLevel,
        recoveryPercentage: Math.round(pct),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [muscleRecoveryTable.userId, muscleRecoveryTable.muscleGroup],
        set: {
          lastTrainedDate: lastDate,
          trainingVolume: count,
          sorenessLevel,
          recoveryPercentage: Math.round(pct),
          updatedAt: new Date(),
        },
      });
  });

  await Promise.all(upserts);
}

// ─── Recovery Trend ───────────────────────────────────────────────────────────

async function computeTrend(userId: number, currentScore: number): Promise<"improving" | "stable" | "declining"> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const past = await db
    .select({ recoveryScore: dailyCheckInsTable.recoveryScore })
    .from(dailyCheckInsTable)
    .where(and(eq(dailyCheckInsTable.userId, userId), gte(dailyCheckInsTable.createdAt, sevenDaysAgo)))
    .orderBy(dailyCheckInsTable.createdAt);

  const scores = past.map((p) => p.recoveryScore ?? 75);
  if (scores.length < 3) return "stable";

  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  if (currentScore >= avg + 5) return "improving";
  if (currentScore <= avg - 5) return "declining";
  return "stable";
}

// ─── Main: process check-in ───────────────────────────────────────────────────

export async function processCheckIn(userId: number, checkIn: InsertDailyCheckIn): Promise<{
  recoveryScore: number;
  readiness: ReturnType<typeof classifyReadiness>;
  fatigue: FatigueAnalysis;
}> {
  const score = calculateRecoveryScore(checkIn);
  const readiness = classifyReadiness(score);

  // Load profile for weekly target
  const [profile] = await db
    .select({ weeklyWorkoutTarget: userProfilesTable.weeklyWorkoutTarget })
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  const weeklyTarget = profile?.weeklyWorkoutTarget ?? 3;
  const fatigue = await detectFatigue(userId, weeklyTarget);
  const trend = await computeTrend(userId, score);

  // Upsert daily check-in (conflict on userId+date = update)
  await db
    .insert(dailyCheckInsTable)
    .values({ userId, recoveryScore: score, ...checkIn })
    .onConflictDoUpdate({
      target: [dailyCheckInsTable.userId, dailyCheckInsTable.date],
      set: {
        sleepQuality: checkIn.sleepQuality,
        energyLevel: checkIn.energyLevel,
        stressLevel: checkIn.stressLevel,
        muscleSoreness: checkIn.muscleSoreness,
        motivationLevel: checkIn.motivationLevel,
        mood: checkIn.mood ?? null,
        notes: checkIn.notes ?? null,
        recoveryScore: score,
      },
    });

  // Upsert recovery profile
  await db
    .insert(recoveryProfilesTable)
    .values({
      userId,
      recoveryScore: score,
      readinessScore: score,
      fatigueLevel: fatigue.level,
      recoveryTrend: trend,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: recoveryProfilesTable.userId,
      set: {
        recoveryScore: score,
        readinessScore: score,
        fatigueLevel: fatigue.level,
        recoveryTrend: trend,
        lastUpdated: new Date(),
      },
    });

  // Refresh muscle recovery using recent completions + soreness
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentCompletions = await db
    .select({ completedAt: workoutCompletionsTable.completedAt, exercisesCompleted: workoutCompletionsTable.exercisesCompleted })
    .from(workoutCompletionsTable)
    .where(and(eq(workoutCompletionsTable.userId, userId), gte(workoutCompletionsTable.completedAt, sevenDaysAgo)));

  const muscleMap = await extractMusclesFromCompletions(
    recentCompletions.map((c) => ({ completedAt: new Date(c.completedAt), exercisesCompleted: c.exercisesCompleted as CompletedExerciseLog[] }))
  );
  await upsertMuscleRecovery(userId, muscleMap, checkIn.muscleSoreness);

  return { recoveryScore: score, readiness, fatigue };
}

// ─── Get today's recovery data ────────────────────────────────────────────────

export async function getTodayRecovery(userId: number) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [checkIn] = await db
    .select()
    .from(dailyCheckInsTable)
    .where(and(eq(dailyCheckInsTable.userId, userId), eq(dailyCheckInsTable.date, todayStr)))
    .limit(1);

  const [profile] = await db
    .select()
    .from(recoveryProfilesTable)
    .where(eq(recoveryProfilesTable.userId, userId))
    .limit(1);

  const muscles = await db
    .select()
    .from(muscleRecoveryTable)
    .where(eq(muscleRecoveryTable.userId, userId))
    .orderBy(muscleRecoveryTable.muscleGroup);

  // Compute training recommendation
  const score = profile?.recoveryScore ?? (checkIn?.recoveryScore ?? null);
  const readiness = score !== null ? classifyReadiness(score) : null;

  // Generate muscle-aware recommendation
  let recommendation: string | null = null;
  if (readiness && muscles.length > 0) {
    const fatigued = muscles.filter((m) => m.recoveryPercentage < 50).map((m) => m.muscleGroup);
    const recovered = muscles.filter((m) => m.recoveryPercentage >= 80).map((m) => m.muscleGroup);

    if (score! < 50) {
      recommendation = "Your body needs rest. Take a full recovery day or do light stretching.";
    } else if (fatigued.length >= 3) {
      recommendation = `Heavy fatigue in ${fatigued.slice(0, 2).join(" and ")}. Focus on cardio or unaffected muscle groups today.`;
    } else if (fatigued.length > 0) {
      recommendation = `Avoid ${fatigued.join(" and ")} — they need more recovery. ${recovered.length > 0 ? `Train ${recovered.slice(0, 2).join(" and ")} instead.` : ""}`;
    } else {
      recommendation = readiness.recommendation;
    }
  } else if (readiness) {
    recommendation = readiness.recommendation;
  }

  return {
    checkedInToday: !!checkIn,
    checkIn: checkIn ?? null,
    profile: profile ?? null,
    score,
    readiness,
    muscles,
    recommendation,
  };
}

// ─── Recovery History ─────────────────────────────────────────────────────────

export async function getRecoveryHistory(userId: number, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select()
    .from(dailyCheckInsTable)
    .where(and(eq(dailyCheckInsTable.userId, userId), gte(dailyCheckInsTable.createdAt, since)))
    .orderBy(desc(dailyCheckInsTable.createdAt));
}

// ─── Recovery Context for AI Workout Engine ───────────────────────────────────

export async function getRecoveryContext(userId: number): Promise<RecoveryContext | null> {
  const [profile] = await db
    .select()
    .from(recoveryProfilesTable)
    .where(eq(recoveryProfilesTable.userId, userId))
    .limit(1);

  if (!profile) return null; // No check-ins yet — engine uses its own defaults

  const muscles = await db
    .select({ muscleGroup: muscleRecoveryTable.muscleGroup, recoveryPercentage: muscleRecoveryTable.recoveryPercentage })
    .from(muscleRecoveryTable)
    .where(eq(muscleRecoveryTable.userId, userId));

  const fatiguedMuscles = muscles
    .filter((m) => m.recoveryPercentage < 60)
    .map((m) => m.muscleGroup);

  const readiness = classifyReadiness(profile.recoveryScore);

  return {
    recoveryScore: profile.recoveryScore,
    readinessCategory: readiness.category,
    fatigueLevel: profile.fatigueLevel as "normal" | "high" | "overtraining_risk",
    intensityModifier: readiness.intensityModifier,
    fatiguedMuscles,
  };
}

// ─── Update muscle recovery after workout completion ─────────────────────────

export async function refreshMusclesAfterWorkout(
  userId: number,
  completedExercises: CompletedExerciseLog[],
): Promise<void> {
  // Check for a recent check-in to get soreness level
  const todayStr = new Date().toISOString().split("T")[0];
  const [checkIn] = await db
    .select({ muscleSoreness: dailyCheckInsTable.muscleSoreness })
    .from(dailyCheckInsTable)
    .where(and(eq(dailyCheckInsTable.userId, userId), eq(dailyCheckInsTable.date, todayStr)))
    .limit(1);

  const sorenessLevel = checkIn?.muscleSoreness ?? 5;

  const mockCompletions = [{ completedAt: new Date(), exercisesCompleted: completedExercises }];
  const muscleMap = await extractMusclesFromCompletions(mockCompletions);
  await upsertMuscleRecovery(userId, muscleMap, sorenessLevel);
}
