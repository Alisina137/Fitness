import { Router } from "express";
import { db, exercisesTable, userFavoriteExercisesTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function serializeExercise(
  e: typeof exercisesTable.$inferSelect,
  isFavorite = false,
) {
  return {
    id: e.id,
    name: e.name,
    shortDescription: e.shortDescription,
    category: e.category,
    difficulty: e.difficulty,
    trainingType: e.trainingType,
    primaryMuscles: e.primaryMuscles,
    secondaryMuscles: e.secondaryMuscles,
    muscleGroups: e.muscleGroups,
    equipment: e.equipment,
    instructions: e.instructions,
    commonMistakes: e.commonMistakes,
    safetyTips: e.safetyTips,
    contraindications: e.contraindications,
    alternativeExercises: e.alternativeExercises,
    progressions: e.progressions,
    goals: e.goals,
    tags: e.tags,
    caloriesPerMinute: e.caloriesPerMinute ? Number(e.caloriesPerMinute) : null,
    imageUrl: e.imageUrl,
    videoUrl: e.videoUrl,
    thumbnailUrl: e.thumbnailUrl,
    gifUrl: e.gifUrl,
    isFavorite,
  };
}

// ─── GET /exercises ──────────────────────────────────────────────────────────
router.get("/exercises", requireAuth, async (req, res) => {
  const {
    category, muscleGroup, difficulty, trainingType,
    equipment, goal, search,
    limit = "50", offset = "0",
  } = req.query as Record<string, string>;

  const userId = req.user!.id;
  const conditions: ReturnType<typeof eq>[] = [];

  if (category)     conditions.push(ilike(exercisesTable.category, `%${category}%`));
  if (difficulty)   conditions.push(sql`${exercisesTable.difficulty}::text = ${difficulty}`);
  if (trainingType) conditions.push(sql`${exercisesTable.trainingType}::text = ${trainingType}`);
  if (muscleGroup) {
    conditions.push(
      or(
        sql`${muscleGroup} = ANY(${exercisesTable.primaryMuscles})`,
        sql`${muscleGroup} = ANY(${exercisesTable.secondaryMuscles})`,
        sql`${muscleGroup} = ANY(${exercisesTable.muscleGroups})`,
      )!
    );
  }
  if (equipment) conditions.push(sql`${equipment} = ANY(${exercisesTable.equipment})`);
  if (goal)      conditions.push(sql`${goal} = ANY(${exercisesTable.goals})`);
  if (search) {
    conditions.push(
      or(
        ilike(exercisesTable.name, `%${search}%`),
        ilike(exercisesTable.shortDescription, `%${search}%`),
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const lim = Math.min(Number(limit) || 50, 200);
  const off = Number(offset) || 0;

  const [rows, countResult] = await Promise.all([
    db
      .select({
        exercise: exercisesTable,
        favUserId: userFavoriteExercisesTable.userId,
      })
      .from(exercisesTable)
      .leftJoin(
        userFavoriteExercisesTable,
        and(
          eq(userFavoriteExercisesTable.exerciseId, exercisesTable.id),
          eq(userFavoriteExercisesTable.userId, userId),
        ),
      )
      .where(where)
      .limit(lim)
      .offset(off)
      .orderBy(exercisesTable.name),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(exercisesTable)
      .where(where),
  ]);

  res.json({
    exercises: rows.map((r) => serializeExercise(r.exercise, r.favUserId != null)),
    total: countResult[0]?.count ?? 0,
  });
});

// ─── GET /exercises/:id ───────────────────────────────────────────────────────
router.get("/exercises/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid exercise ID" }); return; }

  const userId = req.user!.id;

  const [row] = await db
    .select({
      exercise: exercisesTable,
      favUserId: userFavoriteExercisesTable.userId,
    })
    .from(exercisesTable)
    .leftJoin(
      userFavoriteExercisesTable,
      and(
        eq(userFavoriteExercisesTable.exerciseId, exercisesTable.id),
        eq(userFavoriteExercisesTable.userId, userId),
      ),
    )
    .where(eq(exercisesTable.id, id))
    .limit(1);

  if (!row) { res.status(404).json({ error: "Exercise not found" }); return; }

  res.json(serializeExercise(row.exercise, row.favUserId != null));
});

