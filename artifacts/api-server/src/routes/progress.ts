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

// ─── GET /api/body-measurements/trends ───────────────────────────────────────

type TrendDirection = "improving" | "stable" | "declining";

/** How many kg/cm/% per week is considered "significant" movement */
const STABILITY_THRESHOLD: Record<string, number> = {
  weight: 0.2, bodyFat: 0.1,
  waist: 0.2, chest: 0.2, arms: 0.2, hips: 0.2, thighs: 0.2,
};

/**
 * For each metric, is a positive weekly change good or bad?
 * true  = higher is better (e.g. chest/arm size when building muscle)
 * false = lower is better (e.g. weight, body fat, waist)
 */
const POSITIVE_IS_GOOD: Record<string, boolean> = {
  weight: false, bodyFat: false, waist: false, hips: false, thighs: false,
  chest: true, arms: true,
};

const METRIC_META: { key: MeasurementField; label: string; unit: string }[] = [
  { key: "weight",  label: "Weight",   unit: "kg" },
  { key: "bodyFat", label: "Body Fat", unit: "%" },
  { key: "waist",   label: "Waist",    unit: "cm" },
  { key: "chest",   label: "Chest",    unit: "cm" },
  { key: "arms",    label: "Arms",     unit: "cm" },
  { key: "hips",    label: "Hips",     unit: "cm" },
  { key: "thighs",  label: "Thighs",   unit: "cm" },
];

function classifyTrend(avgWeeklyChange: number, field: string): TrendDirection {
  const threshold = STABILITY_THRESHOLD[field] ?? 0.2;
  if (Math.abs(avgWeeklyChange) < threshold) return "stable";
  const positiveIsGood = POSITIVE_IS_GOOD[field] ?? false;
  return avgWeeklyChange > 0
    ? positiveIsGood ? "improving" : "declining"
    : positiveIsGood ? "declining" : "improving";
}

router.get("/body-measurements/trends", requireAuth, async (req, res) => {
  const user = getUser(req);

  // Look back 90 days for trend data
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const allEntries = await db
    .select()
    .from(progressEntriesTable)
    .where(and(
      eq(progressEntriesTable.userId, user.id),
      gte(progressEntriesTable.loggedAt, ninetyDaysAgo),
    ))
    .orderBy(asc(progressEntriesTable.loggedAt));

  const serialized = allEntries.map(serializeEntry);

  const trends = METRIC_META.map(({ key, label, unit }) => {
    const getter = FIELD_VALUE_GETTERS[key];
    const points = serialized
      .map((e) => ({ value: getter(e), date: e.loggedAt as unknown as string }))
      .filter((p): p is { value: number; date: string } => p.value != null);

    if (points.length === 0) {
      return { measurementType: key, label, unit, status: "no_data" as const };
    }
    if (points.length === 1) {
      return {
        measurementType: key, label, unit,
        status: "insufficient_data" as const,
        currentValue: points[0].value,
        lastUpdated: points[0].date,
        dataPoints: 1,
      };
    }

    const first = points[0];
    const last  = points[points.length - 1];
    const msElapsed = new Date(last.date).getTime() - new Date(first.date).getTime();
    const weeksElapsed = Math.max(msElapsed / (7 * 24 * 60 * 60 * 1000), 1 / 7);
    const avgWeeklyChange = Math.round(((last.value - first.value) / weeksElapsed) * 100) / 100;
    const trend = classifyTrend(avgWeeklyChange, key);

    return {
      measurementType: key,
      label,
      unit,
      status: "ok" as const,
      trend,
      avgWeeklyChange,
      currentValue: last.value,
      lastUpdated: last.date,
      dataPoints: points.length,
    };
  });

  res.json(trends);
});

// ─── GET /api/body-measurements/timeline ─────────────────────────────────────

router.get("/body-measurements/timeline", requireAuth, async (req, res) => {
  const user = getUser(req);
  const typeParam = req.query.type as string | undefined;

  // Validate optional type filter
  if (typeParam && typeParam !== "all" && !(typeParam in FIELD_FILTER_MAP)) {
    return res.status(400).json({
      error: "invalid_filter",
      message: `type must be one of: all, ${Object.keys(FIELD_FILTER_MAP).join(", ")}`,
    });
  }

  const conditions = [eq(progressEntriesTable.userId, user.id)];

  // If filtering by a specific type, require that field to be non-null
  if (typeParam && typeParam !== "all") {
    const field = typeParam as MeasurementField;
    conditions.push(FIELD_FILTER_MAP[field](progressEntriesTable));
  }

  const entries = await db
    .select()
    .from(progressEntriesTable)
    .where(and(...conditions))
    .orderBy(desc(progressEntriesTable.loggedAt));

  if (entries.length === 0) {
    return res.json([]);
  }

  // Explode each row into individual measurement items (one row may have multiple fields set)
  const items: {
    id: string;
    entryId: number;
    date: string;
    measurementType: string;
    label: string;
    value: number;
    unit: string;
  }[] = [];

  for (const entry of entries) {
    const s = serializeEntry(entry);
    for (const { key, label, unit } of METRIC_META) {
      // If filtering by type, only include matching field
      if (typeParam && typeParam !== "all" && typeParam !== key) continue;
      const value = FIELD_VALUE_GETTERS[key]?.(s);
      if (value == null) continue;
      items.push({
        id: `${entry.id}-${key}`,
        entryId: entry.id,
        date: (s.loggedAt as unknown as string),
        measurementType: key,
        label,
        value,
        unit,
      });
    }
  }

  res.json(items);
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
