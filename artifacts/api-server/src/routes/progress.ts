import { Router } from "express";
import { db } from "@workspace/db";
import { progressEntriesTable, achievementsTable, workoutCompletionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/progress/achievements", requireAuth, async (req, res) => {
  const user = getUser(req);
  const achievements = await db.select().from(achievementsTable).where(eq(achievementsTable.userId, user.id)).orderBy(desc(achievementsTable.earnedAt));
  res.json(achievements);
});

router.get("/progress/stats", requireAuth, async (req, res) => {
  const user = getUser(req);
  const completions = await db.select().from(workoutCompletionsTable).where(eq(workoutCompletionsTable.userId, user.id)).orderBy(workoutCompletionsTable.completedAt);
  const totalWorkouts = completions.length;
  const totalMinutes = completions.reduce((s, c) => s + (c.durationMinutes || 0), 0);
  const totalCaloriesBurned = completions.reduce((s, c) => s + (c.caloriesBurned || 0), 0);

  // Compute streak
  let currentStreak = 0;
  let longestStreak = 0;
  if (completions.length > 0) {
    const days = new Set(completions.map(c => c.completedAt.toISOString().split("T")[0]));
    const sortedDays = [...days].sort().reverse();
    const today = new Date().toISOString().split("T")[0];
    let streak = 0;
    let checkDate = today;
    for (const day of sortedDays) {
      if (day === checkDate) {
        streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split("T")[0];
      } else break;
    }
    currentStreak = streak;
    longestStreak = streak;
  }

  const weightEntries = await db.select().from(progressEntriesTable).where(and(eq(progressEntriesTable.userId, user.id), eq(progressEntriesTable.type, "weight"))).orderBy(progressEntriesTable.loggedAt);
  const weightChange = weightEntries.length >= 2
    ? Number(weightEntries[weightEntries.length - 1].weightKg) - Number(weightEntries[0].weightKg)
    : null;

  const [achievementsCount] = await db.select({ count: achievementsTable.id }).from(achievementsTable).where(eq(achievementsTable.userId, user.id));

  res.json({ totalWorkouts, totalMinutes, totalCaloriesBurned, currentStreak, longestStreak, weightChange, achievementsEarned: achievementsCount ? 1 : 0 });
});

router.get("/progress", requireAuth, async (req, res) => {
  const user = getUser(req);
  const type = req.query.type as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  let entries = await db.select().from(progressEntriesTable).where(eq(progressEntriesTable.userId, user.id)).orderBy(desc(progressEntriesTable.loggedAt)).limit(limit);
  if (type) {
    entries = entries.filter(e => e.type === type);
  }
  res.json(entries.map(serializeEntry));
});

router.post("/progress", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { type, weightKg, bodyFatPercent, chestCm, waistCm, hipsCm, armCm, thighCm, notes } = req.body;
  if (!type) { res.status(400).json({ error: "type is required" }); return; }

  const [entry] = await db.insert(progressEntriesTable).values({
    userId: user.id,
    type,
    weightKg: weightKg !== undefined ? String(weightKg) : null,
    bodyFatPercent: bodyFatPercent !== undefined ? String(bodyFatPercent) : null,
    chestCm: chestCm !== undefined ? String(chestCm) : null,
    waistCm: waistCm !== undefined ? String(waistCm) : null,
    hipsCm: hipsCm !== undefined ? String(hipsCm) : null,
    armCm: armCm !== undefined ? String(armCm) : null,
    thighCm: thighCm !== undefined ? String(thighCm) : null,
    notes,
  }).returning();
  res.status(201).json(serializeEntry(entry));
});

function serializeEntry(e: typeof progressEntriesTable.$inferSelect) {
  return {
    id: e.id,
    userId: e.userId,
    type: e.type,
    weightKg: e.weightKg ? Number(e.weightKg) : null,
    bodyFatPercent: e.bodyFatPercent ? Number(e.bodyFatPercent) : null,
    chestCm: e.chestCm ? Number(e.chestCm) : null,
    waistCm: e.waistCm ? Number(e.waistCm) : null,
    hipsCm: e.hipsCm ? Number(e.hipsCm) : null,
    armCm: e.armCm ? Number(e.armCm) : null,
    thighCm: e.thighCm ? Number(e.thighCm) : null,
    notes: e.notes,
    loggedAt: e.loggedAt,
  };
}

export default router;
