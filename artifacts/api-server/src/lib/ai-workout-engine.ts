import { db } from "@workspace/db";
import {
  exercisesTable,
  userProfilesTable,
  workoutCompletionsTable,
  aiGeneratedWorkoutsTable,
  generationHistoryTable,
} from "@workspace/db";
import type {
  GeneratedPlan,
  GeneratedDay,
  GeneratedExercise,
  ScoreBreakdown,
} from "@workspace/db";
import { eq, desc, gte, and } from "drizzle-orm";
import { generateWorkoutReasoning } from "./ai-provider.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerationResult = {
  generationId: number;
  plan: GeneratedPlan;
  personalizationScore: number;
  scoreBreakdown: ScoreBreakdown;
};

type Exercise = typeof exercisesTable.$inferSelect;
type UserProfile = typeof userProfilesTable.$inferSelect;
type WorkoutCompletion = typeof workoutCompletionsTable.$inferSelect;

// ─── Configuration Maps ───────────────────────────────────────────────────────

type GoalConfig = {
  trainingTypes: string[];
  goalTags: string[];
  compoundRatio: number;
  repsMin: number;
  repsMax: number;
  setsMin: number;
  setsMax: number;
  restSecondsBase: number;
};

const GOAL_CONFIG: Record<string, GoalConfig> = {
  fat_loss: {
    trainingTypes: ["hiit", "cardio", "functional", "strength"],
    goalTags: ["lose_fat", "weight_loss", "fat_loss"],
    compoundRatio: 0.75,
    repsMin: 12, repsMax: 20,
    setsMin: 3, setsMax: 4,
    restSecondsBase: 45,
  },
  muscle_gain: {
    trainingTypes: ["hypertrophy", "strength", "functional"],
    goalTags: ["build_muscle", "hypertrophy", "muscle_gain"],
    compoundRatio: 0.6,
    repsMin: 8, repsMax: 12,
    setsMin: 3, setsMax: 5,
    restSecondsBase: 90,
  },
  strength: {
    trainingTypes: ["strength"],
    goalTags: ["build_strength", "strength", "powerlifting"],
    compoundRatio: 0.85,
    repsMin: 3, repsMax: 6,
    setsMin: 4, setsMax: 5,
    restSecondsBase: 180,
  },
  endurance: {
    trainingTypes: ["cardio", "hiit", "rehabilitation", "functional"],
    goalTags: ["endurance", "cardio", "conditioning"],
    compoundRatio: 0.5,
    repsMin: 15, repsMax: 25,
    setsMin: 2, setsMax: 4,
    restSecondsBase: 30,
  },
  general_fitness: {
    trainingTypes: ["functional", "strength", "mobility", "cardio"],
    goalTags: ["general_fitness", "health", "wellness"],
    compoundRatio: 0.65,
    repsMin: 10, repsMax: 15,
    setsMin: 3, setsMax: 4,
    restSecondsBase: 60,
  },
};

type LevelConfig = {
  difficulties: string[];
  setsMod: number;
  restMod: number;
  maxExercisesPerDay: number;
  tempo: string;
};

const LEVEL_CONFIG: Record<string, LevelConfig> = {
  beginner: {
    difficulties: ["beginner"],
    setsMod: -1,
    restMod: 1.5,
    maxExercisesPerDay: 5,
    tempo: "2-0-2-0",
  },
  intermediate: {
    difficulties: ["beginner", "intermediate"],
    setsMod: 0,
    restMod: 1.0,
    maxExercisesPerDay: 7,
    tempo: "3-0-1-0",
  },
  advanced: {
    difficulties: ["beginner", "intermediate", "advanced"],
    setsMod: 1,
    restMod: 0.8,
    maxExercisesPerDay: 9,
    tempo: "4-1-1-0",
  },
};

type DayTemplate = {
  title: string;
  focusArea: string;
  primaryMuscles: string[];
  compoundCount: number;
  isolationCount: number;
};

