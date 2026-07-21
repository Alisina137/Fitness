import { Router } from "express";
import { db } from "@workspace/db";
import { goalsTable, goalMilestonesTable, insertGoalSchema, updateGoalSchema } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth.js";
import { getPrimaryGoal, serializeGoal, ensureSinglePrimary } from "../lib/goals-service.js";
import { updateGoalProgress, getGoalProgressSummary } from "../lib/goal-progress-service.js";
import {
  generateGoalMilestones,
  checkMilestones,
  getUpcomingMilestone,
  serializeMilestone,
} from "../lib/milestone-service.js";
import { eq, and, desc, asc } from "drizzle-orm";

const router = Router();

// ─── GET /api/goals/milestones/upcoming ───────────────────────────────────────
// Must be registered BEFORE /goals/:id to prevent "milestones" matching as id.

router.get("/goals/milestones/upcoming", requireAuth, async (req, res) => {
  const user = getUser(req);

  // Find the user's primary or first active goal, then get its upcoming milestone
  const activeGoals = await db
    .select({ id: goalsTable.id, title: goalsTable.title, progressPercentage: goalsTable.progressPercentage, isPrimary: goalsTable.isPrimary, category: goalsTable.category, targetValue: goalsTable.targetValue, unit: goalsTable.unit })
    .from(goalsTable)
    .where(and(eq(goalsTable.userId, user.id), eq(goalsTable.status, "active")))
    .orderBy(desc(goalsTable.isPrimary), desc(goalsTable.createdAt));

  if (activeGoals.length === 0) return res.json(null);

  for (const goal of activeGoals) {
    const milestone = await getUpcomingMilestone(goal.id);
    if (milestone) {
      return res.json({
        goal: {
          id: goal.id,
          title: goal.title,
          progressPercentage: Number(goal.progressPercentage ?? 0),
          unit: goal.unit,
          targetValue: goal.targetValue !== null ? Number(goal.targetValue) : null,
        },
        milestone: serializeMilestone(milestone),
      });
    }
  }

  return res.json(null);
});

// ─── POST /api/goals ──────────────────────────────────────────────────────────

router.post("/goals", requireAuth, async (req, res) => {
  const user = getUser(req);

  const parsed = insertGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const data = parsed.data;

  // Target date must be after start date
  if (data.targetDate && data.startDate) {
    if (new Date(data.targetDate) <= new Date(data.startDate)) {
      return res.status(400).json({ error: "Target date must be after start date." });
    }
  }

  // Target value must be positive if provided
  if (data.targetValue !== undefined && data.targetValue !== null && Number(data.targetValue) <= 0) {
    return res.status(400).json({ error: "Target value must be greater than zero." });
  }

  const [goal] = await db
    .insert(goalsTable)
    .values({
      ...data,
      userId: user.id,
      targetValue: data.targetValue?.toString() ?? null,
      currentValue: data.currentValue?.toString() ?? null,
      isPrimary: data.isPrimary ?? false,
    })
    .returning();

  // Enforce single primary
  if (goal.isPrimary) {
    await ensureSinglePrimary(user.id, goal.id);
  }

  // Seed referenceValue (starting point) and compute initial progress non-blocking
  // Then auto-generate milestones and run initial check
  updateGoalProgress(goal.id)
    .then(() => generateGoalMilestones(goal.id))
    .then(() => checkMilestones(goal.id))
    .catch((err) => {
      req.log?.error({ err, goalId: goal.id }, "Failed to seed goal progress/milestones after create");
    });

  res.status(201).json(serializeGoal(goal));
});

// ─── GET /api/goals ───────────────────────────────────────────────────────────

router.get("/goals", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { status, category, priority } = req.query;

  let rows = await db
    .select()
    .from(goalsTable)
    .where(eq(goalsTable.userId, user.id))
    .orderBy(desc(goalsTable.createdAt));

  // In-memory filtering (table is small per user)
  if (status) rows = rows.filter((g) => g.status === status);
  if (category) rows = rows.filter((g) => g.category === category);
  if (priority) rows = rows.filter((g) => g.priority === priority);

  res.json(rows.map(serializeGoal));
});

// ─── GET /api/goals/primary ───────────────────────────────────────────────────

router.get("/goals/primary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const primary = await getPrimaryGoal(user.id);
  if (!primary) return res.json(null);
  res.json(primary);
});

