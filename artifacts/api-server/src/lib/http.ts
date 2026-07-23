// Small request/query helpers shared across route modules to avoid repeating
// the same numeric-clamping and calendar-day-range boilerplate in every
// endpoint.

/**
 * Parses a numeric query value and clamps it to `max`, falling back to
 * `fallback` when the value is missing or not a positive number. Mirrors the
 * `Math.min(Number(value) || fallback, max)` idiom used throughout the routes.
 */
export function clampInt(value: unknown, fallback: number, max: number): number {
  return Math.min(Number(value) || fallback, max);
}

/** Current calendar date as a `YYYY-MM-DD` string (UTC). */
export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Returns the UTC start/end `Date` boundaries for a `YYYY-MM-DD` calendar day,
 * suitable for `gte(start)` / `lte(end)` range filters.
 */
export function dayRangeUtc(date: string): { start: Date; end: Date } {
  return {
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
}
