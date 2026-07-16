import { Router } from "express";
import { db } from "@workspace/db";
import { workoutPlansTable, workoutCompletionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/workouts/today", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [workout] = await db
    .select()
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.userId, user.id), eq(workoutPlansTable.isActive, true)))
    .orderBy(workoutPlansTable.createdAt)
    .limit(1);

  if (!workout) {
    res.json({ hasWorkout: false });
    return;
  }
  res.json({ hasWorkout: true, workout: serializeWorkout(workout), scheduledFor: null });
});

router.get("/workouts/history", requireAuth, async (req, res) => {
  const user = getUser(req);
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const completions = await db
    .select()
    .from(workoutCompletionsTable)
    .where(eq(workoutCompletionsTable.userId, user.id))
    .orderBy(desc(workoutCompletionsTable.completedAt))
    .limit(limit);
  res.json(completions.map(serializeCompletion));
});

router.get("/workouts", requireAuth, async (req, res) => {
  const user = getUser(req);
  const status = req.query.status as string | undefined;

  let query = db.select().from(workoutPlansTable).where(eq(workoutPlansTable.userId, user.id)).$dynamic();
  if (status === "active") {
    query = db.select().from(workoutPlansTable).where(and(eq(workoutPlansTable.userId, user.id), eq(workoutPlansTable.isActive, true))).$dynamic();
  } else if (status === "completed") {
    query = db.select().from(workoutPlansTable).where(and(eq(workoutPlansTable.userId, user.id), eq(workoutPlansTable.isActive, false))).$dynamic();
  }

  const workouts = await query.orderBy(desc(workoutPlansTable.createdAt));
  res.json(workouts.map(serializeWorkout));
});

router.post("/workouts", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, description, durationMinutes, difficulty, category, exercises } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const [workout] = await db.insert(workoutPlansTable).values({
    userId: user.id,
    name,
    description,
    durationMinutes,
    difficulty: difficulty || "beginner",
    category,
    exercises: exercises || [],
  }).returning();
  res.status(201).json(serializeWorkout(workout));
});

router.get("/workouts/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [workout] = await db.select().from(workoutPlansTable).where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id))).limit(1);
  if (!workout) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeWorkout(workout));
});

router.patch("/workouts/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const { name, description, durationMinutes, difficulty, isActive } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (isActive !== undefined) updates.isActive = isActive;

  const [workout] = await db.update(workoutPlansTable).set(updates).where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id))).returning();
  if (!workout) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeWorkout(workout));
});

router.delete("/workouts/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [deleted] = await db.delete(workoutPlansTable).where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id))).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

router.post("/workouts/:id/complete", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [workout] = await db.select().from(workoutPlansTable).where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id))).limit(1);
  if (!workout) { res.status(404).json({ error: "Not found" }); return; }

  const { durationMinutes, caloriesBurned, rating, notes } = req.body;
  const [completion] = await db.insert(workoutCompletionsTable).values({
    workoutPlanId: id,
    userId: user.id,
    durationMinutes,
    caloriesBurned,
    rating,
    notes,
  }).returning();

  await db.update(workoutPlansTable).set({ completionCount: workout.completionCount + 1 }).where(eq(workoutPlansTable.id, id));
  res.json(serializeCompletion(completion));
});

function serializeWorkout(w: typeof workoutPlansTable.$inferSelect) {
  return {
    id: w.id,
    userId: w.userId,
    name: w.name,
    description: w.description,
    durationMinutes: w.durationMinutes,
    difficulty: w.difficulty,
    category: w.category,
    exercises: w.exercises || [],
    isActive: w.isActive,
    completionCount: w.completionCount,
    createdAt: w.createdAt,
  };
}

function serializeCompletion(c: typeof workoutCompletionsTable.$inferSelect) {
  return {
    id: c.id,
    workoutPlanId: c.workoutPlanId,
    workoutName: "",
    userId: c.userId,
    durationMinutes: c.durationMinutes,
    caloriesBurned: c.caloriesBurned,
    rating: c.rating,
    notes: c.notes,
    completedAt: c.completedAt,
  };
}

export default router;