// ─── GET /exercises/:id/alternatives ─────────────────────────────────────────
router.get("/exercises/:id/alternatives", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid exercise ID" }); return; }

  const userId = req.user!.id;

  const [source] = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.id, id))
    .limit(1);

  if (!source) { res.status(404).json({ error: "Exercise not found" }); return; }

  const rows = await db
    .select({
      exercise: exercisesTable,
      favUserId: userFavoriteExercisesTable.userId,
    })
    .from(exercisesTable)
    .leftJoin(
      userFavoriteExercisesTable,
      and(
        eq(userFavoriteExercisesTable.exerciseId, exercisesTable.id),
        eq(userFavoriteExercisesTable.userId, userId),
      ),
    )
    .where(
      and(
        sql`${exercisesTable.id} != ${id}`,
        or(
          ilike(exercisesTable.category, source.category),
          sql`${exercisesTable.primaryMuscles} && ${sql.raw(
            `ARRAY[${source.primaryMuscles.map((m) => `'${m}'`).join(",")}]::text[]`,
          )}`,
        )!,
      )!,
    )
    .limit(6)
    .orderBy(exercisesTable.difficulty);

  res.json(rows.map((r) => serializeExercise(r.exercise, r.favUserId != null)));
});

// ─── PATCH /exercises/:id/favorite ───────────────────────────────────────────
router.patch("/exercises/:id/favorite", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid exercise ID" }); return; }

  const userId = req.user!.id;

  // Verify exercise exists
  const [exercise] = await db
    .select({ id: exercisesTable.id })
    .from(exercisesTable)
    .where(eq(exercisesTable.id, id))
    .limit(1);

  if (!exercise) { res.status(404).json({ error: "Exercise not found" }); return; }

  // Check if already favorited
  const [existing] = await db
    .select()
    .from(userFavoriteExercisesTable)
    .where(
      and(
        eq(userFavoriteExercisesTable.userId, userId),
        eq(userFavoriteExercisesTable.exerciseId, id),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(userFavoriteExercisesTable)
      .where(
        and(
          eq(userFavoriteExercisesTable.userId, userId),
          eq(userFavoriteExercisesTable.exerciseId, id),
        ),
      );
    res.json({ isFavorite: false });
  } else {
    await db
      .insert(userFavoriteExercisesTable)
      .values({ userId, exerciseId: id });
    res.json({ isFavorite: true });
  }
});

// ─── AI-READY QUERY HELPERS ───────────────────────────────────────────────────

export async function getExercisesByGoal(goal: string, limit = 20) {
  return db.select().from(exercisesTable)
    .where(sql`${goal} = ANY(${exercisesTable.goals})`)
    .limit(limit);
}

export async function getExercisesByEquipment(equipment: string[], limit = 30) {
  const conditions = equipment.map((e) => sql`${e} = ANY(${exercisesTable.equipment})`);
  return db.select().from(exercisesTable)
    .where(or(...conditions)!)
    .limit(limit);
}

export async function getExercisesByMuscle(muscle: string, limit = 20) {
  return db.select().from(exercisesTable)
    .where(
      or(
        sql`${muscle} = ANY(${exercisesTable.primaryMuscles})`,
        sql`${muscle} = ANY(${exercisesTable.muscleGroups})`,
      )!
    )
    .limit(limit);
}

export async function getBeginnerExercises(limit = 30) {
  return db.select().from(exercisesTable)
    .where(eq(exercisesTable.difficulty, "beginner"))
    .limit(limit);
}

export async function getAlternativeExercises(exerciseId: number, limit = 6) {
  const [source] = await db.select().from(exercisesTable).where(eq(exercisesTable.id, exerciseId)).limit(1);
  if (!source || !source.primaryMuscles.length) return [];
  return db.select().from(exercisesTable)
    .where(
      and(
        sql`${exercisesTable.id} != ${exerciseId}`,
        ilike(exercisesTable.category, source.category),
      )!
    )
    .limit(limit);
}

export async function getSafeExercisesForLimitation(injuries: string[], limit = 30) {
  const exclusions = injuries.map((i) =>
    sql`NOT (${i.toLowerCase()} = ANY(${exercisesTable.primaryMuscles}))`
  );
  return db.select().from(exercisesTable)
    .where(and(...exclusions)!)
    .limit(limit);
}

export default router;
