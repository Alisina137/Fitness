import { Router } from "express";
import { db } from "@workspace/db";
import { userReminderSettingsTable } from "@workspace/db";
import { requireAuth, getUser } from "../lib/auth.js";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

const VALID_MINUTES = [0, 15, 30, 60, 120, 1440] as const;

function serialize(row: typeof userReminderSettingsTable.$inferSelect) {
  return {
    reminderEnabled: row.reminderEnabled,
    reminderMinutesBefore: row.reminderMinutesBefore,
  };
}

/** Return the user's reminder settings, creating defaults if they don't exist yet. */
async function getOrCreateSettings(userId: number) {
  const [existing] = await db
    .select()
    .from(userReminderSettingsTable)
    .where(eq(userReminderSettingsTable.userId, userId))
    .limit(1);

  if (existing) return existing;

  // First-time: create default row (enabled, 30 min)
  const [created] = await db
    .insert(userReminderSettingsTable)
    .values({ userId, reminderEnabled: true, reminderMinutesBefore: 30 })
    .returning();
  return created;
}

// ─── GET /api/workout-reminders ───────────────────────────────────────────────

router.get("/workout-reminders", requireAuth, async (req, res) => {
  const user = getUser(req);
  const settings = await getOrCreateSettings(user.id);
  return res.json(serialize(settings));
});

// ─── PUT /api/workout-reminders ───────────────────────────────────────────────

router.put("/workout-reminders", requireAuth, async (req, res) => {
  const user = getUser(req);

  const bodySchema = z.object({
    reminderEnabled: z.boolean().optional(),
    reminderMinutesBefore: z
      .number()
      .int()
      .nonnegative("reminderMinutesBefore must not be negative")
      .optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const { reminderEnabled, reminderMinutesBefore } = parsed.data;

  // Validate minutes if provided
  if (
    reminderMinutesBefore !== undefined &&
    !(VALID_MINUTES as readonly number[]).includes(reminderMinutesBefore)
  ) {
    return res.status(400).json({
      error: "Validation failed",
      issues: [
        {
          field: "reminderMinutesBefore",
          message: `Must be one of: ${VALID_MINUTES.join(", ")}`,
        },
      ],
    });
  }

  // Ensure row exists
  await getOrCreateSettings(user.id);

  const updates: Partial<typeof userReminderSettingsTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (reminderEnabled !== undefined) updates.reminderEnabled = reminderEnabled;
  if (reminderMinutesBefore !== undefined) updates.reminderMinutesBefore = reminderMinutesBefore;

  const [updated] = await db
    .update(userReminderSettingsTable)
    .set(updates)
    .where(eq(userReminderSettingsTable.userId, user.id))
    .returning();

  return res.json(serialize(updated));
});

export { getOrCreateSettings };
export default router;
