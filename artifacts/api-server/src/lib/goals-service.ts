/**
 * Goals Service
 *
 * Reusable logic for the Goal Management system.
 * Used by: goals routes, AI workout generator, AI coach, nutrition engine.
 */

import { db } from "@workspace/db";
import { goalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function serializeGoal(g: typeof goalsTable.$inferSelect) {
  return {
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    category: g.category,
    targetValue: g.targetValue !== null ? Number(g.targetValue) : null,
    currentValue: g.currentValue !== null ? Number(g.currentValue) : null,
    referenceValue: g.referenceValue !== null ? Number(g.referenceValue) : null,
    unit: g.unit,
    startDate: g.startDate,
    targetDate: g.targetDate,
    priority: g.priority,
    status: g.status,
    isPrimary: g.isPrimary,
    progressPercentage: Number(g.progressPercentage ?? 0),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

// ─── getPrimaryGoal ───────────────────────────────────────────────────────────
// Central function used by AI Workout Generator, AI Coach, Nutrition Engine.
// Returns the active goal marked as primary, or falls back to the highest-
// priority active goal if none is marked primary.

export async function getPrimaryGoal(userId: number) {
  const active = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "active")));

  if (active.length === 0) return null;

  const primary = active.find((g) => g.isPrimary);
  if (primary) return serializeGoal(primary);

  // Fallback: highest priority active goal
  const order = { high: 0, medium: 1, low: 2 };
  const sorted = [...active].sort((a, b) => order[a.priority] - order[b.priority]);
  return serializeGoal(sorted[0]);
}

// ─── getActiveGoals ───────────────────────────────────────────────────────────

export async function getActiveGoals(userId: number) {
  const rows = await db
    .select()
    .from(goalsTable)
    .where(and(eq(goalsTable.userId, userId), eq(goalsTable.status, "active")));
  return rows.map(serializeGoal);
}

// ─── ensureSinglePrimary ──────────────────────────────────────────────────────
// Clears the isPrimary flag on all other goals when one is set as primary.

export async function ensureSinglePrimary(userId: number, newPrimaryId: number) {
  await db
    .update(goalsTable)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isPrimary, true)));

  await db
    .update(goalsTable)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(and(eq(goalsTable.id, newPrimaryId), eq(goalsTable.userId, userId)));
}
