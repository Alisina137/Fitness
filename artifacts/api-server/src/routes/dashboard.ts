import { Router } from "express";
import { db } from "@workspace/db";
import { workoutCompletionsTable, workoutPlansTable, nutritionEntriesTable, userProfilesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth, getUser } from "../lib/auth";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const user = getUser(req);
  const now = new Date();

  // This week's workouts
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekCompletions = await db.select().from(workoutCompletionsTable).where(
    and(eq(workoutCompletionsTable.userId, user.id), gte(workoutCompletionsTable.completedAt, weekStart))
  );

  const totalMinutes = weekCompletions.reduce((s, c) => s + (c.durationMinutes || 0), 0);
  const caloriesBurned = weekCompletions.reduce((s, c) => s + (c.caloriesBurned || 0), 0);

  // Current streak
  const allCompletions = await db.select().from(workoutCompletionsTable).where(eq(workoutCompletionsTable.userId, user.id)).orderBy(workoutCompletionsTable.completedAt);
  let currentStreak = 0;
  if (allCompletions.length > 0) {
    const days = new Set(allCompletions.map(c => c.completedAt.toISOString().split("T")[0]));
    const sortedDays = [...days].sort().reverse();
    const today = now.toISOString().split("T")[0];
    let checkDate = today;
    for (const day of sortedDays) {
      if (day === checkDate) {
        currentStreak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().split("T")[0];
      } else break;
    }
  }

  // Today's nutrition
  const dayStart = new Date(now.toISOString().split("T")[0] + "T00:00:00.000Z");
  const dayEnd = new Date(now.toISOString().split("T")[0] + "T23:59:59.999Z");
  const todayEntries = await db.select().from(nutritionEntriesTable).where(
    and(eq(nutritionEntriesTable.userId, user.id), gte(nutritionEntriesTable.loggedAt, dayStart), lte(nutritionEntriesTable.loggedAt, dayEnd))
  );
  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, user.id)).limit(1);

  const nutritionToday = {
    totalCalories: todayEntries.reduce((s, e) => s + Number(e.calories), 0),
    totalProtein: todayEntries.reduce((s, e) => s + Number(e.protein || 0), 0),
    totalCarbs: todayEntries.reduce((s, e) => s + Number(e.carbs || 0), 0),
    totalFat: todayEntries.reduce((s, e) => s + Number(e.fat || 0), 0),
    calorieGoal: profile?.calorieGoal || 2000,
    entries: todayEntries.length,
  };

  // Next workout
  const [nextWorkout] = await db.select().from(workoutPlansTable).where(
    and(eq(workoutPlansTable.userId, user.id), eq(workoutPlansTable.isActive, true))
  ).orderBy(workoutPlansTable.createdAt).limit(1);

  res.json({
    workoutsThisWeek: weekCompletions.length,
    weeklyTarget: profile?.weeklyWorkoutTarget || 3,
    totalMinutes,
    caloriesBurned,
    currentStreak,
    nutritionToday,
    nextWorkout: nextWorkout ? {
      hasWorkout: true,
      workout: {
        id: nextWorkout.id,
        userId: nextWorkout.userId,
        name: nextWorkout.name,
        description: nextWorkout.description,
        durationMinutes: nextWorkout.durationMinutes,
        difficulty: nextWorkout.difficulty,
        category: nextWorkout.category,
        exercises: nextWorkout.exercises || [],
        isActive: nextWorkout.isActive,
        completionCount: nextWorkout.completionCount,
        createdAt: nextWorkout.createdAt,
      },
      scheduledFor: null,
    } : { hasWorkout: false },
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res) => {
  const user = getUser(req);
  const completions = await db.select().from(workoutCompletionsTable).where(eq(workoutCompletionsTable.userId, user.id)).orderBy(desc(workoutCompletionsTable.completedAt)).limit(10);

  const activities = completions.map((c, i) => ({
    id: c.id,
    type: "workout_completed",
    title: "Workout Completed",
    description: `Finished a ${c.durationMinutes || "?"}-minute session${c.caloriesBurned ? ` · ${c.caloriesBurned} kcal burned` : ""}`,
    occurredAt: c.completedAt,
  }));

  res.json(activities);
});

export default router;
