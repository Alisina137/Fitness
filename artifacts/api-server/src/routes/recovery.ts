import { Router } from "express";
import { z } from "zod/v4";
import { db } from "@workspace/db";
import { muscleRecoveryTable, dailyCheckInsTable } from "@workspace/db";
import { insertDailyCheckInSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth.js";
import {
  processCheckIn,
  getTodayRecovery,
  getRecoveryHistory,
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
    readiness: result.readiness,
    fatigue: result.fatigue,
    message: `Check-in complete. Recovery score: ${result.recoveryScore}/100.`,
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
