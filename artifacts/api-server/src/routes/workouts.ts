import { Router } from "express";
import { db } from "@workspace/db";
import {
  workoutPlansTable,
  workoutCompletionsTable,
  workoutDaysTable,
  workoutDayExercisesTable,
  personalRecordsTable,
  exercisesTable,
} from "@workspace/db";
import type { CompletedExerciseLog } from "@workspace/db";
import { eq, and, desc, gte, count, sum, avg, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { refreshMusclesAfterWorkout } from "../lib/recovery-engine.js";
import { processWorkoutAnalytics } from "../lib/analytics-engine.js";
import { detectAndSavePRs } from "../lib/pr-engine.js";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeWorkout(w: typeof workoutPlansTable.$inferSelect) {
  return {
    id: w.id,
    userId: w.userId,
    name: w.name,
    description: w.description,
    goal: w.goal,
    status: w.status,
    durationMinutes: w.durationMinutes,
    durationWeeks: w.durationWeeks,
    difficulty: w.difficulty,
    category: w.category,
    isTemplate: w.isTemplate,
    weeklySchedule: w.weeklySchedule,
    progressionRules: w.progressionRules,
    exercises: w.exercises || [],
    isActive: w.isActive,
    completionCount: w.completionCount,
    createdAt: w.createdAt,
  };
}

function serializeDay(d: typeof workoutDaysTable.$inferSelect) {
  return {
    id: d.id,
    workoutPlanId: d.workoutPlanId,
    dayNumber: d.dayNumber,
    title: d.title,
    focusArea: d.focusArea,
    estimatedDurationMinutes: d.estimatedDurationMinutes,
    isRestDay: d.isRestDay,
    createdAt: d.createdAt,
  };
}

function serializeDayExercise(e: typeof workoutDayExercisesTable.$inferSelect) {
  return {
    id: e.id,
    workoutDayId: e.workoutDayId,
    exerciseId: e.exerciseId,
    exerciseName: e.exerciseName,
    orderIndex: e.orderIndex,
    sets: e.sets,
    repsMin: e.repsMin,
    repsMax: e.repsMax,
    weightKg: e.weightKg ? Number(e.weightKg) : null,
    durationSeconds: e.durationSeconds,
    restSeconds: e.restSeconds,
    tempo: e.tempo,
    notes: e.notes,
  };
}

function serializeCompletion(c: typeof workoutCompletionsTable.$inferSelect, workoutName = "") {
  return {
    id: c.id,
    workoutPlanId: c.workoutPlanId,
    workoutName,
    userId: c.userId,
    startTime: c.startTime,
    endTime: c.endTime,
    durationMinutes: c.durationMinutes,
    caloriesBurned: c.caloriesBurned,
    exercisesCompleted: c.exercisesCompleted || [],
    difficultyRating: c.difficultyRating,
    rating: c.rating,
    notes: c.notes,
    completedAt: c.completedAt,
  };
}

// ─── Workout Plans ────────────────────────────────────────────────────────────

router.get("/workouts/today", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [workout] = await db
    .select()
    .from(workoutPlansTable)
    .where(and(
      eq(workoutPlansTable.userId, user.id),
      eq(workoutPlansTable.isActive, true),
      eq(workoutPlansTable.isTemplate, false),
    ))
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

  // Fetch plan names
  const planIds = [...new Set(completions.map(c => c.workoutPlanId))];
  const plans = planIds.length
    ? await db.select({ id: workoutPlansTable.id, name: workoutPlansTable.name })
        .from(workoutPlansTable)
        .where(sql`${workoutPlansTable.id} = ANY(${planIds})`)
    : [];
  const nameMap = Object.fromEntries(plans.map(p => [p.id, p.name]));

  res.json(completions.map(c => serializeCompletion(c, nameMap[c.workoutPlanId] || "")));
});

