import { Router } from "express";
import { db } from "@workspace/db";
import { muscleRecoveryTable, dailyCheckInsTable, recoveryScoresTable } from "@workspace/db";
import { insertDailyCheckInSchema } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth.js";
import {
  processCheckIn,
  getTodayRecovery,
  getRecoveryHistory,
  recalculateTodayScore,
  classifyReadiness,
} from "../lib/recovery-engine.js";

const router = Router();

// ─── POST /api/recovery/check-in ─────────────────────────────────────────────
router.post("/recovery/check-in", requireAuth, async (req, res) => {
  const user = getUser(req);

  const parsed = insertDailyCheckInSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid check-in data", details: parsed.error.issues });
  }

  const result = await processCheckIn(user.id, parsed.data);

  res.status(201).json({
    recoveryScore: result.recoveryScore,
    breakdown: result.breakdown,
    readiness: result.readiness,
    fatigue: result.fatigue,
    message: `Check-in complete. Recovery score: ${result.recoveryScore}/100.`,
  });
});

// ─── POST /api/recovery/calculate ────────────────────────────────────────────
// Recalculates the recovery score from today's existing check-in on demand.
router.post("/recovery/calculate", requireAuth, async (req, res) => {
  const user = getUser(req);

  const result = await recalculateTodayScore(user.id);

  if (!result) {
    return res.status(404).json({
      error: "No check-in available for today. Complete a check-in first.",
    });
  }

  res.json({
    score: result.score,
    status: result.status,
    label: result.label,
    recommendation: result.recommendation,
    breakdown: result.breakdown,
    calculatedAt: new Date().toISOString(),
  });
});

// ─── GET /api/recovery/score/today ───────────────────────────────────────────
// Returns the stored recovery score record for today with full breakdown.
router.get("/recovery/score/today", requireAuth, async (req, res) => {
  const user = getUser(req);
  const todayStr = new Date().toISOString().split("T")[0];

  const [record] = await db
    .select()
    .from(recoveryScoresTable)
    .where(and(eq(recoveryScoresTable.userId, user.id), eq(recoveryScoresTable.date, todayStr)))
    .limit(1);

  if (!record) {
    return res.json({
      hasScore: false,
      message: "No recovery score for today. Complete a check-in to generate one.",
    });
  }

  const readiness = classifyReadiness(record.recoveryScore);

  res.json({
    hasScore: true,
    score: record.recoveryScore,
    status: record.recoveryStatus,
    label: readiness.label,
    recommendation: readiness.recommendation,
    breakdown: record.calculationDetails,
    createdAt: record.createdAt,
  });
});

// ─── GET /api/recovery/today ──────────────────────────────────────────────────
router.get("/recovery/today", requireAuth, async (req, res) => {
  const user = getUser(req);
  const data = await getTodayRecovery(user.id);
  res.json(data);
});

// ─── GET /api/recovery/history ────────────────────────────────────────────────
router.get("/recovery/history", requireAuth, async (req, res) => {
  const user = getUser(req);
  const days = Math.min(Number(req.query.days) || 30, 90);
  const history = await getRecoveryHistory(user.id, days);
  res.json(history);
});

// ─── GET /api/recovery/muscles ────────────────────────────────────────────────
router.get("/recovery/muscles", requireAuth, async (req, res) => {
  const user = getUser(req);

  const muscles = await db
    .select()
    .from(muscleRecoveryTable)
    .where(eq(muscleRecoveryTable.userId, user.id))
    .orderBy(muscleRecoveryTable.muscleGroup);

  res.json(muscles);
});

// ─── GET /api/recovery/recommendation ────────────────────────────────────────
router.get("/recovery/recommendation", requireAuth, async (req, res) => {
  const user = getUser(req);
  const data = await getTodayRecovery(user.id);

  if (!data.checkedInToday) {
    return res.json({
      hasRecommendation: false,
      message: "Complete today's check-in to get a personalized recommendation.",
    });
  }

  res.json({
    hasRecommendation: true,
    score: data.score,
    readiness: data.readiness,
    recommendation: data.recommendation,
    muscles: data.muscles,
  });
});

export default router;
