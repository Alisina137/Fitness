import { Router } from "express";
import { db } from "@workspace/db";
import { progressEntriesTable, achievementsTable, workoutCompletionsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, isNotNull, asc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";
import { updateAllUserGoals } from "../lib/goal-progress-service.js";

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

  // Recalculate goal progress (weight_loss/weight_gain/body_fat goals) non-blocking
  updateAllUserGoals(user.id).catch(() => {});

  res.status(201).json(serializeEntry(entry));
});

// ─── GET /api/body-measurements/chart ────────────────────────────────────────

type ChartPoint = { date: string; value: number };
type ChartData = Record<string, ChartPoint[]>;

const RANGE_TO_DAYS: Record<string, number | null> = {
  "30d": 30,
  "90d": 90,
  "1y": 365,
  "all": null,
};

const CHART_FIELD_EXTRACTORS: Array<{
  key: string;
  getter: (e: ReturnType<typeof serializeEntry>) => number | null | undefined;
}> = [
  { key: "weight",  getter: (e) => e.weightKg },
  { key: "bodyFat", getter: (e) => e.bodyFatPercent },
  { key: "waist",   getter: (e) => e.waistCm },
  { key: "chest",   getter: (e) => e.chestCm },
  { key: "arms",    getter: (e) => e.armCm },
  { key: "hips",    getter: (e) => e.hipsCm },
  { key: "thighs",  getter: (e) => e.thighCm },
];

router.get("/body-measurements/chart", requireAuth, async (req, res) => {
  const user = getUser(req);
  const range = (req.query.range as string) || "30d";
  const days = RANGE_TO_DAYS[range] ?? 30;

  const conditions = [eq(progressEntriesTable.userId, user.id)];
  if (days !== null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    conditions.push(gte(progressEntriesTable.loggedAt, cutoff));
  }

  const entries = await db
    .select()
    .from(progressEntriesTable)
    .where(and(...conditions))
    .orderBy(asc(progressEntriesTable.loggedAt));

  const serialized = entries.map(serializeEntry);

  const chart: ChartData = {};
  for (const { key, getter } of CHART_FIELD_EXTRACTORS) {
    chart[key] = serialized
      .map((e) => {
        const val = getter(e);
        return val != null ? { date: e.loggedAt as unknown as string, value: val } : null;
      })
      .filter((p): p is ChartPoint => p !== null);
  }

  res.json(chart);
});

// ─── GET /api/body-measurements/history ──────────────────────────────────────

const FIELD_FILTER_MAP = {
  weight:    (t: typeof progressEntriesTable) => isNotNull(t.weightKg),
  bodyFat:   (t: typeof progressEntriesTable) => isNotNull(t.bodyFatPercent),
  waist:     (t: typeof progressEntriesTable) => isNotNull(t.waistCm),
  chest:     (t: typeof progressEntriesTable) => isNotNull(t.chestCm),
  arms:      (t: typeof progressEntriesTable) => isNotNull(t.armCm),
  hips:      (t: typeof progressEntriesTable) => isNotNull(t.hipsCm),
  thighs:    (t: typeof progressEntriesTable) => isNotNull(t.thighCm),
} as const;

type MeasurementField = keyof typeof FIELD_FILTER_MAP;

// Map field key → value getter (reuses CHART_FIELD_EXTRACTORS order)
const FIELD_VALUE_GETTERS = Object.fromEntries(
  CHART_FIELD_EXTRACTORS.map(({ key, getter }) => [key, getter])
) as Record<string, (e: ReturnType<typeof serializeEntry>) => number | null | undefined>;

// ─── GET /api/body-measurements/compare ──────────────────────────────────────

router.get("/body-measurements/compare", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { measurementType, startDate, endDate } = req.query as Record<string, string>;

  // Validate measurementType
  if (!measurementType || !(measurementType in FIELD_FILTER_MAP)) {
    return res.status(400).json({
      error: "invalid_type",
      message: `measurementType must be one of: ${Object.keys(FIELD_FILTER_MAP).join(", ")}`,
    });
  }

  // Validate and parse dates
  const start = startDate ? new Date(startDate) : null;
  const end   = endDate   ? new Date(endDate)   : new Date();

  if (start && isNaN(start.getTime())) {
    return res.status(400).json({ error: "invalid_range", message: "Invalid startDate format" });
  }
  if (isNaN(end.getTime())) {
    return res.status(400).json({ error: "invalid_range", message: "Invalid endDate format" });
  }
  if (start && start >= end) {
    return res.status(400).json({ error: "invalid_range", message: "startDate must be before endDate" });
  }

  // Build query conditions
  const field = measurementType as MeasurementField;
  const conditions = [
    eq(progressEntriesTable.userId, user.id),
    FIELD_FILTER_MAP[field](progressEntriesTable),
  ];
  if (start) conditions.push(gte(progressEntriesTable.loggedAt, start));
  conditions.push(lte(progressEntriesTable.loggedAt, end));

  const entries = await db
    .select()
    .from(progressEntriesTable)
    .where(and(...conditions))
    .orderBy(asc(progressEntriesTable.loggedAt));

  // Validate result count
  if (entries.length === 0) {
    return res.status(404).json({
      error: "no_data",
      message: "No measurements found for this period and type",
    });
  }
  if (entries.length === 1) {
    const only = serializeEntry(entries[0]);
    return res.status(422).json({
      error: "insufficient_data",
      message: "At least two measurements are needed to compare",
      onlyValue: FIELD_VALUE_GETTERS[field]?.(only) ?? null,
      onlyDate:  only.loggedAt,
    });
  }

  const first = serializeEntry(entries[0]);
  const last  = serializeEntry(entries[entries.length - 1]);

  const getValue = (e: ReturnType<typeof serializeEntry>) =>
    (FIELD_VALUE_GETTERS[field]?.(e) ?? 0) as number;

  const startValue      = getValue(first);
  const endValue        = getValue(last);
  const difference      = Math.round((endValue - startValue) * 100) / 100;
  const percentageChange =
    startValue !== 0
      ? Math.round(((endValue - startValue) / Math.abs(startValue)) * 1000) / 10
      : 0;

  res.json({
    measurementType,
    startValue,
    endValue,
    difference,
    percentageChange,
    startDate:  first.loggedAt,
    endDate:    last.loggedAt,
    dataPoints: entries.length,
  });
});

router.get("/body-measurements/history", requireAuth, async (req, res) => {
  const user = getUser(req);
  const field = req.query.field as string | undefined;

  const conditions = [eq(progressEntriesTable.userId, user.id)];

  if (field && field in FIELD_FILTER_MAP) {
    conditions.push(FIELD_FILTER_MAP[field as MeasurementField](progressEntriesTable));
  }

  const entries = await db
    .select()
    .from(progressEntriesTable)
    .where(and(...conditions))
    .orderBy(desc(progressEntriesTable.loggedAt));

  res.json(entries.map(serializeEntry));
});

// ─── DELETE /api/body-measurements/:id ───────────────────────────────────────

router.delete("/body-measurements/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid measurement id" });
  }

  const [existing] = await db
    .select({ id: progressEntriesTable.id })
    .from(progressEntriesTable)
    .where(and(eq(progressEntriesTable.id, id), eq(progressEntriesTable.userId, user.id)));

  if (!existing) {
    return res.status(404).json({ error: "Measurement not found" });
  }

  await db.delete(progressEntriesTable).where(eq(progressEntriesTable.id, id));

  res.json({ deleted: true, id });
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
