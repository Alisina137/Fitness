import { Router } from "express";
import { db } from "@workspace/db";
import { personalRecordsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth.js";
import { clampInt } from "../lib/http.js";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function serializePR(row: typeof personalRecordsTable.$inferSelect) {
  return {
    id: row.id,
    exerciseId: row.exerciseId,
    exerciseName: row.exerciseName,
    recordType: row.recordType,
    value: Number(row.value),
    previousValue: row.previousValue !== null ? Number(row.previousValue) : null,
    improvementPercentage: row.improvementPercentage !== null ? Number(row.improvementPercentage) : null,
    unit: row.unit,
    achievedAt: row.achievedAt,
    workoutCompletionId: row.workoutCompletionId,
  };
}

// ─── GET /api/records ─────────────────────────────────────────────────────────
// All personal records for the current user, grouped by exercise.
router.get("/records", requireAuth, async (req, res) => {
  const user = getUser(req);

  const rows = await db
    .select()
    .from(personalRecordsTable)
    .where(eq(personalRecordsTable.userId, user.id))
    .orderBy(desc(personalRecordsTable.achievedAt));

  // Group by exercise for a cleaner response
  const byExercise = new Map<number, { exerciseId: number; exerciseName: string; records: ReturnType<typeof serializePR>[] }>();
  for (const row of rows) {
    const key = row.exerciseId;
    if (!byExercise.has(key)) {
      byExercise.set(key, { exerciseId: row.exerciseId, exerciseName: row.exerciseName, records: [] });
    }
    byExercise.get(key)!.records.push(serializePR(row));
  }

  res.json({
    total: rows.length,
    exercises: [...byExercise.values()],
    all: rows.map(serializePR),
  });
});

// ─── GET /api/records/latest ─────────────────────────────────────────────────
// Most recent personal records (default: 10).
router.get("/records/latest", requireAuth, async (req, res) => {
  const user = getUser(req);
  const limit = clampInt(req.query.limit, 10, 50);

  const rows = await db
    .select()
    .from(personalRecordsTable)
    .where(eq(personalRecordsTable.userId, user.id))
    .orderBy(desc(personalRecordsTable.achievedAt))
    .limit(limit);

  res.json(rows.map(serializePR));
});

// ─── GET /api/records/:exerciseId ─────────────────────────────────────────────
// All records for a single exercise (use exerciseId=0 for streak/global records).
router.get("/records/:exerciseId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const exerciseId = Number(req.params.exerciseId);

  if (!Number.isFinite(exerciseId) || exerciseId < 0) {
    return res.status(400).json({ error: "exerciseId must be a non-negative integer." });
  }

  const rows = await db
    .select()
    .from(personalRecordsTable)
    .where(
      and(
        eq(personalRecordsTable.userId, user.id),
        eq(personalRecordsTable.exerciseId, exerciseId),
      ),
    )
    .orderBy(desc(personalRecordsTable.achievedAt));

  if (rows.length === 0) {
    return res.json({ exerciseId, records: [], message: "No records yet for this exercise." });
  }

  res.json({
    exerciseId,
    exerciseName: rows[0].exerciseName,
    records: rows.map(serializePR),
  });
});

export default router;
