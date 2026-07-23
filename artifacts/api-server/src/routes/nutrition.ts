import { Router } from "express";
import { db } from "@workspace/db";
import { nutritionEntriesTable, userProfilesTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { dayRangeUtc, todayDateString } from "../lib/http";

const router = Router();

router.get("/nutrition/summary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const date = (req.query.date as string) || todayDateString();
  const { start: dayStart, end: dayEnd } = dayRangeUtc(date);

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, user.id)).limit(1);
  const entries = await db.select().from(nutritionEntriesTable).where(
    and(eq(nutritionEntriesTable.userId, user.id), gte(nutritionEntriesTable.loggedAt, dayStart), lte(nutritionEntriesTable.loggedAt, dayEnd))
  );

  const totalCalories = entries.reduce((s, e) => s + Number(e.calories), 0);
  const totalProtein = entries.reduce((s, e) => s + Number(e.protein || 0), 0);
  const totalCarbs = entries.reduce((s, e) => s + Number(e.carbs || 0), 0);
  const totalFat = entries.reduce((s, e) => s + Number(e.fat || 0), 0);

  res.json({
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    calorieGoal: profile?.calorieGoal || 2000,
    entries: entries.length,
  });
});

router.get("/nutrition", requireAuth, async (req, res) => {
  const user = getUser(req);
  const date = (req.query.date as string) || todayDateString();
  const { start: dayStart, end: dayEnd } = dayRangeUtc(date);

  const entries = await db.select().from(nutritionEntriesTable).where(
    and(eq(nutritionEntriesTable.userId, user.id), gte(nutritionEntriesTable.loggedAt, dayStart), lte(nutritionEntriesTable.loggedAt, dayEnd))
  );
  res.json(entries.map(serializeEntry));
});

router.post("/nutrition", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { name, calories, protein, carbs, fat, fiber, mealType, servingSize, loggedAt } = req.body;
  if (!name || calories === undefined || !mealType) {
    res.status(400).json({ error: "name, calories, and mealType are required" });
    return;
  }
  const [entry] = await db.insert(nutritionEntriesTable).values({
    userId: user.id,
    name,
    calories: String(calories),
    protein: protein !== undefined ? String(protein) : null,
    carbs: carbs !== undefined ? String(carbs) : null,
    fat: fat !== undefined ? String(fat) : null,
    fiber: fiber !== undefined ? String(fiber) : null,
    mealType,
    servingSize,
    loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
  }).returning();
  res.status(201).json(serializeEntry(entry));
});

router.delete("/nutrition/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);
  const [deleted] = await db.delete(nutritionEntriesTable).where(and(eq(nutritionEntriesTable.id, id), eq(nutritionEntriesTable.userId, user.id))).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ message: "Deleted" });
});

function serializeEntry(e: typeof nutritionEntriesTable.$inferSelect) {
  return {
    id: e.id,
    userId: e.userId,
    name: e.name,
    calories: Number(e.calories),
    protein: e.protein ? Number(e.protein) : null,
    carbs: e.carbs ? Number(e.carbs) : null,
    fat: e.fat ? Number(e.fat) : null,
    fiber: e.fiber ? Number(e.fiber) : null,
    mealType: e.mealType,
    servingSize: e.servingSize,
    loggedAt: e.loggedAt,
  };
}

export default router;
