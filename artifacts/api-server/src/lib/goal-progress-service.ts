/**
 * Goal Progress Service
 *
 * Automatically calculates and updates progress for each goal.
 * Called non-blocking after: workout completion, body weight update, PR saved, goal edit.
 */

import { db } from "@workspace/db";
import {
  goalsTable,
  progressEntriesTable,
  workoutCompletionsTable,
} from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";

type GoalRow = typeof goalsTable.$inferSelect;

// ─── Pure calculation ─────────────────────────────────────────────────────────

/**
 * Calculate 0–100 progress percentage for a goal.
 *
 * Direction-sensitive:
 *   weight_loss / body_fat  → going DOWN  →  uses referenceValue as anchor
 *   weight_gain             → going UP    →  uses referenceValue as anchor
 *   everything else         → (current / target) × 100
 */
export function calculateGoalPercentage(goal: GoalRow & { liveCurrentValue?: number }): number {
  const target = goal.targetValue !== null ? Number(goal.targetValue) : null;
  const current = goal.liveCurrentValue ?? (goal.currentValue !== null ? Number(goal.currentValue) : null);
  const reference = goal.referenceValue !== null ? Number(goal.referenceValue) : null;

  if (target === null || target === 0) return 0;
  if (current === null) return 0;

  let pct: number;

  if (goal.category === "weight_loss" || goal.category === "body_fat") {
    // Progress = how far we've moved from start toward target (decreasing)
    const start = reference ?? current;
    const range = start - target;
    if (range <= 0) return current <= target ? 100 : 0;
    pct = ((start - current) / range) * 100;
  } else if (goal.category === "weight_gain") {
    // Progress = how far we've climbed from start toward target (increasing)
    const start = reference ?? current;
    const range = target - start;
    if (range <= 0) return current >= target ? 100 : 0;
    pct = ((current - start) / range) * 100;
  } else {
    // Straightforward: current / target
    pct = (current / target) * 100;
  }

  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

/** Remaining amount to reach target (signed: negative means overshot). */
export function calculateRemaining(goal: GoalRow & { liveCurrentValue?: number }): number | null {
  const target = goal.targetValue !== null ? Number(goal.targetValue) : null;
  const current = goal.liveCurrentValue ?? (goal.currentValue !== null ? Number(goal.currentValue) : null);
  if (target === null || current === null) return null;

  if (goal.category === "weight_loss" || goal.category === "body_fat") {
    return Math.max(0, current - target);
  }
  return Math.max(0, target - current);
}

// ─── Live value fetchers ──────────────────────────────────────────────────────

async function fetchLiveValue(goal: GoalRow): Promise<number | null> {
  const userId = goal.userId;

  switch (goal.category) {
    case "weight_loss":
    case "weight_gain": {
      const [entry] = await db
        .select({ weightKg: progressEntriesTable.weightKg })
        .from(progressEntriesTable)
        .where(and(eq(progressEntriesTable.userId, userId), eq(progressEntriesTable.type, "weight")))
        .orderBy(desc(progressEntriesTable.loggedAt))
        .limit(1);
      return entry?.weightKg !== null && entry?.weightKg !== undefined ? Number(entry.weightKg) : null;
    }

    case "body_fat": {
      const [entry] = await db
        .select({ bodyFatPercent: progressEntriesTable.bodyFatPercent })
        .from(progressEntriesTable)
        .where(and(eq(progressEntriesTable.userId, userId), eq(progressEntriesTable.type, "weight")))
        .orderBy(desc(progressEntriesTable.loggedAt))
        .limit(1);
      return entry?.bodyFatPercent !== null && entry?.bodyFatPercent !== undefined ? Number(entry.bodyFatPercent) : null;
    }

    case "workout_consistency": {
      // currentValue = workouts/week target; count actual completions in last 4 weeks
      const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
      const rows = await db
        .select({ id: workoutCompletionsTable.id })
        .from(workoutCompletionsTable)
        .where(and(eq(workoutCompletionsTable.userId, userId), gte(workoutCompletionsTable.completedAt, fourWeeksAgo)));
      const weeklyActual = rows.length / 4;
      return Math.round(weeklyActual * 10) / 10;
    }

    default:
      // strength, muscle_gain, endurance, custom — use stored currentValue (manual/PR-driven)
      return goal.currentValue !== null ? Number(goal.currentValue) : null;
  }
}

// ─── Core update functions ────────────────────────────────────────────────────

/**
 * updateGoalProgress — recalculates and persists progress for one goal.
 * Also auto-completes or expires the goal based on result.
 */
export async function updateGoalProgress(goalId: number): Promise<void> {
  const [goal] = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.id, goalId))
    .limit(1);

  if (!goal || goal.status === "cancelled" || goal.status === "completed") return;

  // Auto-expire if target date has passed and not yet completed
  if (goal.targetDate && new Date(goal.targetDate) < new Date() && goal.status === "active") {
    await db
      .update(goalsTable)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(goalsTable.id, goalId));
    return;
  }

  const liveCurrentValue = await fetchLiveValue(goal);
  const goalWithLive = { ...goal, liveCurrentValue: liveCurrentValue ?? undefined };
  const pct = calculateGoalPercentage(goalWithLive);

  // Determine new status
  let newStatus = goal.status;
  if (pct >= 100 && goal.status === "active") newStatus = "completed";

  await db
    .update(goalsTable)
    .set({
      currentValue: liveCurrentValue !== null ? liveCurrentValue.toString() : goal.currentValue,
      progressPercentage: pct.toString(),
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(goalsTable.id, goalId));
}

/**
 * updateAllUserGoals — recalculates progress for every non-terminal goal of a user.
 * Called non-blocking after workout completion or body weight update.
 */
export async function updateAllUserGoals(userId: number): Promise<void> {
  const goals = await db
    .select({ id: goalsTable.id })
    .from(goalsTable)
    .where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "active")));

  await Promise.all(goals.map((g) => updateGoalProgress(g.id)));
}

/**
 * checkGoalCompletion — returns whether a goal has reached 100%.
 */
export async function checkGoalCompletion(goalId: number): Promise<boolean> {
  const [goal] = await db
    .select({ progressPercentage: goalsTable.progressPercentage })
    .from(goalsTable)
    .where(eq(goalsTable.id, goalId))
    .limit(1);
  if (!goal) return false;
  return Number(goal.progressPercentage) >= 100;
}

// ─── Progress summary (for API) ───────────────────────────────────────────────

export async function getGoalProgressSummary(userId: number) {
  const goals = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, userId))
    .orderBy(desc(goalsTable.updatedAt));

  return goals.map((g) => {
    const target = g.targetValue !== null ? Number(g.targetValue) : null;
    const current = g.currentValue !== null ? Number(g.currentValue) : null;
    const pct = Number(g.progressPercentage ?? 0);
    const remaining = calculateRemaining(g);

    return {
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      priority: g.priority,
      isPrimary: g.isPrimary,
      currentValue: current,
      targetValue: target,
      referenceValue: g.referenceValue !== null ? Number(g.referenceValue) : null,
      unit: g.unit,
      progressPercentage: pct,
      remaining,
      startDate: g.startDate,
      targetDate: g.targetDate,
      updatedAt: g.updatedAt,
    };
  });
}
