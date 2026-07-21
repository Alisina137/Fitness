import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth.js";
import { z } from "zod/v4";
import {
  findUserWorkout,
  findTemplateByName,
  listUserWorkoutTemplates,
  createUserWorkoutTemplate,
} from "../lib/workout-template-service.js";

const router = Router();

// ─── POST /api/workout-templates ──────────────────────────────────────────────
// Save an existing workout as a reusable, user-named template.

router.post("/workout-templates", requireAuth, async (req, res) => {
  const user = getUser(req);

  const bodySchema = z.object({
    name: z.string().trim().min(1, "Template name is required").max(120),
    workoutId: z.number().int().positive("A valid workout is required"),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const { name, workoutId } = parsed.data;

  // The referenced workout must exist and belong to the current user.
  const workout = await findUserWorkout(user.id, workoutId);
  if (!workout) {
    return res.status(404).json({ error: "Workout not found" });
  }

  // Template names must be unique per user (case-insensitive).
  const existing = await findTemplateByName(user.id, name);
  if (existing) {
    return res.status(409).json({ error: "A template with this name already exists." });
  }

  const template = await createUserWorkoutTemplate(user.id, name, workoutId, workout.name);
  return res.status(201).json(template);
});

// ─── GET /api/workout-templates ───────────────────────────────────────────────
// List the current user's saved workout templates.

router.get("/workout-templates", requireAuth, async (req, res) => {
  const user = getUser(req);
  const templates = await listUserWorkoutTemplates(user.id);
  return res.json(templates);
});

export default router;
