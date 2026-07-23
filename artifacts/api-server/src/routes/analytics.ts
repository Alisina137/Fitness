import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth.js";
import { clampInt } from "../lib/http.js";
import {
  getWorkoutSummary,
  getExerciseProgressHistory,
  getConsistencyData,
  getUserPerformanceSummary,
} from "../lib/analytics-engine.js";

const router = Router();

// ─── GET /api/analytics/workout-summary ──────────────────────────────────────
// Returns pre-computed workout totals and averages for a time period.
router.get("/analytics/workout-summary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const days = clampInt(req.query.days, 30, 365);

  const summary = await getWorkoutSummary(user.id, days);
  res.json(summary);
});

// ─── GET /api/analytics/exercise/:exerciseId ──────────────────────────────────
// Returns per-session history + progress metrics for a single exercise.
router.get("/analytics/exercise/:exerciseId", requireAuth, async (req, res) => {
  const user = getUser(req);
  const exerciseId = Number(req.params.exerciseId);

  if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
    return res.status(400).json({ error: "exerciseId must be a positive integer." });
  }

  const limit = clampInt(req.query.limit, 30, 100);
  const data = await getExerciseProgressHistory(user.id, exerciseId, limit);

  if (data.history.length === 0) {
    return res.json({
      exerciseId,
      exerciseName: null,
      history: [],
      progress: null,
      message: "No performance data yet for this exercise.",
    });
  }

  res.json(data);
});

// ─── GET /api/analytics/consistency ──────────────────────────────────────────
// Returns consistency score and workout frequency for a period.
router.get("/analytics/consistency", requireAuth, async (req, res) => {
  const user = getUser(req);
  const days = clampInt(req.query.days, 28, 365);

  const data = await getConsistencyData(user.id, days);
  res.json(data);
});

// ─── GET /api/analytics/performance-summary ───────────────────────────────────
// AI-prep endpoint — full performance summary for coach/generator use.
router.get("/analytics/performance-summary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const summary = await getUserPerformanceSummary(user.id);
  res.json(summary);
});

export default router;