// ─── GET /api/goals/progress ──────────────────────────────────────────────────
// Progress summary for all user goals (used by dashboard and progress page).
// NOTE: Must be registered BEFORE /goals/:id to avoid "progress" being matched as an id.
router.get("/goals/progress", requireAuth, async (req, res) => {
  const user = getUser(req);
  const summary = await getGoalProgressSummary(user.id);
  res.json(summary);
});

// ─── GET /api/goals/:id ───────────────────────────────────────────────────────

router.get("/goals/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id." });

  const [goal] = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, user.id)))
    .limit(1);

  if (!goal) return res.status(404).json({ error: "Goal not found." });
  res.json(serializeGoal(goal));
});

// ─── PUT /api/goals/:id ───────────────────────────────────────────────────────

router.put("/goals/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id." });

  const [existing] = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, user.id)))
    .limit(1);

  if (!existing) return res.status(404).json({ error: "Goal not found." });

  const parsed = updateGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const data = parsed.data;

  // Date validation
  const newStart = data.startDate ? new Date(data.startDate) : existing.startDate;
  const newTarget = data.targetDate ? new Date(data.targetDate) : existing.targetDate;
  if (newTarget && newStart && newTarget <= newStart) {
    return res.status(400).json({ error: "Target date must be after start date." });
  }

  if (data.targetValue !== undefined && data.targetValue !== null && Number(data.targetValue) <= 0) {
    return res.status(400).json({ error: "Target value must be greater than zero." });
  }

  const [updated] = await db
    .update(goalsTable)
    .set({
      ...data,
      targetValue: data.targetValue !== undefined ? data.targetValue?.toString() ?? null : undefined,
      currentValue: data.currentValue !== undefined ? data.currentValue?.toString() ?? null : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, user.id)))
    .returning();

  // Enforce single primary if this goal was just made primary
  if (updated.isPrimary && !existing.isPrimary) {
    await ensureSinglePrimary(user.id, id);
  }

  // Recalculate progress after any edit, then check milestones non-blocking
  updateGoalProgress(id)
    .then(() => checkMilestones(id))
    .catch((err) => {
      req.log?.error({ err, goalId: id }, "Failed to recalculate goal progress after update");
    });

  res.json(serializeGoal(updated));
});

// ─── POST /api/goals/:goalId/milestones/generate ──────────────────────────────

router.post("/goals/:goalId/milestones/generate", requireAuth, async (req, res) => {
  const user = getUser(req);
  const goalId = Number(req.params.goalId);
  if (!Number.isFinite(goalId)) return res.status(400).json({ error: "Invalid goalId." });

  const [goal] = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.id, goalId), eq(goalsTable.userId, user.id)))
    .limit(1);

  if (!goal) return res.status(404).json({ error: "Goal not found." });
  if (goal.status === "cancelled") return res.status(400).json({ error: "Cannot generate milestones for a cancelled goal." });

  const milestones = await generateGoalMilestones(goalId);
  await checkMilestones(goalId);

  res.status(201).json(milestones.map(serializeMilestone));
});

// ─── GET /api/goals/:goalId/milestones ────────────────────────────────────────

router.get("/goals/:goalId/milestones", requireAuth, async (req, res) => {
  const user = getUser(req);
  const goalId = Number(req.params.goalId);
  if (!Number.isFinite(goalId)) return res.status(400).json({ error: "Invalid goalId." });

  const [goal] = await db
    .select({ id: goalsTable.id })
    .from(goalsTable)
    .where(and(eq(goalsTable.id, goalId), eq(goalsTable.userId, user.id)))
    .limit(1);

  if (!goal) return res.status(404).json({ error: "Goal not found." });

  const milestones = await db
    .select()
    .from(goalMilestonesTable)
    .where(eq(goalMilestonesTable.goalId, goalId))
    .orderBy(asc(goalMilestonesTable.milestonePercentage));

  res.json(milestones.map(serializeMilestone));
});

// ─── DELETE /api/goals/:id ────────────────────────────────────────────────────

router.delete("/goals/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id." });

  const [deleted] = await db
    .delete(goalsTable)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, user.id)))
    .returning({ id: goalsTable.id });

  if (!deleted) return res.status(404).json({ error: "Goal not found." });
  res.json({ success: true, id: deleted.id });
});

export default router;
