import { describe, it, expect } from "vitest";
import type { Exercise, WorkoutCompletion } from "@workspace/db";
import {
  getSplitTemplates,
  getSplitName,
  normalizeEquip,
  filterByEquipment,
  filterByInjuries,
  filterByLevel,
  priorityScore,
  selectExercises,
  assignVolume,
  analyzeProgressiveOverload,
} from "../../src/lib/ai-workout-engine.js";

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 1,
    name: "Exercise",
    shortDescription: null,
    instructions: null,
    category: "Strength",
    difficulty: "intermediate",
    trainingType: "strength",
    caloriesPerMinute: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    muscleGroups: [],
    equipment: [],
    commonMistakes: null,
    safetyTips: null,
    contraindications: null,
    alternativeExercises: [],
    progressions: {},
    imageUrl: null,
    videoUrl: null,
    thumbnailUrl: null,
    gifUrl: null,
    goals: [],
    tags: [],
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function completion(
  overrides: Partial<WorkoutCompletion> = {},
): WorkoutCompletion {
  return {
    id: 1,
    workoutPlanId: 1,
    userId: 1,
    startTime: null,
    endTime: null,
    durationMinutes: 45,
    caloriesBurned: null,
    exercisesCompleted: [],
    difficultyRating: 3,
    rating: null,
    notes: null,
    completedAt: new Date(),
    ...overrides,
  };
}

describe("getSplitTemplates", () => {
  it("returns full-body templates for 1-2 days", () => {
    expect(getSplitTemplates(1, "general_fitness")).toHaveLength(1);
    expect(getSplitTemplates(2, "general_fitness")).toHaveLength(2);
  });

  it("returns push/pull/legs for a 3-day muscle_gain plan", () => {
    const titles = getSplitTemplates(3, "muscle_gain").map((t) => t.title);
    expect(titles).toEqual(["Push Day", "Pull Day", "Leg Day"]);
  });

  it("returns strength-focus templates for a 3-day strength plan", () => {
    const titles = getSplitTemplates(3, "strength").map((t) => t.title);
    expect(titles).toEqual(["Squat Focus", "Bench Focus", "Deadlift Focus"]);
  });

  it("returns an upper/lower split for 4 days", () => {
    expect(getSplitTemplates(4, "muscle_gain").map((t) => t.focusArea)).toEqual(
      ["Upper", "Lower", "Upper", "Lower"],
    );
  });

  it("caps the number of training days at 6", () => {
    expect(getSplitTemplates(10, "muscle_gain")).toHaveLength(6);
  });
});

describe("getSplitName", () => {
  it.each([
    [1, "general_fitness", "Full Body"],
    [3, "muscle_gain", "Push/Pull/Legs"],
    [3, "general_fitness", "Full Body (3x/week)"],
    [4, "muscle_gain", "Upper/Lower Split"],
    [5, "muscle_gain", "Push/Pull/Legs"],
  ])("maps %i days / %s goal to %s", (days, goal, expected) => {
    expect(getSplitName(days, goal)).toBe(expected);
  });
});

describe("normalizeEquip", () => {
  it("lowercases, trims, strips a trailing plural, and underscores separators", () => {
    expect(normalizeEquip("  Dumbbells ")).toBe("dumbbell");
    expect(normalizeEquip("Pull Up Bar")).toBe("pull_up_bar");
    expect(normalizeEquip("resistance-band")).toBe("resistance_band");
  });
});

describe("filterByEquipment", () => {
  const bodyweight = exercise({ id: 1, equipment: [] });
  const dumbbell = exercise({ id: 2, equipment: ["Dumbbells"] });
  const barbell = exercise({ id: 3, equipment: ["Barbell"] });

  it("returns only bodyweight exercises when no equipment is available", () => {
    const result = filterByEquipment([bodyweight, dumbbell, barbell], []);
    expect(result.map((e) => e.id)).toEqual([1]);
  });

  it("includes exercises whose equipment the user has (plus bodyweight)", () => {
    const result = filterByEquipment(
      [bodyweight, dumbbell, barbell],
      ["dumbbell"],
    );
    expect(result.map((e) => e.id).sort()).toEqual([1, 2]);
  });

  it("excludes exercises requiring equipment the user lacks", () => {
    const result = filterByEquipment([dumbbell, barbell], ["dumbbell"]);
    expect(result.map((e) => e.id)).toEqual([2]);
  });
});

describe("filterByInjuries", () => {
  const safe = exercise({ id: 1, contraindications: null });
  const kneeRisk = exercise({
    id: 2,
    contraindications: "Avoid with knee or patellar pain",
  });

  it("returns all exercises when there are no injuries", () => {
    expect(filterByInjuries([safe, kneeRisk], [], null)).toHaveLength(2);
  });

  it("filters out exercises contraindicated for a mapped injury keyword", () => {
    const result = filterByInjuries([safe, kneeRisk], ["knee"], null);
    expect(result.map((e) => e.id)).toEqual([1]);
  });

  it("also matches free-text injury notes (once at least one injury is present)", () => {
    const backRisk = exercise({
      id: 3,
      contraindications: "aggravates lower back",
    });
    // "knee" injury does not match the contraindication, but the free-text note does
    const result = filterByInjuries([safe, backRisk], ["knee"], "lower back");
    expect(result.map((e) => e.id)).toEqual([1]);
  });
});

