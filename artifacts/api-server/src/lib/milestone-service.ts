/**
 * Milestone Service
 *
 * Handles Goal Milestones & Achievement Engine.
 * Called after every goal progress update.
 */

import { db } from "@workspace/db";
import { goalsTable, goalMilestonesTable } from "@workspace/db";
import { eq, and, asc, isNull } from "drizzle-orm";

const MILESTONE_PERCENTAGES = [25, 50, 75, 100] as const;

function milestoneTitle(pct: number): string {
  switch (pct) {
    case 25:  return "Quarter Way There";
    case 50:  return "Halfway There";
    case 75:  return "Almost There";
    case 100: return "Goal Achieved!";
    default:  return `${pct}% Complete`;
  }
}

function milestoneDescription(pct: number, goalTitle: string): string {
  switch (pct) {
    case 25:  return `You've completed 25% of "${goalTitle}". Keep up the great work!`;
    case 50:  return `You've completed half of "${goalTitle}". You're on fire!`;
    case 75:  return `You're 75% of the way to "${goalTitle}". The finish line is in sight!`;
    case 100: return `Congratulations! You've achieved "${goalTitle}". Incredible work!`;
    default:  return `You've reached ${pct}% of "${goalTitle}".`;
  }
}

function calcMilestoneValue(
  pct: number,
  referenceValue: string | null,
  targetValue: string | null,
  category: string,
): string | null {
  const target = targetValue !== null ? Number(targetValue) : null;
  const reference = referenceValue !== null ? Number(referenceValue) : null;
  if (target === null) return null;

  const ratio = pct / 100;

  // Direction-sensitive (mirrors goal-progress-service logic)
  if (category === "weight_loss" || category === "body_fat") {
    const start = reference ?? target;
    const range = start - target;
    return String(+(start - range * ratio).toFixed(2));
  } else if (category === "weight_gain") {
    const start = reference ?? 0;
    const range = target - start;
    return String(+(start + range * ratio).toFixed(2));
  } else {
    return String(+(target * ratio).toFixed(2));
  }
}

// ─── generateGoalMilestones ───────────────────────────────────────────────────
// Idempotent — skips percentages already present.

export async function generateGoalMilestones(goalId: number): Promise<typeof goalMilestonesTable.$inferSelect[]> {
  const [goal] = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.id, goalId))
    .limit(1);

  if (!goal) throw new Error(`Goal ${goalId} not found`);

  // Guard: skip completed / cancelled / deleted goals
  if (goal.status === "cancelled") return [];

  // Find which percentages already exist
  const existing = await db
    .select({ milestonePercentage: goalMilestonesTable.milestonePercentage })
    .from(goalMilestonesTable)
    .where(eq(goalMilestonesTable.goalId, goalId));

  const existingPcts = new Set(existing.map((m) => m.milestonePercentage));

  const toInsert = MILESTONE_PERCENTAGES
    .filter((pct) => !existingPcts.has(pct))
    .map((pct) => ({
      goalId,
      userId: goal.userId,
      milestonePercentage: pct,
      milestoneValue: calcMilestoneValue(pct, goal.referenceValue, goal.targetValue, goal.category),
      title: milestoneTitle(pct),
      description: milestoneDescription(pct, goal.title),
    }));

  if (toInsert.length === 0) {
    // Return all existing milestones
    return db.select().from(goalMilestonesTable).where(eq(goalMilestonesTable.goalId, goalId)).orderBy(asc(goalMilestonesTable.milestonePercentage));
  }

  await db.insert(goalMilestonesTable).values(toInsert);

  return db
    .select()
    .from(goalMilestonesTable)
    .where(eq(goalMilestonesTable.goalId, goalId))
    .orderBy(asc(goalMilestonesTable.milestonePercentage));
}

// ─── checkMilestones ─────────────────────────────────────────────────────────
// Compares current goal progress against unachieved milestones.
// Returns newly achieved milestones (so callers can react / notify).

export async function checkMilestones(goalId: number): Promise<typeof goalMilestonesTable.$inferSelect[]> {
  const [goal] = await db
    .select({ progressPercentage: goalsTable.progressPercentage, status: goalsTable.status })
    .from(goalsTable)
    .where(eq(goalsTable.id, goalId))
    .limit(1);

  if (!goal) return [];

  const currentPct = Number(goal.progressPercentage ?? 0);

  // Fetch unachieved milestones for this goal
  const pending = await db
    .select()
    .from(goalMilestonesTable)
    .where(
      and(
        eq(goalMilestonesTable.goalId, goalId),
        eq(goalMilestonesTable.achieved, false),
      ),
    );

  const nowAchieved = pending.filter((m) => currentPct >= m.milestonePercentage);
  if (nowAchieved.length === 0) return [];

  const now = new Date();
  await Promise.all(
    nowAchieved.map((m) =>
      db
        .update(goalMilestonesTable)
        .set({ achieved: true, achievedAt: now })
        .where(eq(goalMilestonesTable.id, m.id)),
    ),
  );

  return nowAchieved.map((m) => ({ ...m, achieved: true, achievedAt: now }));
}

// ─── markMilestoneCompleted ───────────────────────────────────────────────────

export async function markMilestoneCompleted(milestoneId: number): Promise<typeof goalMilestonesTable.$inferSelect | null> {
  const [updated] = await db
    .update(goalMilestonesTable)
    .set({ achieved: true, achievedAt: new Date() })
    .where(
      and(
        eq(goalMilestonesTable.id, milestoneId),
        eq(goalMilestonesTable.achieved, false), // prevent duplicate award
      ),
    )
    .returning();

  return updated ?? null;
}

// ─── getUpcomingMilestone ─────────────────────────────────────────────────────
// Returns the next unachieved milestone for a goal.

export async function getUpcomingMilestone(goalId: number): Promise<typeof goalMilestonesTable.$inferSelect | null> {
  const [milestone] = await db
    .select()
    .from(goalMilestonesTable)
    .where(
      and(
        eq(goalMilestonesTable.goalId, goalId),
        eq(goalMilestonesTable.achieved, false),
      ),
    )
    .orderBy(asc(goalMilestonesTable.milestonePercentage))
    .limit(1);

  return milestone ?? null;
}

// ─── serializeMilestone ───────────────────────────────────────────────────────

export function serializeMilestone(m: typeof goalMilestonesTable.$inferSelect) {
  return {
    id: m.id,
    goalId: m.goalId,
    userId: m.userId,
    milestonePercentage: m.milestonePercentage,
    milestoneValue: m.milestoneValue !== null ? Number(m.milestoneValue) : null,
    title: m.title,
    description: m.description,
    achieved: m.achieved,
    achievedAt: m.achievedAt,
    createdAt: m.createdAt,
  };
}