router.get("/workouts/templates", requireAuth, async (req, res) => {
  const { category, goal, difficulty } = req.query as Record<string, string>;

  let query = db.select().from(workoutPlansTable)
    .where(eq(workoutPlansTable.isTemplate, true))
    .$dynamic();

  const conditions = [eq(workoutPlansTable.isTemplate, true)];
  if (category) conditions.push(eq(workoutPlansTable.category, category));
  if (goal) conditions.push(eq(workoutPlansTable.goal, goal));
  if (difficulty) conditions.push(eq(workoutPlansTable.difficulty, difficulty));

  const templates = await db.select().from(workoutPlansTable)
    .where(and(...conditions))
    .orderBy(workoutPlansTable.name);

  res.json(templates.map(serializeWorkout));
});

router.post("/workouts/templates/:id/adopt", requireAuth, async (req, res) => {
  const user = getUser(req);
  const templateId = Number(req.params.id);

  const [template] = await db.select().from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, templateId), eq(workoutPlansTable.isTemplate, true)))
    .limit(1);

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  // Copy the plan
  const [newPlan] = await db.insert(workoutPlansTable).values({
    userId: user.id,
    name: template.name,
    description: template.description,
    goal: template.goal,
    status: "active",
    durationMinutes: template.durationMinutes,
    durationWeeks: template.durationWeeks,
    difficulty: template.difficulty,
    category: template.category,
    isTemplate: false,
    weeklySchedule: template.weeklySchedule,
    progressionRules: template.progressionRules,
    exercises: template.exercises,
  }).returning();

  // Copy workout days + exercises
  const days = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.workoutPlanId, templateId));

  for (const day of days) {
    const [newDay] = await db.insert(workoutDaysTable).values({
      workoutPlanId: newPlan.id,
      dayNumber: day.dayNumber,
      title: day.title,
      focusArea: day.focusArea,
      estimatedDurationMinutes: day.estimatedDurationMinutes,
      isRestDay: day.isRestDay,
    }).returning();

    const dayExercises = await db.select().from(workoutDayExercisesTable)
      .where(eq(workoutDayExercisesTable.workoutDayId, day.id));

    if (dayExercises.length) {
      await db.insert(workoutDayExercisesTable).values(
        dayExercises.map(e => ({
          workoutDayId: newDay.id,
          exerciseId: e.exerciseId,
          exerciseName: e.exerciseName,
          orderIndex: e.orderIndex,
          sets: e.sets,
          repsMin: e.repsMin,
          repsMax: e.repsMax,
          weightKg: e.weightKg,
          durationSeconds: e.durationSeconds,
          restSeconds: e.restSeconds,
          tempo: e.tempo,
          notes: e.notes,
        }))
      );
    }
  }

  res.status(201).json(serializeWorkout(newPlan));
});