function getSplitTemplates(days: number, goal: string): DayTemplate[] {
  const fullBodyA: DayTemplate = { title: "Full Body A", focusArea: "Full Body", primaryMuscles: ["Chest", "Back", "Quadriceps", "Core"], compoundCount: 3, isolationCount: 2 };
  const fullBodyB: DayTemplate = { title: "Full Body B", focusArea: "Full Body", primaryMuscles: ["Shoulders", "Arms", "Hamstrings", "Core"], compoundCount: 3, isolationCount: 2 };
  const fullBodyC: DayTemplate = { title: "Full Body C", focusArea: "Full Body", primaryMuscles: ["Back", "Glutes", "Core", "Calves"], compoundCount: 3, isolationCount: 2 };
  const push: DayTemplate = { title: "Push Day", focusArea: "Push", primaryMuscles: ["Chest", "Shoulders", "Triceps"], compoundCount: 2, isolationCount: 3 };
  const pull: DayTemplate = { title: "Pull Day", focusArea: "Pull", primaryMuscles: ["Back", "Biceps", "Rear Delts"], compoundCount: 2, isolationCount: 3 };
  const legs: DayTemplate = { title: "Leg Day", focusArea: "Legs", primaryMuscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"], compoundCount: 3, isolationCount: 2 };
  const upperA: DayTemplate = { title: "Upper Body A", focusArea: "Upper", primaryMuscles: ["Chest", "Back", "Shoulders"], compoundCount: 3, isolationCount: 2 };
  const upperB: DayTemplate = { title: "Upper Body B", focusArea: "Upper", primaryMuscles: ["Chest", "Back", "Arms"], compoundCount: 2, isolationCount: 3 };
  const lowerA: DayTemplate = { title: "Lower Body A", focusArea: "Lower", primaryMuscles: ["Quadriceps", "Hamstrings", "Glutes"], compoundCount: 3, isolationCount: 2 };
  const lowerB: DayTemplate = { title: "Lower Body B", focusArea: "Lower", primaryMuscles: ["Glutes", "Hamstrings", "Calves", "Core"], compoundCount: 2, isolationCount: 3 };

  const capped = Math.min(days, 6);

  if (capped <= 2) return [fullBodyA, fullBodyB].slice(0, capped);
  if (capped === 3) {
    if (goal === "muscle_gain") return [push, pull, legs];
    if (goal === "strength") return [
      { title: "Squat Focus", focusArea: "Legs", primaryMuscles: ["Quadriceps", "Glutes", "Core"], compoundCount: 4, isolationCount: 1 },
      { title: "Bench Focus", focusArea: "Push", primaryMuscles: ["Chest", "Shoulders", "Triceps"], compoundCount: 4, isolationCount: 1 },
      { title: "Deadlift Focus", focusArea: "Pull", primaryMuscles: ["Back", "Hamstrings", "Glutes"], compoundCount: 4, isolationCount: 1 },
    ];
    return [fullBodyA, fullBodyB, fullBodyC];
  }
  if (capped === 4) return [upperA, lowerA, upperB, lowerB];
  if (capped === 5) return [push, pull, legs, upperA, { title: "Full Body Conditioning", focusArea: "Full Body", primaryMuscles: ["Core", "Legs", "Back"], compoundCount: 3, isolationCount: 2 }];
  return [push, pull, legs,
    { title: "Push B", focusArea: "Push", primaryMuscles: ["Chest", "Shoulders", "Triceps"], compoundCount: 2, isolationCount: 3 },
    { title: "Pull B", focusArea: "Pull", primaryMuscles: ["Back", "Rear Delts", "Biceps"], compoundCount: 2, isolationCount: 3 },
    { title: "Leg B", focusArea: "Legs", primaryMuscles: ["Glutes", "Hamstrings", "Calves"], compoundCount: 3, isolationCount: 2 },
  ];
}

function getSplitName(days: number, goal: string): string {
  if (days <= 2) return "Full Body";
  if (days === 3) return goal === "muscle_gain" || goal === "strength" ? "Push/Pull/Legs" : "Full Body (3x/week)";
  if (days === 4) return "Upper/Lower Split";
  return "Push/Pull/Legs";
}

// day-of-week slots spread evenly
const DAY_SLOTS: Record<number, number[]> = {
  1: [1], 2: [1, 4], 3: [1, 3, 5],
  4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ─── Equipment Filtering ──────────────────────────────────────────────────────

function normalizeEquip(name: string): string {
  return name.toLowerCase().trim().replace(/s$/, "").replace(/[\s_-]+/g, "_");
}

function filterByEquipment(exercises: Exercise[], userEquipment: string[]): Exercise[] {
  if (!userEquipment || userEquipment.length === 0) {
    // bodyweight only
    return exercises.filter((e) => e.equipment.length === 0 || e.equipment.some((eq) => normalizeEquip(eq).includes("bodyweight")));
  }

  const normalized = userEquipment.map(normalizeEquip);

  return exercises.filter((ex) => {
    if (ex.equipment.length === 0) return true; // bodyweight
    return ex.equipment.every((eq) => {
      const n = normalizeEquip(eq);
      // Check exact or partial match
      return normalized.some(
        (u) => u === n || u.includes(n) || n.includes(u) ||
          // common alias pairs
          (n === "dumbbell" && (u === "dumbbell" || u === "dumbbells")) ||
          (n === "barbell" && (u === "barbell" || u === "barbells")) ||
          (n === "pull_up_bar" && (u.includes("pull") || u.includes("bar"))) ||
          (n === "resistance_band" && u.includes("band")) ||
          (n === "cable" && u.includes("cable")) ||
          (n === "kettlebell" && u.includes("kettlebell")) ||
          (n === "machine" && u.includes("machine"))
      );
    });
  });
}

// ─── Injury Filtering ─────────────────────────────────────────────────────────

const INJURY_KEYWORDS: Record<string, string[]> = {
  knee: ["knee", "patellar", "meniscus"],
  lower_back: ["lower back", "lumbar", "spine", "disc"],
  back: ["back", "lumbar", "spine"],
  shoulder: ["shoulder", "rotator"],
  wrist: ["wrist", "carpal"],
  elbow: ["elbow", "tennis elbow"],
  hip: ["hip", "hip flexor", "groin"],
  neck: ["neck", "cervical"],
  ankle: ["ankle"],
};

function filterByInjuries(
  exercises: Exercise[],
  injuries: string[],
  injuryNotes: string | null,
): Exercise[] {
  if (!injuries || injuries.length === 0) return exercises;

  const searchTerms = new Set<string>();
  for (const injury of injuries) {
    const normalized = injury.toLowerCase().replace(/\s+/g, "_");
    const keywords = INJURY_KEYWORDS[normalized] ?? [injury.toLowerCase()];
    keywords.forEach((k) => searchTerms.add(k.toLowerCase()));
  }
  if (injuryNotes) {
    injuryNotes
      .toLowerCase()
      .split(/[,;.\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((t) => searchTerms.add(t));
  }

  return exercises.filter((ex) => {
    if (!ex.contraindications) return true;
    const contra = ex.contraindications.toLowerCase();
    return !Array.from(searchTerms).some((term) => contra.includes(term));
  });
}

// ─── Level Filtering ──────────────────────────────────────────────────────────

function filterByLevel(exercises: Exercise[], level: string): Exercise[] {
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermediate;
  return exercises.filter((e) => cfg.difficulties.includes(e.difficulty));
}

// ─── Exercise Selection ───────────────────────────────────────────────────────

function priorityScore(ex: Exercise, goal: string, targetMuscles: string[]): number {
  const goalCfg = GOAL_CONFIG[goal] ?? GOAL_CONFIG.general_fitness;
  let score = 0;

  // Goal tag match
  if (ex.goals.some((g) => goalCfg.goalTags.some((t) => g.toLowerCase().includes(t.toLowerCase())))) {
    score += 40;
  }
  // Training type match
  if (ex.trainingType && goalCfg.trainingTypes.includes(ex.trainingType)) {
    score += 30;
  }
  // Muscle group match
  const exMuscles = [...ex.primaryMuscles, ...ex.muscleGroups];
  const muscleMatches = targetMuscles.filter((m) =>
    exMuscles.some((em) => em.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(em.toLowerCase()))
  );
  score += muscleMatches.length * 15;

  // Calories (higher = better for fat loss, neutral otherwise)
  if (goal === "fat_loss" && ex.caloriesPerMinute) {
    score += Math.min(Number(ex.caloriesPerMinute) * 2, 20);
  }

  return score;
}

function selectExercises(
  pool: Exercise[],
  goal: string,
  targetMuscles: string[],
  compoundCount: number,
  isolationCount: number,
  exclude: Set<number>,
): Exercise[] {
  const available = pool.filter((e) => !exclude.has(e.id));

  // Score and sort
  const scored = available
    .map((e) => ({ e, score: priorityScore(e, goal, targetMuscles) }))
    .sort((a, b) => b.score - a.score);

  // Determine compound vs isolation by category
  // Compound-ish categories: Strength, Powerlifting, Functional
  // Isolation-ish: Hypertrophy-only single-joint movements
  const isCompound = (e: Exercise) =>
    ["Strength", "Powerlifting", "Functional"].includes(e.category) ||
    e.primaryMuscles.length >= 2 ||
    e.muscleGroups.length >= 2;

  const compounds = scored.filter((s) => isCompound(s.e));
  const isolations = scored.filter((s) => !isCompound(s.e));

  const selected: Exercise[] = [];
  // Take compounds first
  for (const s of compounds) {
    if (selected.length >= compoundCount) break;
    selected.push(s.e);
  }
  // Fill remaining with isolation
  for (const s of isolations) {
    if (selected.length >= compoundCount + isolationCount) break;
    selected.push(s.e);
  }
  // If we're short, fill from all remaining
  for (const s of scored) {
    if (selected.length >= compoundCount + isolationCount) break;
    if (!selected.find((se) => se.id === s.e.id)) selected.push(s.e);
  }

  return selected;
}

// ─── Volume Assignment ────────────────────────────────────────────────────────

function assignVolume(
  exercise: Exercise,
  goal: string,
  level: string,
  durationMinutes: number,
  totalExercisesInDay: number,
): Omit<GeneratedExercise, "reasoning" | "exerciseId" | "name" | "muscleGroups" | "equipment"> {
  const goalCfg = GOAL_CONFIG[goal] ?? GOAL_CONFIG.general_fitness;
  const levelCfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermediate;

  const sets = Math.max(1, goalCfg.setsMin + levelCfg.setsMod);
  const repsMin = goalCfg.repsMin;
  const repsMax = goalCfg.repsMax;
  const restSeconds = Math.round(goalCfg.restSecondsBase * levelCfg.restMod);
  const tempo = levelCfg.tempo;

  const caloriesPerMin = Number(exercise.caloriesPerMinute) || 4;
  const minutesPerSet = (repsMax * 3 + restSeconds) / 60; // rough estimate
  const estimatedCaloriesPerSet = Math.round(caloriesPerMin * minutesPerSet);

  return { sets, repsMin, repsMax, restSeconds, tempo, estimatedCaloriesPerSet };
}

// ─── Personalization Score ────────────────────────────────────────────────────

function calculateScore(
  profile: UserProfile,
  filteredPool: Exercise[],
  allExercises: Exercise[],
  recentCompletions: WorkoutCompletion[],
  goal: string,
): ScoreBreakdown {
  const tips: string[] = [];
  const goalCfg = GOAL_CONFIG[goal] ?? GOAL_CONFIG.general_fitness;

  // Goal match (0-30): % of filtered exercises that match goal tags
  const goalMatched = filteredPool.filter((e) =>
    e.goals.some((g) => goalCfg.goalTags.some((t) => g.toLowerCase().includes(t)))
  ).length;
  const goalMatch = Math.min(30, Math.round((goalMatched / Math.max(filteredPool.length, 1)) * 40));
  if (goalMatch < 20) tips.push(`More ${goal.replace("_", " ")}-focused exercises would improve goal alignment`);

  // Equipment match (0-25): coverage vs total library
  const equipRatio = filteredPool.length / Math.max(allExercises.length, 1);
  const equipmentMatch = Math.min(25, Math.round(equipRatio * 35));
  if (equipRatio < 0.5) tips.push("Adding more equipment would unlock significantly more exercise variety");
  else if (equipRatio < 0.7) tips.push("A few extra pieces of equipment (e.g., barbell or cables) would increase options");

  // Level match (0-20)
  const levelCfg = LEVEL_CONFIG[profile.fitnessLevel ?? "intermediate"];
  const levelMatched = filteredPool.filter((e) => levelCfg.difficulties.includes(e.difficulty)).length;
  const levelMatch = Math.min(20, Math.round((levelMatched / Math.max(filteredPool.length, 1)) * 25));

  // History score (0-15)
  let historyScore = 5;
  if (recentCompletions.length >= 10) historyScore = 15;
  else if (recentCompletions.length >= 5) historyScore = 12;
  else if (recentCompletions.length >= 2) historyScore = 9;
  else if (recentCompletions.length === 0) {
    tips.push("Complete workouts to help the AI learn your performance and personalize better");
  }

  // Profile completeness (0-10)
  const fields = [profile.age, profile.gender, profile.heightCm, profile.weightKg,
    profile.activityLevel, profile.workoutLocation, profile.weeklyWorkoutTarget,
    profile.workoutDurationMinutes, profile.fitnessLevel];
  const filled = fields.filter((f) => f != null).length;
  const profileComplete = Math.round((filled / fields.length) * 10);
  if (profileComplete < 7) tips.push("Completing your profile (height, weight, activity level) would improve accuracy");

  const total = Math.min(100, goalMatch + equipmentMatch + levelMatch + historyScore + profileComplete);
  return { goalMatch, equipmentMatch, levelMatch, historyScore, profileComplete, total, improvementTips: tips };
}

// ─── Progressive Overload Analysis ───────────────────────────────────────────

type OverloadAnalysis = {
  type: "progressive_overload" | "deload" | "missed_workouts" | "baseline";
  note: string;
  intensityModifier: number; // 0.8 = reduce 20%, 1.0 = same, 1.1 = increase 10%
};

function analyzeProgressiveOverload(completions: WorkoutCompletion[]): OverloadAnalysis {
  if (completions.length === 0) {
    return { type: "baseline", note: "Starting fresh — volume set to baseline for your fitness level.", intensityModifier: 1.0 };
  }

  // Check for missed workouts (gap > 14 days)
  const last = completions[0];
  const daysSinceLastWorkout = Math.floor(
    (Date.now() - new Date(last.completedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysSinceLastWorkout > 14) {
    return {
      type: "missed_workouts",
      note: `You've been away for ${daysSinceLastWorkout} days — starting with a deload week to rebuild momentum safely.`,
      intensityModifier: 0.8,
    };
  }

  // Analyze difficulty ratings from recent completions
  const rated = completions.filter((c) => c.difficultyRating != null);
  if (rated.length < 2) {
    return { type: "baseline", note: "Building your performance baseline — complete more sessions for adaptive recommendations.", intensityModifier: 1.0 };
  }

  const avgDifficulty = rated.reduce((s, c) => s + (c.difficultyRating ?? 3), 0) / rated.length;

  if (avgDifficulty <= 2) {
    return { type: "progressive_overload", note: "Your sessions have felt easy — volume and intensity have been increased for continued progress.", intensityModifier: 1.1 };
  }
  if (avgDifficulty >= 4.5) {
    return { type: "deload", note: "Workouts have been challenging — volume slightly reduced this week for optimal recovery.", intensityModifier: 0.9 };
  }

  return { type: "progressive_overload", note: "Progressing well — maintaining current intensity with slight volume increase.", intensityModifier: 1.0 };
}

// ─── Rule-Based Reasoning Fallback ───────────────────────────────────────────

function buildExerciseReason(ex: Exercise, goal: string, level: string): string {
  const muscles = ex.primaryMuscles.slice(0, 2).join(" and ") || ex.muscleGroups[0] || "target muscles";
  const goalPhrases: Record<string, string> = {
    fat_loss: "maximizes calorie burn",
    muscle_gain: "drives hypertrophy stimulus",
    strength: "builds maximal strength",
    endurance: "builds work capacity",
    general_fitness: "improves functional fitness",
  };
  const phrase = goalPhrases[goal] ?? "supports your training goal";
  return `Selected for ${muscles} — ${ex.category.toLowerCase()} movement that ${phrase} at ${level} level.`;
}

function buildDayReason(template: DayTemplate, goal: string): string {
  const muscles = template.primaryMuscles.slice(0, 3).join(", ");
  return `Focuses on ${muscles} with a ${template.compoundCount} compound / ${template.isolationCount} isolation structure for ${goal.replace("_", " ")} efficiency.`;
}

// ─── AI Reasoning Enrichment ──────────────────────────────────────────────────

function buildAIPrompt(
  plan: GeneratedPlan,
  profile: UserProfile,
  adaptation: OverloadAnalysis,
): string {
  const exerciseList = plan.days
    .flatMap((d) => d.exercises.map((e) => `${e.name} (${e.sets}x${e.repsMin}-${e.repsMax})`))
    .join(", ");

  return `You are a professional strength coach writing workout plan explanations.

User profile:
- Goal: ${profile.primaryGoal ?? "general_fitness"}
- Fitness level: ${profile.fitnessLevel}
- Days/week: ${profile.weeklyWorkoutTarget ?? 3}
- Session length: ${profile.workoutDurationMinutes ?? 45} min
- Equipment: ${profile.equipmentAvailable?.join(", ") || "bodyweight only"}
- Injuries: ${profile.injuries?.join(", ") || "none"}

Program: ${plan.split} split, ${plan.days.length} training days
Exercises: ${exerciseList}

Generate a JSON object with EXACTLY these keys:
{
  "programName": "short creative program name (3-5 words, no generic words like 'program' or 'plan')",
  "description": "2 sentences: why this program suits this exact user",
  "overallReasoning": "2 sentences: the training philosophy and split rationale",
  "exerciseReasons": { "ExerciseName": "one sentence why chosen" },
  "dayReasons": { "DayTitle": "one sentence for this day's purpose" },
  "progressionNote": "one sentence on how to progress over 4-8 weeks",
  "adaptationNote": "${adaptation.note}"
}

Be specific to the user's goal and profile. Use direct, coach-like language.`;
}

async function enrichWithAI(
  plan: GeneratedPlan,
  profile: UserProfile,
  adaptation: OverloadAnalysis,
): Promise<GeneratedPlan> {
  const prompt = buildAIPrompt(plan, profile, adaptation);
  const aiOutput = await generateWorkoutReasoning(prompt, 1500);

  if (!aiOutput) return plan; // use rule-based reasoning already set

  // Override AI-generated fields where provided
  plan.name = aiOutput.programName || plan.name;
  plan.description = aiOutput.description || plan.description;
  plan.overallReasoning = aiOutput.overallReasoning || plan.overallReasoning;
  plan.progressionRecommendation = aiOutput.progressionNote || plan.progressionRecommendation;
  plan.adaptationNotes = aiOutput.adaptationNote || plan.adaptationNotes;

  // Enrich exercise-level reasoning
  for (const day of plan.days) {
    if (aiOutput.dayReasons?.[day.title]) {
      day.reasoning = aiOutput.dayReasons[day.title];
    }
    for (const ex of day.exercises) {
      if (aiOutput.exerciseReasons?.[ex.name]) {
        ex.reasoning = aiOutput.exerciseReasons[ex.name];
      }
    }
  }

  return plan;
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

export async function generatePersonalizedWorkout(userId: number): Promise<GenerationResult> {
  // 1. Load user data
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  if (!profile) throw new Error("User profile not found. Please complete onboarding.");

  const goal = profile.primaryGoal ?? "general_fitness";
  const level = profile.fitnessLevel ?? "intermediate";
  const weeklyDays = Math.min(Math.max(profile.weeklyWorkoutTarget ?? 3, 1), 6);
  const sessionMinutes = profile.workoutDurationMinutes ?? 45;

  // 2. Load recent completions for overload analysis
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const recentCompletions = await db
    .select()
    .from(workoutCompletionsTable)
    .where(
      and(
        eq(workoutCompletionsTable.userId, userId),
        gte(workoutCompletionsTable.completedAt, fourWeeksAgo),
      ),
    )
    .orderBy(desc(workoutCompletionsTable.completedAt))
    .limit(20);

  // 3. Load all exercises
  const allExercises = await db.select().from(exercisesTable);

  // 4. Filter pipeline
  const byEquipment = filterByEquipment(allExercises, profile.equipmentAvailable ?? []);
  const byInjury = filterByInjuries(byEquipment, profile.injuries ?? [], profile.injuryNotes ?? null);
  const filteredPool = filterByLevel(byInjury, level);

  if (filteredPool.length < 3) {
    throw new Error(
      "Not enough safe exercises found with your current equipment and limitations. Consider adding more equipment or updating your injury notes.",
    );
  }

  // 5. Analyze progressive overload
  const adaptation = analyzeProgressiveOverload(recentCompletions);
  const levelCfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermediate;
  const goalCfg = GOAL_CONFIG[goal] ?? GOAL_CONFIG.general_fitness;

  // 6. Build workout structure
  const templates = getSplitTemplates(weeklyDays, goal);
  const splitName = getSplitName(weeklyDays, goal);
  const daySlots = DAY_SLOTS[Math.min(weeklyDays, 6)] ?? DAY_SLOTS[3];
  const usedExerciseIds = new Set<number>();

  const generatedDays: GeneratedDay[] = templates.map((template, idx) => {
    const daySlot = daySlots[idx] ?? idx + 1;
    const maxExercises = Math.min(
      levelCfg.maxExercisesPerDay,
      template.compoundCount + template.isolationCount,
    );

    const selected = selectExercises(
      filteredPool,
      goal,
      template.primaryMuscles,
      template.compoundCount,
      template.isolationCount,
      usedExerciseIds,
    ).slice(0, maxExercises);

    // Track used exercises to avoid duplication across days (except full body)
    if (!template.focusArea.includes("Full Body")) {
      selected.forEach((e) => usedExerciseIds.add(e.id));
    }

    // Estimate duration: (sets * reps * 3s + rest) per exercise + warmup
    const warmupMinutes = 5;
    const exerciseMinutes = selected.reduce((sum, ex) => {
      const vol = assignVolume(ex, goal, level, sessionMinutes, selected.length);
      return sum + (vol.sets * (vol.repsMax * 3 + vol.restSeconds)) / 60;
    }, 0);
    const estimatedDuration = Math.min(
      sessionMinutes,
      Math.round(warmupMinutes + exerciseMinutes),
    );

    const exercises: GeneratedExercise[] = selected.map((ex) => {
      const vol = assignVolume(ex, goal, level, sessionMinutes, selected.length);
      // Apply intensity modifier for progressive overload
      const sets = Math.max(1, Math.round(vol.sets * adaptation.intensityModifier));
      return {
        exerciseId: ex.id,
        name: ex.name,
        sets,
        repsMin: vol.repsMin,
        repsMax: vol.repsMax,
        restSeconds: vol.restSeconds,
        tempo: vol.tempo,
        estimatedCaloriesPerSet: vol.estimatedCaloriesPerSet,
        muscleGroups: ex.muscleGroups.length ? ex.muscleGroups : ex.primaryMuscles,
        equipment: ex.equipment,
        reasoning: buildExerciseReason(ex, goal, level),
      };
    });

    const estimatedCalories = exercises.reduce(
      (s, e) => s + e.estimatedCaloriesPerSet * e.sets,
      0,
    );

    return {
      dayOfWeek: daySlot,
      dayName: DAY_NAMES[daySlot] ?? "Day",
      title: template.title,
      focusArea: template.focusArea,
      estimatedDurationMinutes: estimatedDuration,
      estimatedCalories: Math.round(estimatedCalories),
      exercises,
      reasoning: buildDayReason(template, goal),
    };
  });

  // 7. Build rule-based plan
  const defaultName = `${level.charAt(0).toUpperCase() + level.slice(1)} ${goal.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Program`;
  const defaultDescription = `A ${weeklyDays}-day ${splitName} program designed for ${level} trainees focused on ${goal.replace("_", " ")}. Sessions are ${sessionMinutes} minutes each.`;

  let plan: GeneratedPlan = {
    name: defaultName,
    description: defaultDescription,
    goal,
    split: splitName,
    durationWeeks: 8,
    difficulty: level,
    days: generatedDays,
    overallReasoning: `This ${splitName} structure provides optimal stimulus and recovery for ${goal.replace("_", " ")} at ${level} level. The exercise selection prioritizes ${goalCfg.trainingTypes[0]} movements.`,
    adaptationNotes: adaptation.note,
    progressionRecommendation: `Add ${goal === "strength" ? "2.5–5kg" : "1–2 reps"} per exercise every ${goal === "endurance" ? "1" : "2"} weeks when all sets are completed with good form.`,
  };

  // 8. Enrich with AI reasoning (non-blocking; uses rule-based if AI fails)
  plan = await enrichWithAI(plan, profile, adaptation);

  // 9. Calculate personalization score
  const scoreBreakdown = calculateScore(profile, filteredPool, allExercises, recentCompletions, goal);

  // 10. Save to DB
  const [saved] = await db
    .insert(aiGeneratedWorkoutsTable)
    .values({
      userId,
      generatedPlan: plan,
      reasoning: plan.overallReasoning,
      personalizationScore: scoreBreakdown.total,
      scoreBreakdown,
      status: "draft",
    })
    .returning();

  // 11. Record in generation history
  await db.insert(generationHistoryTable).values({
    userId,
    goal,
    durationMinutes: sessionMinutes,
    generationDate: new Date(),
  });

  return {
    generationId: saved.id,
    plan,
    personalizationScore: scoreBreakdown.total,
    scoreBreakdown,
  };
}

// ─── Exercise Replacement ─────────────────────────────────────────────────────

export async function findExerciseReplacement(
  userId: number,
  exerciseId: number,
  goal: string,
): Promise<{ exercise: Exercise; reasoning: string } | null> {
  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1);

  const [original] = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.id, exerciseId))
    .limit(1);

  if (!original) return null;

  const allExercises = await db.select().from(exercisesTable);
  const filtered = filterByEquipment(
    filterByInjuries(allExercises, profile?.injuries ?? [], profile?.injuryNotes ?? null),
    profile?.equipmentAvailable ?? [],
  );

  const candidates = filtered.filter(
    (e) =>
      e.id !== original.id &&
      e.difficulty === original.difficulty &&
      e.primaryMuscles.some((m) =>
        original.primaryMuscles.some(
          (om) =>
            m.toLowerCase().includes(om.toLowerCase()) ||
            om.toLowerCase().includes(m.toLowerCase()),
        ),
      ),
  );

  if (candidates.length === 0) return null;

  // Sort by muscle match
  candidates.sort((a, b) => {
    const aMatch = a.primaryMuscles.filter((m) =>
      original.primaryMuscles.some((om) => m.toLowerCase().includes(om.toLowerCase())),
    ).length;
    const bMatch = b.primaryMuscles.filter((m) =>
      original.primaryMuscles.some((om) => m.toLowerCase().includes(om.toLowerCase())),
    ).length;
    return bMatch - aMatch;
  });

  const replacement = candidates[0];
  const reasoning = `Replaces ${original.name} — same ${original.primaryMuscles[0] ?? "muscle"} target, ${replacement.difficulty} difficulty, requires ${replacement.equipment.join(", ") || "no equipment"}.`;

  return { exercise: replacement, reasoning };
}
