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
import { Repeat, Bell } from "lucide-react";
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
  /** true = one-off scheduled entry (not recurring) */
  isScheduledEntry?: boolean;
  scheduledTime?: string | null;
};

/** A one-off scheduled workout entry from the workout-schedule API */
export type ScheduledEntry = {
  id: number;
  workoutId: number;
  workoutName: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime?: string | null;
  status: string;
  isRecurring?: boolean;
  recurrenceType?: string | null;
  recurrenceEndDate?: string | null;
  reminderEnabled?: boolean;
};

// ── Drag & Drop shared props ──────────────────────────────────────────────────

export interface DragDropProps {
  /** ID of the entry currently being dragged (undefined = nothing dragging) */
  draggingEntryId?: number | null;
  /** Date string "YYYY-MM-DD" of the cell currently hovered during drag */
  dragOverDate?: string | null;
  onEntryDragStart?: (entry: ScheduledEntry) => void;
  onEntryDragEnd?: () => void;
  onDayCellDragOver?: (date: Date, e: React.DragEvent) => void;
  onDayCellDrop?: (date: Date) => void;
  onDayCellDragLeave?: (date: Date) => void;
}

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

export interface CalendarMonthViewProps extends DragDropProps {
  /** Any date inside the month to display. */
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workouts: WorkoutLike[];
  scheduledEntries?: ScheduledEntry[];
}

/**
 * Full-month grid calendar. Clicking a day calls `onSelectDate`.
 * Days outside the current month are shown dimmed.
 * Scheduled entries are draggable to other day cells.
 */