router.get("/workouts/analytics", requireAuth, async (req, res) => {
  const user = getUser(req);
  const days = Math.min(Number(req.query.days) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totals] = await db.select({
    totalWorkouts: count(),
    totalMinutes: sum(workoutCompletionsTable.durationMinutes),
    totalCalories: sum(workoutCompletionsTable.caloriesBurned),
    avgDifficulty: avg(workoutCompletionsTable.difficultyRating),
    avgDuration: avg(workoutCompletionsTable.durationMinutes),
  }).from(workoutCompletionsTable)
    .where(and(
      eq(workoutCompletionsTable.userId, user.id),
      gte(workoutCompletionsTable.completedAt, since),
    ));

  const [weekTotals] = await db.select({ count: count() })
    .from(workoutCompletionsTable)
    .where(and(
      eq(workoutCompletionsTable.userId, user.id),
      gte(workoutCompletionsTable.completedAt, weekAgo),
    ));

  const weeklyWorkouts = Number(weekTotals?.count || 0);
  const totalWorkouts = Number(totals?.totalWorkouts || 0);
  const weeklyConsistency = totalWorkouts > 0
    ? Math.min(100, Math.round((weeklyWorkouts / 3) * 100))
    : 0;

  // Personal records
  const prs = await db.select().from(personalRecordsTable)
    .where(eq(personalRecordsTable.userId, user.id))
    .orderBy(desc(personalRecordsTable.achievedAt))
    .limit(5);

  // Favorite exercises: count per exercise across all completions in period
  const allCompletions = await db.select({
    exercisesCompleted: workoutCompletionsTable.exercisesCompleted,
    completedAt: workoutCompletionsTable.completedAt,
  }).from(workoutCompletionsTable)
    .where(and(
      eq(workoutCompletionsTable.userId, user.id),
      gte(workoutCompletionsTable.completedAt, since),
    ));

  const exerciseCounts = new Map<string, { name: string; count: number; id: number }>();
  const weekExerciseIds = new Set<number>();

  for (const c of allCompletions) {
    const exercises = (c.exercisesCompleted || []) as CompletedExerciseLog[];
    const isThisWeek = c.completedAt >= weekAgo;
    for (const ex of exercises) {
      if (ex.skipped) continue;
      const key = String(ex.exerciseId || ex.name);
      const existing = exerciseCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        exerciseCounts.set(key, { name: ex.name, count: 1, id: ex.exerciseId });
      }
      if (isThisWeek && ex.exerciseId) weekExerciseIds.add(ex.exerciseId);
    }
  }

  const favoriteExercises = [...exerciseCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(e => ({ name: e.name, count: e.count }));

  // Muscle groups this week: look up exercises worked this week
  let muscleGroupsThisWeek: string[] = [];
  if (weekExerciseIds.size > 0) {
    const exIds = [...weekExerciseIds];
    const exerciseData = await db.select({ muscleGroups: exercisesTable.muscleGroups })
      .from(exercisesTable)
      .where(sql`${exercisesTable.id} = ANY(${exIds})`);
    const mgSet = new Set<string>();
    for (const ex of exerciseData) {
      for (const mg of ex.muscleGroups) mgSet.add(mg);
    }
    muscleGroupsThisWeek = [...mgSet].sort();
  }

  res.json({
    totalWorkouts,
    totalMinutes: Number(totals?.totalMinutes || 0),
    caloriesBurned: Number(totals?.totalCalories || 0),
    thisWeekWorkouts: weeklyWorkouts,
    weeklyConsistency,
    avgDuration: Number(totals?.avgDuration || 0),
    avgDifficultyRating: totals?.avgDifficulty ? Number(totals.avgDifficulty) : null,
    muscleGroupsThisWeek,
    favoriteExercises,
    weeklyVolume: [],
    recentPersonalRecords: prs.map(pr => ({
      id: pr.id,
      exerciseName: pr.exerciseName,
      recordType: pr.recordType,
      value: Number(pr.value),
      unit: pr.unit,
      achievedAt: pr.achievedAt,
    })),
  });
});

router.get("/workouts", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { status } = req.query as { status?: string };

  const conditions = [
    eq(workoutPlansTable.userId, user.id),
    eq(workoutPlansTable.isTemplate, false),
  ];
  if (status === "active") conditions.push(eq(workoutPlansTable.isActive, true));
  else if (status === "completed") conditions.push(eq(workoutPlansTable.isActive, false));

  const workouts = await db.select().from(workoutPlansTable)
    .where(and(...conditions))
    .orderBy(desc(workoutPlansTable.createdAt));

  res.json(workouts.map(serializeWorkout));
});

router.post("/workouts", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, description, goal, status, durationMinutes, durationWeeks, difficulty, category, weeklySchedule, exercises } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [workout] = await db.insert(workoutPlansTable).values({
    userId: user.id,
    name,
    description,
    goal,
    status: status || "active",
    durationMinutes,
    durationWeeks,
    difficulty: difficulty || "beginner",
    category,
    isTemplate: false,
    weeklySchedule: weeklySchedule || {},
    exercises: exercises || [],
  }).returning();

  res.status(201).json(serializeWorkout(workout));
});

router.get("/workouts/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [workout] = await db.select().from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!workout) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeWorkout(workout));
});

router.patch("/workouts/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const allowed = ["name", "description", "goal", "status", "durationMinutes", "durationWeeks", "difficulty", "category", "weeklySchedule", "exercises", "isActive"];
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const [workout] = await db.update(workoutPlansTable).set(updates)
    .where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id)))
    .returning();
  if (!workout) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeWorkout(workout));
});

router.delete("/workouts/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [deleted] = await db.delete(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ message: "Deleted" });
});

