import React, { useState } from "react";
import { Link } from "wouter";
import { useListWorkouts } from "@workspace/api-client-react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Dumbbell,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  isToday,
} from "date-fns";
import {
  CalendarMonthView,
  CalendarWeekView,
  getWorkoutsForDate,
} from "@/components/workout-calendar-views";

type ViewMode = "month" | "week";

export default function WorkoutCalendarPage() {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  const { data: workouts, isLoading, isError } = useListWorkouts({ status: "active" });
  const allWorkouts = workouts ?? [];

  const selectedDayWorkouts = getWorkoutsForDate(selectedDate, allWorkouts);

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goToPrev() {
    if (view === "month") setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => subWeeks(d, 1));
  }

  function goToNext() {
    if (view === "month") setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addWeeks(d, 1));
  }

  function goToToday() {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  }

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    // When selecting a date in month view that's outside the current displayed
    // month, shift the calendar to show that month.
    if (view === "month") {
      const sameMonth =
        date.getFullYear() === currentDate.getFullYear() &&
        date.getMonth() === currentDate.getMonth();
      if (!sameMonth) setCurrentDate(date);
    }
  }

  // ── Header label ────────────────────────────────────────────────────────────

  function getHeaderLabel() {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    const weekStart = startOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 6);
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`;
    }
    if (weekStart.getFullYear() === weekEnd.getFullYear()) {
      return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
    }
    return `${format(weekStart, "MMM d, yyyy")} – ${format(weekEnd, "MMM d, yyyy")}`;
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workout Calendar</h1>
        <p className="text-muted-foreground mt-1">
          View your scheduled workouts by month or week.
        </p>
      </div>

      {/* Calendar card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {/* Toolbar: nav + view toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: prev / today / next */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              aria-label="Previous"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors border border-border"
            >
              Today
            </button>
            <button
              onClick={goToNext}
              aria-label="Next"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Centre: period label */}
          <span className="font-semibold text-sm md:text-base flex-1 text-center md:text-left">
            {getHeaderLabel()}
          </span>

          {/* Right: month / week toggle */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setView("month")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                view === "month"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                view === "week"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Week
            </button>
          </div>
        </div>

        {/* Calendar grid — loading skeleton */}
        {isLoading ? (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-5 rounded" />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded" />
              ))}
            </div>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium text-sm">Failed to load calendar data.</p>
            <p className="text-xs text-muted-foreground">
              Check your connection and try refreshing the page.
            </p>
          </div>
        ) : view === "month" ? (
          <CalendarMonthView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            workouts={allWorkouts}
          />
        ) : (
          <CalendarWeekView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            workouts={allWorkouts}
          />
        )}
      </div>

      {/* Selected day panel */}
      {!isLoading && !isError && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">
              {format(selectedDate, "EEEE, MMMM d")}
            </h2>
            {isToday(selectedDate) && (
              <span className="text-xs bg-primary text-black font-bold px-2 py-0.5 rounded-full">
                Today
              </span>
            )}
          </div>

          {selectedDayWorkouts.length === 0 ? (
            /* Empty state */
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-border flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No workouts scheduled.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This day is free — enjoy the rest or head to Schedule to assign a workout.
                </p>
              </div>
              <Link href="/workouts/schedule">
                <Button variant="outline" size="sm">
                  Go to Schedule
                </Button>
              </Link>
            </div>
          ) : (
            /* Workout list */
            <div className="space-y-3">
              {selectedDayWorkouts.map((w) => (
                <Link
                  key={w.workoutId}
                  href={`/workouts/${w.workoutId}`}
                  className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors group"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate group-hover:text-primary transition-colors">
                      {w.workoutName}
                    </p>
                    {w.category && (
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                        {w.category}
                      </p>
                    )}
                  </div>
                  {w.durationMinutes != null && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                      <Clock className="h-4 w-4" />
                      {w.durationMinutes} min
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
