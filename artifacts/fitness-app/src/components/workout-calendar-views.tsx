import React from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { cn } from "@/lib/utils";

// ── Shared types ────────────────────────────────────────────────────────────

type WeeklySchedule = {
  days?: number[];
  frequency?: number;
  skippedDates?: string[]; // ISO "YYYY-MM-DD"
};

export type WorkoutLike = {
  id: number;
  name: string;
  category?: string | null;
  durationMinutes?: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weeklySchedule?: any;
};

export type CalendarWorkout = {
  workoutId: number;
  workoutName: string;
  category: string | null;
  durationMinutes: number | null;
};

// ── Utility ─────────────────────────────────────────────────────────────────

/**
 * Returns the list of workouts that are scheduled on `date`, respecting
 * day-of-week recurrence and skipped dates.
 */
export function getWorkoutsForDate(
  date: Date,
  workouts: WorkoutLike[],
): CalendarWorkout[] {
  const dayOfWeek = date.getDay();
  const dateStr = format(date, "yyyy-MM-dd");

  return workouts.flatMap((w) => {
    const ws = w.weeklySchedule as WeeklySchedule | null;
    const days: number[] = ws?.days ?? [];
    const skipped: string[] = ws?.skippedDates ?? [];
    if (days.includes(dayOfWeek) && !skipped.includes(dateStr)) {
      return [
        {
          workoutId: w.id,
          workoutName: w.name,
          category: w.category ?? null,
          durationMinutes: w.durationMinutes ?? null,
        },
      ];
    }
    return [];
  });
}

// ── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Month View ───────────────────────────────────────────────────────────────

export interface CalendarMonthViewProps {
  /** Any date inside the month to display. */
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workouts: WorkoutLike[];
}

/**
 * Full-month grid calendar. Clicking a day calls `onSelectDate`.
 * Days outside the current month are shown dimmed.
 */
export function CalendarMonthView({
  currentDate,
  selectedDate,
  onSelectDate,
  workouts,
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  // Build a flat array of every day cell in the grid
  const days: Date[] = [];
  let cursor = calStart;
  while (cursor <= calEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return (
    <div>
      {/* Weekday header row */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-2xl overflow-hidden">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, currentDate);
          const isSelected = isSameDay(day, selectedDate);
          const today = isToday(day);
          const dayWorkouts = getWorkoutsForDate(day, workouts);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(day)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 min-h-[64px] transition-colors bg-card focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                !inMonth && "opacity-35",
                isSelected ? "bg-primary/10" : "hover:bg-secondary/60",
              )}
              aria-label={format(day, "MMMM d, yyyy")}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  today
                    ? "bg-primary text-black font-bold"
                    : isSelected
                      ? "text-primary font-bold"
                      : "text-foreground",
                )}
              >
                {format(day, "d")}
              </span>

              {/* Workout indicators */}
              {dayWorkouts.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {dayWorkouts.slice(0, 3).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-1.5 w-1.5 rounded-full bg-primary"
                    />
                  ))}
                  {dayWorkouts.length > 3 && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────────────────────

export interface CalendarWeekViewProps {
  /** Any date inside the week to display (week starts on Sunday). */
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workouts: WorkoutLike[];
}

/**
 * 7-column week view. Each column shows the day, date, and workout chips.
 * Clicking a day calls `onSelectDate`.
 */
export function CalendarWeekView({
  currentDate,
  selectedDate,
  onSelectDate,
  workouts,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDays.map((day, i) => {
        const isSelected = isSameDay(day, selectedDate);
        const today = isToday(day);
        const dayWorkouts = getWorkoutsForDate(day, workouts);

        return (
          <button
            key={i}
            onClick={() => onSelectDate(day)}
            className={cn(
              "flex flex-col items-center gap-2 p-2 rounded-xl border transition-all min-h-[110px] focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              isSelected
                ? "bg-primary/10 border-primary/30"
                : "border-border hover:bg-secondary/50 bg-card",
            )}
            aria-label={format(day, "EEEE, MMMM d")}
            aria-pressed={isSelected}
          >
            <span
              className={cn(
                "text-xs font-medium",
                isSelected ? "text-primary" : "text-muted-foreground",
              )}
            >
              {DAY_LABELS[i]}
            </span>
            <span
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                today
                  ? "bg-primary text-black"
                  : isSelected
                    ? "text-primary"
                    : "text-foreground",
              )}
            >
              {format(day, "d")}
            </span>

            {/* Workout chips */}
            <div className="flex flex-col gap-1 w-full">
              {dayWorkouts.slice(0, 2).map((w, idx) => (
                <div
                  key={idx}
                  className="w-full px-1 py-0.5 bg-primary/15 rounded text-[10px] text-primary font-medium truncate text-center leading-tight"
                >
                  {w.workoutName}
                </div>
              ))}
              {dayWorkouts.length > 2 && (
                <span className="text-[10px] text-muted-foreground text-center">
                  +{dayWorkouts.length - 2} more
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
