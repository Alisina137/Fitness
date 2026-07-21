import { describe, it, expect } from "vitest";
import type { GoalMilestone } from "@workspace/db";
import { serializeMilestone } from "../../src/lib/milestone-service.js";

function milestone(overrides: Partial<GoalMilestone> = {}): GoalMilestone {
  return {
    id: 5,
    goalId: 3,
    userId: 1,
    milestonePercentage: 50,
    milestoneValue: "82.50",
    title: "Halfway There",
    description: "You're on fire!",
    achieved: false,
    achievedAt: null,
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

describe("serializeMilestone", () => {
  it("coerces the numeric milestoneValue string to a number", () => {
    expect(serializeMilestone(milestone()).milestoneValue).toBe(82.5);
  });

  it("preserves a null milestoneValue", () => {
    expect(
      serializeMilestone(milestone({ milestoneValue: null })).milestoneValue,
    ).toBeNull();
  });

  it("returns the expected public shape", () => {
    const achievedAt = new Date("2024-02-01");
    const result = serializeMilestone(
      milestone({ achieved: true, achievedAt }),
    );
    expect(result).toEqual({
      id: 5,
      goalId: 3,
      userId: 1,
      milestonePercentage: 50,
      milestoneValue: 82.5,
      title: "Halfway There",
      description: "You're on fire!",
      achieved: true,
      achievedAt,
      createdAt: new Date("2024-01-01"),
    });
  });
});
