import { Router } from "express";
import { db } from "@workspace/db";
import { exercisesTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/exercises", requireAuth, async (req, res) => {
  const { category, muscleGroup, difficulty, search } = req.query as Record<string, string>;

  let exercises = await db.select().from(exercisesTable);

  if (category) {
    exercises = exercises.filter(e => e.category.toLowerCase() === category.toLowerCase());
  }
  if (muscleGroup) {
    exercises = exercises.filter(e => e.muscleGroups.some((m: string) => m.toLowerCase().includes(muscleGroup.toLowerCase())));
  }
  if (difficulty) {
    exercises = exercises.filter(e => e.difficulty === difficulty);
  }
  if (search) {
    const q = search.toLowerCase();
    exercises = exercises.filter(e => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }

  res.json(exercises.map(serializeExercise));
});

router.get("/exercises/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [exercise] = await db.select().from(exercisesTable).where(eq(exercisesTable.id, id)).limit(1);
  if (!exercise) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeExercise(exercise));
});

function serializeExercise(e: typeof exercisesTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    difficulty: e.difficulty,
    muscleGroups: e.muscleGroups,
    equipment: e.equipment,
    instructions: e.instructions,
    videoUrl: e.videoUrl,
    imageUrl: e.imageUrl,
    caloriesPerMinute: e.caloriesPerMinute ? Number(e.caloriesPerMinute) : null,
  };
}

export default router;
