import { Router } from "express";
import { requireAuth, getUser } from "../lib/auth.js";
import { z } from "zod/v4";
import {
  findUserWorkout,
  findTemplateByName,
  findTemplateById,
  findTemplateByNameExcluding,
  updateWorkoutTemplate,
  listUserWorkoutTemplates,
  createUserWorkoutTemplate,
} from "../lib/workout-template-service.js";

const router = Router();

// ─── PATCH /api/workout-templates/:id ─────────────────────────────────────────
// Rename a template. Does not change the linked workout.

router.patch("/workout-templates/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const templateId = parseInt(req.params.id ?? "", 10);

  if (!templateId || isNaN(templateId)) {
    return res.status(400).json({ error: "Invalid template ID" });
  }

  const bodySchema = z.object({
    name: z.string().trim().min(1, "Template name is required").max(120),
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

  const { name } = parsed.data;

  // Verify the template exists and belongs to the user.
  const template = await findTemplateById(user.id, templateId);
  if (!template) {
    return res.status(404).json({ error: "Template not found" });
  }

  // Reject if another template already uses this name (case-insensitive).
  const duplicate = await findTemplateByNameExcluding(user.id, name, templateId);
  if (duplicate) {
    return res.status(409).json({ error: "A template with this name already exists." });
  }

  const updated = await updateWorkoutTemplate(user.id, templateId, name);
  if (!updated) {
    return res.status(500).json({ error: "Failed to update template" });
  }

  // Re-fetch with workoutName joined for the full response shape.
  const full = await findTemplateById(user.id, templateId);
  return res.json(full);
});

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
