import { Router } from "express";
import { db, usersTable, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

/** Compute a 0-100 fitness readiness score from profile fields */
function computeReadinessScore(profile: typeof userProfilesTable.$inferSelect): number {
  let score = 0;

  // Experience level (0-20)
  const levelMap: Record<string, number> = { beginner: 5, intermediate: 12, advanced: 17, athlete: 20 };
  score += levelMap[profile.fitnessLevel] ?? 5;

  // Activity level (0-20)
  const actMap: Record<string, number> = {
    sedentary: 2, lightly_active: 7, moderately_active: 13, very_active: 17, extremely_active: 20,
  };
  score += actMap[profile.activityLevel ?? "sedentary"] ?? 0;

  // Weekly workout days (0-20)
  const days = profile.weeklyWorkoutTarget ?? 0;
  score += Math.min(days * 3, 20);

  // Goal clarity (0-20) — primary goal set = 12, secondary goals add up to 8
  if (profile.primaryGoal) score += 12;
  score += Math.min((profile.secondaryGoals?.length ?? 0) * 4, 8);

  // Lifestyle (0-20) — sleep, motivation
  const sleepMap: Record<string, number> = { lt5: 2, h5_7: 7, h7_9: 10, gt9: 6 };
  score += sleepMap[profile.sleepHours ?? ""] ?? 0;
  if (profile.motivation) score += 10;

  return Math.min(Math.round(score), 100);
}

function serializeProfile(p: typeof userProfilesTable.$inferSelect) {
  return {
    id: p.id,
    userId: p.userId,
    age: p.age,
    gender: p.gender,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    primaryGoal: p.primaryGoal,
    secondaryGoals: p.secondaryGoals,
    fitnessLevel: p.fitnessLevel,
    activityLevel: p.activityLevel,
    workoutLocation: p.workoutLocation,
    equipmentAvailable: p.equipmentAvailable,
    weeklyWorkoutTarget: p.weeklyWorkoutTarget,
    workoutDurationMinutes: p.workoutDurationMinutes,
    injuries: p.injuries,
    injuryNotes: p.injuryNotes,
    dietPreference: p.dietPreference,
    foodRestrictions: p.foodRestrictions,
    motivation: p.motivation,
    sleepHours: p.sleepHours,
    goals: p.goals,
    fitnessReadinessScore: computeReadinessScore(p),
    preferences: {},
  };
}

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
  const {
    age, gender, heightCm, weightKg,
    primaryGoal, secondaryGoals, fitnessLevel, activityLevel,
    workoutLocation, equipmentAvailable, weeklyWorkoutTarget, workoutDurationMinutes,
    injuries, injuryNotes,
    dietPreference, foodRestrictions,
    motivation, sleepHours,
    goals,
  } = req.body;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (age !== undefined) updates.age = age;
  if (gender !== undefined) updates.gender = gender;
  if (heightCm !== undefined) updates.heightCm = heightCm;
  if (weightKg !== undefined) updates.weightKg = weightKg;
  if (primaryGoal !== undefined) updates.primaryGoal = primaryGoal;
  if (secondaryGoals !== undefined) updates.secondaryGoals = secondaryGoals;
  if (fitnessLevel !== undefined) updates.fitnessLevel = fitnessLevel;
  if (activityLevel !== undefined) updates.activityLevel = activityLevel;
  if (workoutLocation !== undefined) updates.workoutLocation = workoutLocation;
  if (equipmentAvailable !== undefined) updates.equipmentAvailable = equipmentAvailable;
  if (weeklyWorkoutTarget !== undefined) updates.weeklyWorkoutTarget = weeklyWorkoutTarget;
  if (workoutDurationMinutes !== undefined) updates.workoutDurationMinutes = workoutDurationMinutes;
  if (injuries !== undefined) updates.injuries = injuries;
  if (injuryNotes !== undefined) updates.injuryNotes = injuryNotes;
  if (dietPreference !== undefined) updates.dietPreference = dietPreference;
  if (foodRestrictions !== undefined) updates.foodRestrictions = foodRestrictions;
  if (motivation !== undefined) updates.motivation = motivation;
  if (sleepHours !== undefined) updates.sleepHours = sleepHours;
  if (goals !== undefined) updates.goals = goals;

  // Mark onboarding complete when key fields are present
  if (primaryGoal && fitnessLevel) {
    await db.update(usersTable).set({ onboardingCompleted: true, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  }

  const [profile] = await db.update(userProfilesTable).set(updates).where(eq(userProfilesTable.userId, user.id)).returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(serializeProfile(profile));
});

export default router;