router.post("/workouts/:id/complete", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [workout] = await db.select().from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, id), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!workout) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { startTime, endTime, durationMinutes, caloriesBurned, exercisesCompleted, difficultyRating, rating, notes } = req.body;

  const [completion] = await db.insert(workoutCompletionsTable).values({
    workoutPlanId: id,
    userId: user.id,
    startTime: startTime ? new Date(startTime) : null,
    endTime: endTime ? new Date(endTime) : null,
    durationMinutes,
    caloriesBurned,
    exercisesCompleted: exercisesCompleted || [],
    difficultyRating,
    rating,
    notes,
  }).returning();

  await db.update(workoutPlansTable)
    .set({ completionCount: workout.completionCount + 1, updatedAt: new Date() })
    .where(eq(workoutPlansTable.id, id));

  // Update muscle recovery data based on exercises completed in this session
  if (exercisesCompleted && Array.isArray(exercisesCompleted) && exercisesCompleted.length > 0) {
    refreshMusclesAfterWorkout(user.id, exercisesCompleted as import("@workspace/db").CompletedExerciseLog[]).catch(() => {
      // Non-blocking: muscle recovery update failure should not fail the completion response
    });
  }

  // Compute and store workout analytics (volume, sets, reps) non-blocking
  processWorkoutAnalytics(user.id, completion.id).catch(() => {
    // Non-blocking: analytics failure should not fail the completion response
  });

  // Detect and save all personal records (max_weight, max_reps, max_volume, streak) non-blocking
  detectAndSavePRs(user.id, completion.id).catch(() => {
    // Non-blocking: PR detection failure should not fail the completion response
  });

  res.json(serializeCompletion(completion, workout.name));
});

// ─── Workout Days ─────────────────────────────────────────────────────────────

router.get("/workouts/:id/days", requireAuth, async (req, res) => {
  const user = getUser(req);
  const planId = Number(req.params.id);

  // Verify ownership
  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(
      eq(workoutPlansTable.id, planId),
      eq(workoutPlansTable.userId, user.id),
    ))
    .limit(1);

  if (!plan) {
    res.status(404).json({ error: "Workout plan not found" });
    return;
  }

  const days = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.workoutPlanId, planId))
    .orderBy(workoutDaysTable.dayNumber);

  res.json(days.map(serializeDay));
});

router.post("/workouts/:id/days", requireAuth, async (req, res) => {
  const user = getUser(req);
  const planId = Number(req.params.id);

  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, planId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);

  if (!plan) {
    res.status(404).json({ error: "Workout plan not found" });
    return;
  }

  const { dayNumber, title, focusArea, estimatedDurationMinutes, isRestDay } = req.body;
  if (!dayNumber || !title) {
    res.status(400).json({ error: "dayNumber and title are required" });
    return;
  }

  const [day] = await db.insert(workoutDaysTable).values({
    workoutPlanId: planId,
    dayNumber,
    title,
    focusArea,
    estimatedDurationMinutes,
    isRestDay: isRestDay || false,
  }).returning();

  res.status(201).json(serializeDay(day));
});

router.get("/workouts/days/:dayId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const dayId = Number(req.params.dayId);

  const [day] = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.id, dayId))
    .limit(1);

  if (!day) {
    res.status(404).json({ error: "Day not found" });
    return;
  }

  // Verify ownership via plan
  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, day.workoutPlanId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);

  if (!plan) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const exercises = await db.select().from(workoutDayExercisesTable)
    .where(eq(workoutDayExercisesTable.workoutDayId, dayId))
    .orderBy(workoutDayExercisesTable.orderIndex);

  res.json({ ...serializeDay(day), exercises: exercises.map(serializeDayExercise) });
});

router.patch("/workouts/days/:dayId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const dayId = Number(req.params.dayId);

  const [day] = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.id, dayId)).limit(1);
  if (!day) { res.status(404).json({ error: "Day not found" }); return; }

  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, day.workoutPlanId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!plan) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, focusArea, estimatedDurationMinutes, isRestDay } = req.body;
  const updates: Record<string, unknown> = {};
  if (title !== undefined) updates.title = title;
  if (focusArea !== undefined) updates.focusArea = focusArea;
  if (estimatedDurationMinutes !== undefined) updates.estimatedDurationMinutes = estimatedDurationMinutes;
  if (isRestDay !== undefined) updates.isRestDay = isRestDay;

  const [updated] = await db.update(workoutDaysTable).set(updates)
    .where(eq(workoutDaysTable.id, dayId)).returning();

  res.json(serializeDay(updated));
});