describe("filterByLevel", () => {
  const beginner = exercise({ id: 1, difficulty: "beginner" });
  const intermediate = exercise({ id: 2, difficulty: "intermediate" });
  const advanced = exercise({ id: 3, difficulty: "advanced" });

  it("beginner level only includes beginner exercises", () => {
    expect(
      filterByLevel([beginner, intermediate, advanced], "beginner").map(
        (e) => e.id,
      ),
    ).toEqual([1]);
  });

  it("advanced level includes all difficulties up to advanced", () => {
    expect(
      filterByLevel([beginner, intermediate, advanced], "advanced").map(
        (e) => e.id,
      ),
    ).toEqual([1, 2, 3]);
  });

  it("falls back to intermediate for an unknown level", () => {
    expect(
      filterByLevel([beginner, intermediate, advanced], "nope").map(
        (e) => e.id,
      ),
    ).toEqual([1, 2]);
  });
});

describe("priorityScore", () => {
  it("rewards goal-tag, training-type, and muscle matches", () => {
    const strong = exercise({
      goals: ["build_muscle"],
      trainingType: "hypertrophy",
      primaryMuscles: ["Chest"],
    });
    const weak = exercise({
      goals: [],
      trainingType: "cardio",
      primaryMuscles: ["Calves"],
    });
    expect(priorityScore(strong, "muscle_gain", ["Chest"])).toBeGreaterThan(
      priorityScore(weak, "muscle_gain", ["Chest"]),
    );
  });

  it("adds a calorie bonus for fat_loss goals", () => {
    const withCalories = exercise({
      caloriesPerMinute: "10",
      trainingType: null,
      goals: [],
    });
    const withoutCalories = exercise({
      caloriesPerMinute: null,
      trainingType: null,
      goals: [],
    });
    expect(priorityScore(withCalories, "fat_loss", [])).toBeGreaterThan(
      priorityScore(withoutCalories, "fat_loss", []),
    );
  });
});

describe("selectExercises", () => {
  it("prioritises compound movements, then fills with isolation, respecting exclusions", () => {
    const pool = [
      exercise({
        id: 1,
        category: "Strength",
        primaryMuscles: ["Chest", "Triceps"],
      }), // compound
      exercise({ id: 2, category: "Hypertrophy", primaryMuscles: ["Biceps"] }), // isolation
      exercise({ id: 3, category: "Hypertrophy", primaryMuscles: ["Calves"] }), // isolation
      exercise({
        id: 4,
        category: "Strength",
        primaryMuscles: ["Back", "Biceps"],
      }), // compound
    ];
    const selected = selectExercises(
      pool,
      "muscle_gain",
      ["Chest"],
      1,
      1,
      new Set([4]),
    );
    expect(selected).toHaveLength(2);
    expect(selected.map((e) => e.id)).not.toContain(4);
  });
});

describe("assignVolume", () => {
  it("derives sets/reps/rest from goal and level configuration", () => {
    const ex = exercise({ caloriesPerMinute: "6" });
    const vol = assignVolume(ex, "strength", "advanced", 60, 5);
    // strength setsMin 4 + advanced setsMod +1 = 5
    expect(vol.sets).toBe(5);
    expect(vol.repsMin).toBe(3);
    expect(vol.repsMax).toBe(6);
    // strength restBase 180 * advanced restMod 0.8 = 144
    expect(vol.restSeconds).toBe(144);
    expect(vol.tempo).toBe("4-1-1-0");
    expect(vol.estimatedCaloriesPerSet).toBeGreaterThan(0);
  });

  it("enforces a minimum of 1 set", () => {
    const vol = assignVolume(exercise(), "endurance", "beginner", 45, 4);
    // endurance setsMin 2 + beginner setsMod -1 = 1
    expect(vol.sets).toBe(1);
  });
});

describe("analyzeProgressiveOverload", () => {
  it("returns a baseline for no completions", () => {
    const result = analyzeProgressiveOverload([]);
    expect(result.type).toBe("baseline");
    expect(result.intensityModifier).toBe(1.0);
  });

  it("recommends a deload after a long layoff (>14 days)", () => {
    const old = completion({
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    });
    const result = analyzeProgressiveOverload([old]);
    expect(result.type).toBe("missed_workouts");
    expect(result.intensityModifier).toBe(0.8);
  });

  it("stays at baseline with fewer than two rated sessions", () => {
    const result = analyzeProgressiveOverload([
      completion({ difficultyRating: null }),
    ]);
    expect(result.type).toBe("baseline");
  });

  it("increases intensity when recent sessions felt easy", () => {
    const easy = [
      completion({ id: 1, difficultyRating: 1 }),
      completion({ id: 2, difficultyRating: 2 }),
    ];
    const result = analyzeProgressiveOverload(easy);
    expect(result.type).toBe("progressive_overload");
    expect(result.intensityModifier).toBe(1.1);
  });

  it("deloads when recent sessions felt very hard", () => {
    const hard = [
      completion({ id: 1, difficultyRating: 5 }),
      completion({ id: 2, difficultyRating: 5 }),
    ];
    const result = analyzeProgressiveOverload(hard);
    expect(result.type).toBe("deload");
    expect(result.intensityModifier).toBe(0.9);
  });
});
