import { describe, it, expect } from "vitest";
import type { Goal } from "@workspace/db";
import {
  calculateGoalPercentage,
  calculateRemaining,
} from "../../src/lib/goal-progress-service.js";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 1,
    userId: 1,
    title: "Test goal",
    description: null,
    category: "custom",
    targetValue: null,
    currentValue: null,
    unit: null,
    startDate: new Date("2024-01-01"),
    targetDate: null,
    priority: "medium",
    status: "active",
    isPrimary: false,
    progressPercentage: "0",
    referenceValue: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("calculateGoalPercentage", () => {
  it("returns 0 when there is no target", () => {
    expect(
      calculateGoalPercentage(goal({ targetValue: null, currentValue: "10" })),
    ).toBe(0);
  });

  it("returns 0 when there is no current value", () => {
    expect(
      calculateGoalPercentage(goal({ targetValue: "100", currentValue: null })),
    ).toBe(0);
  });

  it("computes a straightforward current/target percentage", () => {
    expect(
      calculateGoalPercentage(
        goal({ category: "strength", targetValue: "100", currentValue: "40" }),
      ),
    ).toBe(40);
  });

  it("prefers liveCurrentValue over the stored currentValue", () => {
    expect(
      calculateGoalPercentage({
        ...goal({
          category: "strength",
          targetValue: "100",
          currentValue: "40",
        }),
        liveCurrentValue: 75,
      }),
    ).toBe(75);
  });

  it("handles weight_loss as a decreasing goal anchored on referenceValue", () => {
    // start 100, target 80, current 90 -> moved 10 of 20 range -> 50%
    expect(
      calculateGoalPercentage(
        goal({
          category: "weight_loss",
          referenceValue: "100",
          targetValue: "80",
          currentValue: "90",
        }),
      ),
    ).toBe(50);
  });

  it("caps weight_loss progress at 100 when target is reached", () => {
    expect(
      calculateGoalPercentage(
        goal({
          category: "weight_loss",
          referenceValue: "100",
          targetValue: "80",
          currentValue: "75",
        }),
      ),
    ).toBe(100);
  });

  it("handles weight_gain as an increasing goal", () => {
    // start 70, target 80, current 75 -> 50%
    expect(
      calculateGoalPercentage(
        goal({
          category: "weight_gain",
          referenceValue: "70",
          targetValue: "80",
          currentValue: "75",
        }),
      ),
    ).toBe(50);
  });

  it("clamps results into the 0..100 range", () => {
    expect(
      calculateGoalPercentage(
        goal({ category: "strength", targetValue: "100", currentValue: "250" }),
      ),
    ).toBe(100);
  });
});

describe("calculateRemaining", () => {
  it("returns null when target or current is missing", () => {
    expect(
      calculateRemaining(goal({ targetValue: null, currentValue: "5" })),
    ).toBeNull();
    expect(
      calculateRemaining(goal({ targetValue: "5", currentValue: null })),
    ).toBeNull();
  });

  it("returns the amount still to lose for a weight_loss goal", () => {
    expect(
      calculateRemaining(
        goal({
          category: "weight_loss",
          targetValue: "80",
          currentValue: "90",
        }),
      ),
    ).toBe(10);
  });

  it("never returns a negative remaining (overshoot clamps to 0)", () => {
    expect(
      calculateRemaining(
        goal({
          category: "weight_loss",
          targetValue: "80",
          currentValue: "75",
        }),
      ),
    ).toBe(0);
  });

  it("returns the amount still to gain for other goal types", () => {
    expect(
      calculateRemaining(
        goal({ category: "strength", targetValue: "100", currentValue: "60" }),
      ),
    ).toBe(40);
  });
});