export function CalendarMonthView({
  currentDate,
  selectedDate,
  onSelectDate,
  workouts,
  scheduledEntries = [],
  draggingEntryId,
  dragOverDate,
  onEntryDragStart,
  onEntryDragEnd,
  onDayCellDragOver,
  onDayCellDrop,
  onDayCellDragLeave,
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const isDragging = draggingEntryId != null;

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
          const dayStr = format(day, "yyyy-MM-dd");
          const recurringWorkouts = getWorkoutsForDate(day, workouts);
          const dayScheduledEntries = scheduledEntries.filter(
            (e) => e.scheduledDate === dayStr && e.status !== "cancelled",
          );
          const allDayWorkouts = [...recurringWorkouts, ...dayScheduledEntries];
          const isDragOver = isDragging && dragOverDate === dayStr;

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-1 min-h-[64px] transition-colors bg-card relative",
                !inMonth && "opacity-35",
                isSelected ? "bg-primary/10" : !isDragOver && "hover:bg-secondary/60",
                isDragging && "cursor-copy",
                isDragOver && "bg-primary/20 ring-1 ring-inset ring-primary",
              )}
              onDragOver={onDayCellDragOver ? (e) => onDayCellDragOver(day, e) : undefined}
              onDrop={onDayCellDrop ? () => onDayCellDrop(day) : undefined}
              onDragLeave={onDayCellDragLeave ? () => onDayCellDragLeave(day) : undefined}
            >
              {/* Clickable date number */}
              <button
                onClick={() => onSelectDate(day)}
                className="focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full"
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
              </button>

              {/* Workout indicators */}
              {allDayWorkouts.length > 0 && (
                <div className="flex gap-0.5 flex-wrap justify-center">
                  {/* Recurring dots (not draggable) */}
                  {recurringWorkouts.slice(0, Math.max(0, 3 - dayScheduledEntries.length)).map((_, idx) => (
                    <div
                      key={`rec-${idx}`}
                      className="h-1.5 w-1.5 rounded-full bg-primary/50"
                    />
                  ))}
                  {/* Scheduled entry dots (draggable) */}
                  {dayScheduledEntries.slice(0, 3).map((entry) => (
                    <div
                      key={`sched-${entry.id}`}
                      draggable={!!onEntryDragStart}
                      onDragStart={
                        onEntryDragStart
                          ? (e) => {
                              e.stopPropagation();
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", String(entry.id));
                              onEntryDragStart(entry);
                            }
                          : undefined
                      }
                      onDragEnd={onEntryDragEnd}
                      title={`${entry.isRecurring ? "Recurring · " : ""}Drag to reschedule: ${entry.workoutName}`}
                      className={cn(
                        "relative h-2 w-2 rounded-full bg-primary transition-all",
                        onEntryDragStart && "cursor-grab active:cursor-grabbing hover:scale-125",
                        draggingEntryId === entry.id && "opacity-40 scale-90",
                      )}
                    >
                      {entry.isRecurring && (
                        <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-primary/60 ring-1 ring-card" />
                      )}
                    </div>
                  ))}
                  {allDayWorkouts.length > 3 && (
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  )}
                </div>
              )}

              {/* Drop target overlay label */}
              {isDragOver && (
                <span className="absolute inset-x-0 bottom-0.5 text-[9px] text-primary font-semibold text-center leading-none">
                  Drop here
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ────────────────────────────────────────────────────────────────

export interface CalendarWeekViewProps extends DragDropProps {
  /** Any date inside the week to display (week starts on Sunday). */
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  workouts: WorkoutLike[];
  scheduledEntries?: ScheduledEntry[];
}

/**
 * 7-column week view. Each column shows the day, date, and workout chips.
 * Clicking a day calls `onSelectDate`.
 * Scheduled entries show as draggable chips.
 */
export function CalendarWeekView({
  currentDate,
  selectedDate,
  onSelectDate,
  workouts,
  scheduledEntries = [],
  draggingEntryId,
  dragOverDate,
  onEntryDragStart,
  onEntryDragEnd,
  onDayCellDragOver,
  onDayCellDrop,
  onDayCellDragLeave,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isDragging = draggingEntryId != null;

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {weekDays.map((day, i) => {
        const isSelected = isSameDay(day, selectedDate);
        const today = isToday(day);
        const dayStr = format(day, "yyyy-MM-dd");
        const recurringWorkouts = getWorkoutsForDate(day, workouts);
        const dayScheduledEntries = scheduledEntries.filter(
          (e) => e.scheduledDate === dayStr && e.status !== "cancelled",
        );
        const allDayWorkouts = [...recurringWorkouts, ...dayScheduledEntries];
        const isDragOver = isDragging && dragOverDate === dayStr;

        return (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center gap-2 p-2 rounded-xl border transition-all min-h-[110px]",
              isSelected
                ? "bg-primary/10 border-primary/30"
                : "border-border bg-card",
              isDragging && "cursor-copy",
              isDragOver
                ? "bg-primary/15 border-primary ring-1 ring-primary"
                : !isDragOver && !isSelected && "hover:bg-secondary/50",
            )}
            onDragOver={onDayCellDragOver ? (e) => onDayCellDragOver(day, e) : undefined}
            onDrop={onDayCellDrop ? () => onDayCellDrop(day) : undefined}
            onDragLeave={onDayCellDragLeave ? () => onDayCellDragLeave(day) : undefined}
          >
            {/* Clickable day header */}
            <button
              onClick={() => onSelectDate(day)}
              className="flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
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
            </button>

            {/* Workout chips */}
            <div className="flex flex-col gap-1 w-full">
              {/* Recurring chips (not draggable) */}
              {recurringWorkouts.slice(0, 2).map((w, idx) => (
                <div
                  key={`rec-${idx}`}
                  className="w-full px-1 py-0.5 bg-primary/10 rounded text-[10px] text-primary/70 font-medium truncate text-center leading-tight"
                >
                  {w.workoutName}
                </div>
              ))}

              {/* Scheduled entry chips (draggable) */}
              {dayScheduledEntries.slice(0, Math.max(0, 2 - recurringWorkouts.length)).map((entry) => (
                <div
                  key={`sched-${entry.id}`}
                  draggable={!!onEntryDragStart}
                  onDragStart={
                    onEntryDragStart
                      ? (e) => {
                          e.stopPropagation();
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(entry.id));
                          onEntryDragStart(entry);
                        }
                      : undefined
                  }
                  onDragEnd={onEntryDragEnd}
                  title={`${entry.isRecurring ? "Recurring · " : ""}Drag to reschedule: ${entry.workoutName}`}
                  className={cn(
                    "w-full px-1 py-0.5 bg-primary/15 rounded text-[10px] text-primary font-medium truncate text-center leading-tight transition-all flex items-center gap-0.5 justify-center",
                    onEntryDragStart && "cursor-grab active:cursor-grabbing hover:bg-primary/25",
                    draggingEntryId === entry.id && "opacity-40 scale-95",
                  )}
                >
                  {entry.isRecurring && <Repeat className="h-2 w-2 shrink-0" />}
                  <span className="truncate">{entry.workoutName}</span>
                </div>
              ))}

              {allDayWorkouts.length > 2 && (
                <span className="text-[10px] text-muted-foreground text-center">
                  +{allDayWorkouts.length - 2} more
                </span>
              )}
            </div>

            {/* Drop target hint */}
            {isDragOver && (
              <span className="text-[9px] text-primary font-semibold mt-auto">
                Drop here
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
