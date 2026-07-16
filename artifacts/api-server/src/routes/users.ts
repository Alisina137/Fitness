import { Router } from "express";
import { db, usersTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/users/profile", requireAuth, async (req, res) => {
  const user = getUser(req);
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, user.id)).limit(1);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(serializeProfile(profile));
});

router.patch("/users/profile", requireAuth, async (req, res) => {
  const user = getUser(req);
  const { age, gender, heightCm, weightKg, fitnessLevel, goals, equipmentAvailable, injuries, weeklyWorkoutTarget } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (age !== undefined) updates.age = age;
  if (gender !== undefined) updates.gender = gender;
  if (heightCm !== undefined) updates.heightCm = heightCm;
  if (weightKg !== undefined) updates.weightKg = weightKg;
  if (fitnessLevel !== undefined) updates.fitnessLevel = fitnessLevel;
  if (goals !== undefined) updates.goals = goals;
  if (equipmentAvailable !== undefined) updates.equipmentAvailable = equipmentAvailable;
  if (injuries !== undefined) updates.injuries = injuries;
  if (weeklyWorkoutTarget !== undefined) updates.weeklyWorkoutTarget = weeklyWorkoutTarget;

  // Also mark onboarding complete if key fields present
  if (fitnessLevel && goals?.length > 0) {
    await db.update(usersTable).set({ onboardingCompleted: true }).where(eq(usersTable.id, user.id));
  }

  const [profile] = await db.update(userProfilesTable).set(updates).where(eq(userProfilesTable.userId, user.id)).returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(serializeProfile(profile));
});

function serializeProfile(p: typeof userProfilesTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    age: p.age,
    gender: p.gender,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    fitnessLevel: p.fitnessLevel,
    goals: p.goals,
    preferences: {},
    equipmentAvailable: p.equipmentAvailable,
    injuries: p.injuries,
    weeklyWorkoutTarget: p.weeklyWorkoutTarget,
  };
}

export default router;
