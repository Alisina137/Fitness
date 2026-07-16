import { Router } from "express";
import { db } from "@workspace/db";
import { aiGeneratedWorkoutsTable, workoutAdaptationsTable, workoutPlansTable, generationHistoryTable } from "@workspace/db";
import type { WorkoutExerciseJson } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth.js";
import { generatePersonalizedWorkout, findExerciseReplacement } from "../lib/ai-workout-engine.js";

const router = Router();

// ─── POST /api/ai/workout/generate ───────────────────────────────────────────
router.post("/ai/workout/generate", requireAuth, async (req, res) => {
  const user = getUser(req);

  // Check if a recent draft exists and user doesn't want to regenerate
  const { regenerate = false } = req.body ?? {};
  if (!regenerate) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [recent] = await db
      .select()
      .from(aiGeneratedWorkoutsTable)
      .where(
        and(
          eq(aiGeneratedWorkoutsTable.userId, user.id),
          eq(aiGeneratedWorkoutsTable.status, "draft"),
        ),
      )
      .orderBy(desc(aiGeneratedWorkoutsTable.createdAt))
      .limit(1);

    if (recent && recent.createdAt > oneHourAgo) {
      return res.json({
        generationId: recent.id,
        plan: recent.generatedPlan,
        personalizationScore: recent.personalizationScore,
        scoreBreakdown: recent.scoreBreakdown,
        cached: true,
      });
    }
  }

  const result = await generatePersonalizedWorkout(user.id);
  res.json({ ...result, cached: false });
});

// ─── POST /api/ai/workout/adapt ───────────────────────────────────────────────
router.post("/ai/workout/adapt", requireAuth, async (req, res) => {
  const user = getUser(req);

  const [lastGeneration] = await db
    .select()
    .from(aiGeneratedWorkoutsTable)
    .where(eq(aiGeneratedWorkoutsTable.userId, user.id))
    .orderBy(desc(aiGeneratedWorkoutsTable.createdAt))
    .limit(1);

  // Generate a fresh adapted plan (engine already applies progressive overload logic)
  const result = await generatePersonalizedWorkout(user.id);

  // Record the adaptation
  if (lastGeneration) {
    await db.insert(workoutAdaptationsTable).values({
      userId: user.id,
      previousWorkoutId: lastGeneration.id,
      newWorkoutId: result.generationId,
      adaptationType: "progressive_overload",
      reason: result.plan.adaptationNotes,
    });
  }

  res.json(result);
});

// ─── POST /api/ai/workout/replace-exercise ────────────────────────────────────
router.post("/ai/workout/replace-exercise", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { exerciseId, goal } = req.body ?? {};

  if (!exerciseId) {
    return res.status(400).json({ error: "exerciseId is required" });
  }

  const replacement = await findExerciseReplacement(
    user.id,
    Number(exerciseId),
    goal ?? "general_fitness",
  );

  if (!replacement) {
    return res.status(404).json({ error: "No suitable replacement found with your equipment and limitations." });
  }

  res.json({
    exercise: {
      exerciseId: replacement.exercise.id,
      name: replacement.exercise.name,
      muscleGroups: replacement.exercise.muscleGroups,
      equipment: replacement.exercise.equipment,
      difficulty: replacement.exercise.difficulty,
      category: replacement.exercise.category,
    },
    reasoning: replacement.reasoning,
  });
});

// ─── GET /api/ai/workout/recommendation ──────────────────────────────────────
router.get("/ai/workout/recommendation", requireAuth, async (req, res) => {
  const user = getUser(req);

  const [latest] = await db
    .select()
    .from(aiGeneratedWorkoutsTable)
    .where(eq(aiGeneratedWorkoutsTable.userId, user.id))
    .orderBy(desc(aiGeneratedWorkoutsTable.createdAt))
    .limit(1);

  if (!latest) {
    return res.json({ hasRecommendation: false });
  }

  res.json({
    hasRecommendation: true,
    generationId: latest.id,
    plan: latest.generatedPlan,
    personalizationScore: latest.personalizationScore,
    scoreBreakdown: latest.scoreBreakdown,
    status: latest.status,
    createdAt: latest.createdAt,
  });
});

// ─── GET /api/ai/workout/history ──────────────────────────────────────────────
router.get("/ai/workout/history", requireAuth, async (req, res) => {
  const user = getUser(req);

  const history = await db
    .select()
    .from(aiGeneratedWorkoutsTable)
    .where(eq(aiGeneratedWorkoutsTable.userId, user.id))
    .orderBy(desc(aiGeneratedWorkoutsTable.createdAt))
    .limit(20);

  res.json(
    history.map((h) => ({
      id: h.id,
      name: h.generatedPlan?.name ?? "Generated Plan",
      goal: h.generatedPlan?.goal ?? "",
      split: h.generatedPlan?.split ?? "",
      personalizationScore: h.personalizationScore,
      status: h.status,
      workoutPlanId: h.workoutPlanId,
      createdAt: h.createdAt,
    })),
  );
});

// ─── POST /api/ai/workout/save ────────────────────────────────────────────────
router.post("/ai/workout/save", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { generationId } = req.body ?? {};

  if (!generationId) {
    return res.status(400).json({ error: "generationId is required" });
  }

  const [generation] = await db
    .select()
    .from(aiGeneratedWorkoutsTable)
    .where(
      and(
        eq(aiGeneratedWorkoutsTable.id, Number(generationId)),
        eq(aiGeneratedWorkoutsTable.userId, user.id),
      ),
    )
    .limit(1);

  if (!generation) {
    return res.status(404).json({ error: "Generation not found" });
  }

  const plan = generation.generatedPlan;

  // Convert generated exercises → WorkoutExerciseJson[]
  // We flatten all days into a single exercises array for the workout plan
  // (the weekly_schedule stores which days to train)
  const allExercises: WorkoutExerciseJson[] = plan.days.flatMap((day) =>
    day.exercises.map((ex, idx) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      orderIndex: idx,
      sets: ex.sets,
      repsMin: ex.repsMin,
      repsMax: ex.repsMax,
      reps: ex.repsMax,
      restSeconds: ex.restSeconds,
      tempo: ex.tempo ?? null,
      weightKg: null,
      durationSeconds: null,
      notes: ex.reasoning,
    })),
  );

  const weeklySchedule = {
    days: plan.days.map((d) => d.dayOfWeek),
    frequency: plan.days.length,
  };

  const [workoutPlan] = await db
    .insert(workoutPlansTable)
    .values({
      userId: user.id,
      name: plan.name,
      description: plan.description,
      goal: plan.goal,
      status: "active",
      difficulty: plan.difficulty,
      category: "AI Generated",
      isTemplate: false,
      weeklySchedule,
      progressionRules: { type: "linear" },
      exercises: allExercises,
      durationWeeks: plan.durationWeeks,
      isActive: true,
    })
    .returning();

  // Mark generation as saved
  await db
    .update(aiGeneratedWorkoutsTable)
    .set({ status: "saved", workoutPlanId: workoutPlan.id })
    .where(eq(aiGeneratedWorkoutsTable.id, Number(generationId)));

  // Update generation history success rating
  await db
    .update(generationHistoryTable)
    .set({ successRating: 5 })
    .where(eq(generationHistoryTable.userId, user.id));

  res.status(201).json({ workoutPlanId: workoutPlan.id, message: "Plan saved to your workouts" });
});

export default router;
