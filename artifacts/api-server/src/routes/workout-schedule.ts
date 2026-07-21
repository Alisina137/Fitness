import { Router } from "express";
import { db } from "@workspace/db";
import {
  scheduledWorkoutsTable,
  workoutPlansTable,
  insertScheduledWorkoutSchema,
} from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth.js";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

// Helper: serialize a scheduled workout row joined with workout name
function serialize(
  row: typeof scheduledWorkoutsTable.$inferSelect & { workoutName: string },
) {
  return {
    id: row.id,
    userId: row.userId,
    workoutId: row.workoutId,
    workoutName: row.workoutName,
    scheduledDate: row.scheduledDate,
    scheduledTime: row.scheduledTime ?? null,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── POST /api/workout-schedule ───────────────────────────────────────────────

router.post("/workout-schedule", requireAuth, async (req, res) => {
  const user = getUser(req);

  // Validate input
  const bodySchema = z.object({
    workoutId: z.number().int().positive("Workout is required"),
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
    scheduledTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time format. Use HH:mm")
      .nullable()
      .optional(),
    notes: z.string().max(1000).nullable().optional(),
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

  const { workoutId, scheduledDate, scheduledTime, notes } = parsed.data;

  // Verify workout exists and belongs to the user
  const [workout] = await db
    .select({ id: workoutPlansTable.id, name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(
      and(
        eq(workoutPlansTable.id, workoutId),
        eq(workoutPlansTable.userId, user.id),
      ),
    )
    .limit(1);

  if (!workout) {
    return res.status(404).json({ error: "Workout not found" });
  }

  // Insert
  const [created] = await db
    .insert(scheduledWorkoutsTable)
    .values({
      userId: user.id,
      workoutId,
      scheduledDate,
      scheduledTime: scheduledTime ?? null,
      status: "scheduled",
      notes: notes ?? null,
    })
    .returning();

  return res.status(201).json(serialize({ ...created, workoutName: workout.name }));
});

// ─── GET /api/workout-schedule ────────────────────────────────────────────────

router.get("/workout-schedule", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { date, status } = req.query;

  const conditions = [eq(scheduledWorkoutsTable.userId, user.id)];

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    conditions.push(eq(scheduledWorkoutsTable.scheduledDate, date));
  }
  if (typeof status === "string") {
    conditions.push(eq(scheduledWorkoutsTable.status, status));
  }

  const rows = await db
    .select({
      id: scheduledWorkoutsTable.id,
      userId: scheduledWorkoutsTable.userId,
      workoutId: scheduledWorkoutsTable.workoutId,
      workoutName: workoutPlansTable.name,
      scheduledDate: scheduledWorkoutsTable.scheduledDate,
      scheduledTime: scheduledWorkoutsTable.scheduledTime,
      status: scheduledWorkoutsTable.status,
      notes: scheduledWorkoutsTable.notes,
      createdAt: scheduledWorkoutsTable.createdAt,
      updatedAt: scheduledWorkoutsTable.updatedAt,
    })
    .from(scheduledWorkoutsTable)
    .innerJoin(
      workoutPlansTable,
      eq(scheduledWorkoutsTable.workoutId, workoutPlansTable.id),
    )
    .where(and(...conditions))
    .orderBy(desc(scheduledWorkoutsTable.scheduledDate));

  return res.json(rows.map(serialize));
});

// ─── GET /api/workout-schedule/:id ───────────────────────────────────────────

router.get("/workout-schedule/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const [row] = await db
    .select({
      id: scheduledWorkoutsTable.id,
      userId: scheduledWorkoutsTable.userId,
      workoutId: scheduledWorkoutsTable.workoutId,
      workoutName: workoutPlansTable.name,
      scheduledDate: scheduledWorkoutsTable.scheduledDate,
      scheduledTime: scheduledWorkoutsTable.scheduledTime,
      status: scheduledWorkoutsTable.status,
      notes: scheduledWorkoutsTable.notes,
      createdAt: scheduledWorkoutsTable.createdAt,
      updatedAt: scheduledWorkoutsTable.updatedAt,
    })
    .from(scheduledWorkoutsTable)
    .innerJoin(
      workoutPlansTable,
      eq(scheduledWorkoutsTable.workoutId, workoutPlansTable.id),
    )
    .where(
      and(
        eq(scheduledWorkoutsTable.id, id),
        eq(scheduledWorkoutsTable.userId, user.id),
      ),
    )
    .limit(1);

  if (!row) {
    return res.status(404).json({ error: "Scheduled workout not found" });
  }

  return res.json(serialize(row));
});

// ─── PATCH /api/workout-schedule/:id/reschedule ──────────────────────────────

router.patch("/workout-schedule/:id/reschedule", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const bodySchema = z.object({
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  // Verify ownership
  const [existing] = await db
    .select({
      id: scheduledWorkoutsTable.id,
      workoutId: scheduledWorkoutsTable.workoutId,
    })
    .from(scheduledWorkoutsTable)
    .where(and(eq(scheduledWorkoutsTable.id, id), eq(scheduledWorkoutsTable.userId, user.id)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Scheduled workout not found" });

  const [updated] = await db
    .update(scheduledWorkoutsTable)
    .set({ scheduledDate: parsed.data.scheduledDate, updatedAt: new Date() })
    .where(eq(scheduledWorkoutsTable.id, id))
    .returning();

  const [workout] = await db
    .select({ name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(eq(workoutPlansTable.id, updated.workoutId))
    .limit(1);

  return res.json(serialize({ ...updated, workoutName: workout?.name ?? "" }));
});

// ─── PATCH /api/workout-schedule/:id (status only) ───────────────────────────

router.patch("/workout-schedule/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const VALID_STATUSES = ["scheduled", "completed", "missed", "cancelled"] as const;
  const bodySchema = z.object({
    status: z.enum(VALID_STATUSES, { error: "Status must be one of: scheduled, completed, missed, cancelled" }),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const [existing] = await db
    .select({ id: scheduledWorkoutsTable.id })
    .from(scheduledWorkoutsTable)
    .where(and(eq(scheduledWorkoutsTable.id, id), eq(scheduledWorkoutsTable.userId, user.id)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Scheduled workout not found" });

  const [updated] = await db
    .update(scheduledWorkoutsTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(scheduledWorkoutsTable.id, id))
    .returning();

  const [workout] = await db
    .select({ name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(eq(workoutPlansTable.id, updated.workoutId))
    .limit(1);

  return res.json(serialize({ ...updated, workoutName: workout?.name ?? "" }));
});

// ─── PUT /api/workout-schedule/:id ───────────────────────────────────────────

router.put("/workout-schedule/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  // Verify ownership
  const [existing] = await db
    .select({ id: scheduledWorkoutsTable.id })
    .from(scheduledWorkoutsTable)
    .where(and(eq(scheduledWorkoutsTable.id, id), eq(scheduledWorkoutsTable.userId, user.id)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Scheduled workout not found" });

  const bodySchema = z.object({
    workoutId: z.number().int().positive("Workout is required"),
    scheduledDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
      .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
    scheduledTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Invalid time format. Use HH:mm")
      .nullable()
      .optional(),
    notes: z.string().max(1000).nullable().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const { workoutId, scheduledDate, scheduledTime, notes } = parsed.data;

  // Verify workout exists and belongs to this user
  const [workout] = await db
    .select({ id: workoutPlansTable.id, name: workoutPlansTable.name })
    .from(workoutPlansTable)
    .where(and(eq(workoutPlansTable.id, workoutId), eq(workoutPlansTable.userId, user.id)))
    .limit(1);
  if (!workout) return res.status(404).json({ error: "Workout not found" });

  const [updated] = await db
    .update(scheduledWorkoutsTable)
    .set({
      workoutId,
      scheduledDate,
      scheduledTime: scheduledTime ?? null,
      notes: notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(scheduledWorkoutsTable.id, id))
    .returning();

  return res.json(serialize({ ...updated, workoutName: workout.name }));
});

// ─── DELETE /api/workout-schedule/:id ────────────────────────────────────────

router.delete("/workout-schedule/:id", requireAuth, async (req, res) => {
  const user = getUser(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

  const [existing] = await db
    .select({ id: scheduledWorkoutsTable.id })
    .from(scheduledWorkoutsTable)
    .where(and(eq(scheduledWorkoutsTable.id, id), eq(scheduledWorkoutsTable.userId, user.id)))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Scheduled workout not found" });

  await db.delete(scheduledWorkoutsTable).where(eq(scheduledWorkoutsTable.id, id));

  return res.json({ deleted: true, id });
});

export default router;