router.delete("/workouts/days/:dayId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const dayId = Number(req.params.dayId);

  const [day] = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.id, dayId)).limit(1);
  if (!day) { res.status(404).json({ error: "Day not found" }); return; }

  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, day.workoutPlanId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!plan) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(workoutDaysTable).where(eq(workoutDaysTable.id, dayId));
  res.json({ message: "Deleted" });
});

// ─── Day Exercises ────────────────────────────────────────────────────────────

router.post("/workouts/days/:dayId/exercises", requireAuth, async (req, res) => {
  const user = getUser(req);
  const dayId = Number(req.params.dayId);

  const [day] = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.id, dayId)).limit(1);
  if (!day) { res.status(404).json({ error: "Day not found" }); return; }

  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, day.workoutPlanId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!plan) { res.status(403).json({ error: "Forbidden" }); return; }

  const { exerciseId, exerciseName, orderIndex, sets, repsMin, repsMax, weightKg, durationSeconds, restSeconds, tempo, notes } = req.body;

  if (!exerciseId || !exerciseName || !sets) {
    res.status(400).json({ error: "exerciseId, exerciseName, and sets are required" });
    return;
  }

  const [exercise] = await db.insert(workoutDayExercisesTable).values({
    workoutDayId: dayId,
    exerciseId,
    exerciseName,
    orderIndex: orderIndex ?? 0,
    sets,
    repsMin,
    repsMax,
    weightKg: weightKg ? String(weightKg) : null,
    durationSeconds,
    restSeconds: restSeconds ?? 90,
    tempo,
    notes,
  }).returning();

  res.status(201).json(serializeDayExercise(exercise));
});

router.patch("/workouts/day-exercises/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);

  const [exercise] = await db.select().from(workoutDayExercisesTable)
    .where(eq(workoutDayExercisesTable.id, id)).limit(1);
  if (!exercise) { res.status(404).json({ error: "Not found" }); return; }

  const [day] = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.id, exercise.workoutDayId)).limit(1);
  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, day.workoutPlanId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!plan) { res.status(403).json({ error: "Forbidden" }); return; }

  const allowed = ["orderIndex", "sets", "repsMin", "repsMax", "durationSeconds", "restSeconds", "tempo", "notes"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (req.body.weightKg !== undefined) updates.weightKg = req.body.weightKg ? String(req.body.weightKg) : null;

  const [updated] = await db.update(workoutDayExercisesTable).set(updates)
    .where(eq(workoutDayExercisesTable.id, id)).returning();
  res.json(serializeDayExercise(updated));
});

router.delete("/workouts/day-exercises/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);

  const [exercise] = await db.select().from(workoutDayExercisesTable)
    .where(eq(workoutDayExercisesTable.id, id)).limit(1);
  if (!exercise) { res.status(404).json({ error: "Not found" }); return; }

  const [day] = await db.select().from(workoutDaysTable)
    .where(eq(workoutDaysTable.id, exercise.workoutDayId)).limit(1);
  const [plan] = await db.select({ id: workoutPlansTable.id })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, day.workoutPlanId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!plan) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(workoutDayExercisesTable).where(eq(workoutDayExercisesTable.id, id));
  res.json({ message: "Deleted" });
});

// ─── AI Preparation Stubs ─────────────────────────────────────────────────────

const AI_STUB_RESPONSE = {
  message: "AI features coming soon. This endpoint is reserved for future LLM integration.",
  available: false,
};

router.post("/workouts/ai/generate", requireAuth, (_req, res) => {
  res.json(AI_STUB_RESPONSE);
});

router.post("/workouts/ai/modify", requireAuth, (_req, res) => {
  res.json(AI_STUB_RESPONSE);
});

router.post("/workouts/ai/replace-exercise", requireAuth, (_req, res) => {
  res.json(AI_STUB_RESPONSE);
});

router.post("/workouts/ai/adjust-difficulty", requireAuth, (_req, res) => {
  res.json(AI_STUB_RESPONSE);
});

router.post("/workouts/ai/analyze", requireAuth, (_req, res) => {
  res.json(AI_STUB_RESPONSE);
});

export default router;
