import { describe, it, expect } from "vitest";
import type { InsertDailyCheckIn } from "@workspace/db";
import {
  calculateRecoveryScore,
  classifyReadiness,
  calculateMuscleFatigue,
  calculateRecoveryPercentage,
} from "../../src/lib/recovery-engine.js";

function checkIn(
  overrides: Partial<InsertDailyCheckIn> = {},
): InsertDailyCheckIn {
  return {
    date: "2024-01-01",
    sleepQuality: "good",
    energyLevel: 7,
    stressLevel: 4,
    muscleSoreness: 3,
    motivationLevel: 8,
    ...overrides,
  };
}

describe("calculateRecoveryScore", () => {
  it("returns a perfect score for ideal check-in inputs", () => {
    const { score, breakdown } = calculateRecoveryScore(
      checkIn({
        sleepQuality: "excellent",
        energyLevel: 10,
        stressLevel: 1,
        muscleSoreness: 1,
        motivationLevel: 10,
      }),
    );
    expect(breakdown.sleep).toBe(100);
    expect(breakdown.energy).toBe(100);
    expect(breakdown.motivation).toBe(100);
    // soreness/stress inverted: (10-1)/10*100 = 90
    expect(breakdown.soreness).toBe(90);
    expect(breakdown.stress).toBe(90);
    // 100*.3 + 100*.25 + 90*.2 + 90*.15 + 100*.1 = 96.5 -> 97 (rounded)
    expect(score).toBe(97);
  });

  it("inverts soreness and stress (higher input = lower factor)", () => {
    const { breakdown } = calculateRecoveryScore(
      checkIn({ muscleSoreness: 10, stressLevel: 10 }),
    );
    expect(breakdown.soreness).toBe(0);
    expect(breakdown.stress).toBe(0);
  });

  it("falls back to 50 for an unknown sleep quality value", () => {
    const { breakdown } = calculateRecoveryScore(
      // deliberately pass an out-of-enum value to exercise the fallback
      checkIn({
        sleepQuality: "unknown" as InsertDailyCheckIn["sleepQuality"],
      }),
    );
    expect(breakdown.sleep).toBe(50);
  });

  it("applies the documented factor weights", () => {
    const { score } = calculateRecoveryScore(
      checkIn({
        sleepQuality: "average",
        energyLevel: 5,
        stressLevel: 5,
        muscleSoreness: 5,
        motivationLevel: 5,
      }),
    );
    // sleep 50, energy 50, soreness 50, stress 50, motivation 50 -> 50
    expect(score).toBe(50);
  });
});

describe("classifyReadiness", () => {
  it("classifies excellent recovery (>=85)", () => {
    const info = classifyReadiness(90);
    expect(info.category).toBe("excellent");
    expect(info.intensityModifier).toBe(1.0);
  });

  it("classifies good recovery (>=70)", () => {
    expect(classifyReadiness(75).category).toBe("good");
  });

  it("classifies moderate recovery (>=50)", () => {
    expect(classifyReadiness(60).category).toBe("moderate");
  });

  it("classifies poor recovery (<50)", () => {
    const info = classifyReadiness(30);
    expect(info.category).toBe("poor");
    expect(info.intensityModifier).toBe(0.65);
  });

  it("uses inclusive lower boundaries", () => {
    expect(classifyReadiness(85).category).toBe("excellent");
    expect(classifyReadiness(70).category).toBe("good");
    expect(classifyReadiness(50).category).toBe("moderate");
    expect(classifyReadiness(49).category).toBe("poor");
  });
});

describe("calculateMuscleFatigue", () => {
  it("maps high recovery to low fatigue", () => {
    expect(calculateMuscleFatigue(80)).toBe("low");
    expect(calculateMuscleFatigue(70)).toBe("low");
  });

  it("maps mid recovery to medium fatigue", () => {
    expect(calculateMuscleFatigue(60)).toBe("medium");
    expect(calculateMuscleFatigue(45)).toBe("medium");
  });

  it("maps low recovery to high fatigue", () => {
    expect(calculateMuscleFatigue(44)).toBe("high");
    expect(calculateMuscleFatigue(0)).toBe("high");
  });
});

describe("calculateRecoveryPercentage", () => {
  it("returns 100% after enough time with no soreness", () => {
    const lastTrained = new Date(Date.now() - 200 * 60 * 60 * 1000); // 200h ago
    const { pct } = calculateRecoveryPercentage("Chest", lastTrained, 3, 1);
    expect(pct).toBe(100);
  });

  it("applies soreness penalties", () => {
    const lastTrained = new Date(Date.now() - 72 * 60 * 60 * 1000); // exactly base recovery for Chest
    // With medium volume (count 3 -> ×1.0), 72/72 = 100%, then ×0.65 for high soreness
    const { pct } = calculateRecoveryPercentage("Chest", lastTrained, 3, 9);
    expect(pct).toBe(65);
  });

  it("uses a longer window for high-volume sessions", () => {
    const lastTrained = new Date(Date.now() - 72 * 60 * 60 * 1000);
    // count >=4 -> ×1.35 so totalHours = 97.2; 72/97.2 ≈ 74%
    const { pct } = calculateRecoveryPercentage("Chest", lastTrained, 5, 1);
    expect(pct).toBe(74);
  });

  it("returns an estimated recovery date in the future when not fully recovered", () => {
    const lastTrained = new Date(Date.now() - 10 * 60 * 60 * 1000);
    const { estimatedRecoveryDate } = calculateRecoveryPercentage(
      "Chest",
      lastTrained,
      3,
      1,
    );
    expect(estimatedRecoveryDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("defaults to a 48h base for unknown muscle groups", () => {
    const lastTrained = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const { pct } = calculateRecoveryPercentage("Forearms", lastTrained, 3, 1);
    expect(pct).toBe(100);
  });
});
