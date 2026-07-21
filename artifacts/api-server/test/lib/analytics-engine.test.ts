import { describe, it, expect } from "vitest";
import type { CompletedExerciseLog } from "@workspace/db";
import {
  calculateWorkoutVolume,
  calculateExerciseProgress,
  calculateTrainingFrequency,
  calculateConsistencyScore,
} from "../../src/lib/analytics-engine.js";

function set(reps: number, weight: number, n = 1) {
  return {
    setNumber: n,
    repsCompleted: reps,
    weightKg: weight,
    completedAt: "2024-01-01T00:00:00Z",
  };
}

describe("calculateWorkoutVolume", () => {
  it("returns 0 for an empty workout", () => {
    expect(calculateWorkoutVolume([])).toBe(0);
  });

  it("sums weight × reps across all sets and exercises", () => {
    const exercises: CompletedExerciseLog[] = [
      { exerciseId: 1, name: "Bench", sets: [set(10, 50), set(8, 60)] },
      { exerciseId: 2, name: "Squat", sets: [set(5, 100)] },
    ];
    // 10*50 + 8*60 + 5*100 = 500 + 480 + 500 = 1480
    expect(calculateWorkoutVolume(exercises)).toBe(1480);
  });

  it("skips exercises marked as skipped", () => {
    const exercises: CompletedExerciseLog[] = [
      { exerciseId: 1, name: "Bench", sets: [set(10, 50)], skipped: true },
      { exerciseId: 2, name: "Squat", sets: [set(5, 100)] },
    ];
    expect(calculateWorkoutVolume(exercises)).toBe(500);
  });

  it("treats missing weight/reps as zero", () => {
    const exercises: CompletedExerciseLog[] = [
      {
        exerciseId: 1,
        name: "Plank",
        sets: [{ setNumber: 1, completedAt: "2024-01-01T00:00:00Z" }],
      },
    ];
    expect(calculateWorkoutVolume(exercises)).toBe(0);
  });

  it("rounds to two decimal places", () => {
    const exercises: CompletedExerciseLog[] = [
      { exerciseId: 1, name: "Curl", sets: [set(3, 12.345)] },
    ];
    // 3 * 12.345 = 37.035 -> 37.04
    expect(calculateWorkoutVolume(exercises)).toBe(37.04);
  });
});

describe("calculateTrainingFrequency", () => {
  it("computes workouts per week over the window", () => {
    const dates = [new Date(), new Date(), new Date(), new Date()];
    // 4 workouts over 28 days = 4 weeks -> 1/week
    expect(calculateTrainingFrequency(dates, 28)).toBe(1);
  });

  it("rounds to one decimal", () => {
    const dates = Array.from({ length: 3 }, () => new Date());
    // 3 / (28/7=4) = 0.75 -> 0.8
    expect(calculateTrainingFrequency(dates, 28)).toBe(0.8);
  });

  it("defaults the window to 28 days", () => {
    const dates = Array.from({ length: 8 }, () => new Date());
    // 8 / 4 = 2
    expect(calculateTrainingFrequency(dates)).toBe(2);
  });
});

describe("calculateConsistencyScore", () => {
  it("returns 0 when there is no target", () => {
    expect(calculateConsistencyScore(5, 0, 28)).toBe(0);
  });

  it("caps the score at 100", () => {
    expect(calculateConsistencyScore(100, 3, 28)).toBe(100);
  });

  it("computes a proportional score below target", () => {
    // target = (3/7)*28 = 12; completed 6 -> 50
    expect(calculateConsistencyScore(6, 3, 28)).toBe(50);
  });
});

describe("calculateExerciseProgress", () => {
  it("returns neutral defaults for empty history", () => {
    const result = calculateExerciseProgress([]);
    expect(result).toMatchObject({
      firstDate: null,
      latestDate: null,
      sessions: 0,
      weightChangePct: null,
      volumeChangePct: null,
      strengthTrend: "stable",
      avgWeightKg: null,
      maxWeightEver: null,
    });
  });

  it("computes weight/volume change and session count", () => {
    const history = [
      {
        date: new Date("2024-01-01"),
        maxWeightKg: 100,
        totalVolume: 1000,
        totalReps: 10,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-08"),
        maxWeightKg: 110,
        totalVolume: 1200,
        totalReps: 10,
        totalSets: 3,
      },
    ];
    const result = calculateExerciseProgress(history);
    expect(result.sessions).toBe(2);
    expect(result.weightChangePct).toBe(10);
    expect(result.volumeChangePct).toBe(20);
    expect(result.maxWeightEver).toBe(110);
    expect(result.avgWeightKg).toBe(105);
  });

  it("classifies an improving strength trend", () => {
    const history = [
      {
        date: new Date("2024-01-01"),
        maxWeightKg: 80,
        totalVolume: 800,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-03"),
        maxWeightKg: 85,
        totalVolume: 850,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-05"),
        maxWeightKg: 90,
        totalVolume: 900,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-07"),
        maxWeightKg: 100,
        totalVolume: 1000,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-09"),
        maxWeightKg: 110,
        totalVolume: 1100,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-11"),
        maxWeightKg: 120,
        totalVolume: 1200,
        totalReps: 8,
        totalSets: 3,
      },
    ];
    expect(calculateExerciseProgress(history).strengthTrend).toBe("improving");
  });

  it("classifies a declining strength trend", () => {
    const history = [
      {
        date: new Date("2024-01-01"),
        maxWeightKg: 120,
        totalVolume: 1200,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-03"),
        maxWeightKg: 115,
        totalVolume: 1100,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-05"),
        maxWeightKg: 110,
        totalVolume: 1000,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-07"),
        maxWeightKg: 100,
        totalVolume: 950,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-09"),
        maxWeightKg: 95,
        totalVolume: 900,
        totalReps: 8,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-11"),
        maxWeightKg: 90,
        totalVolume: 850,
        totalReps: 8,
        totalSets: 3,
      },
    ];
    expect(calculateExerciseProgress(history).strengthTrend).toBe("declining");
  });

  it("leaves change percentages null when anchor values are missing", () => {
    const history = [
      {
        date: new Date("2024-01-01"),
        maxWeightKg: null,
        totalVolume: 0,
        totalReps: 10,
        totalSets: 3,
      },
      {
        date: new Date("2024-01-08"),
        maxWeightKg: 90,
        totalVolume: 500,
        totalReps: 10,
        totalSets: 3,
      },
    ];
    const result = calculateExerciseProgress(history);
    expect(result.weightChangePct).toBeNull();
    expect(result.volumeChangePct).toBeNull();
  });
});
