import React, { useState } from "react";
import { Link } from "wouter";
import { useListWorkouts, useListWorkoutSchedule, getListWorkoutScheduleQueryKey } from "@workspace/api-client-react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Dumbbell,
  AlertCircle,
  Plus,
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
  type ScheduledEntry,
} from "@/components/workout-calendar-views";
import { ScheduleWorkoutDialog } from "@/components/schedule-workout-dialog";

type ViewMode = "month" | "week";

export default function WorkoutCalendarPage() {
  const today = new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // Recurring workouts (from weeklySchedule.days)
  const { data: workouts, isLoading: loadingWorkouts, isError: errorWorkouts } = useListWorkouts({ status: "active" });
  // One-off scheduled workouts
  const { data: scheduledData, isLoading: loadingScheduled, isError: errorScheduled } = useListWorkoutSchedule();

  const allWorkouts = workouts ?? [];
  const scheduledEntries: ScheduledEntry[] = (scheduledData ?? []).map((s) => ({
    id: s.id,
    workoutId: s.workoutId,
    workoutName: s.workoutName,
    scheduledDate: s.scheduledDate,
    scheduledTime: s.scheduledTime ?? null,
    status: s.status,
  }));

  const isLoading = loadingWorkouts || loadingScheduled;
  const isError = errorWorkouts || errorScheduled;

  // Workouts for the selected day: merge recurring + one-off
  const recurringForDay = getWorkoutsForDate(selectedDate, allWorkouts);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const scheduledForDay = scheduledEntries
    .filter((e) => e.scheduledDate === selectedDateStr && e.status !== "cancelled")
    .map((e) => ({
      workoutId: e.workoutId,
      workoutName: e.workoutName,
      category: null,
      durationMinutes: null,
      isScheduledEntry: true,
      scheduledTime: e.scheduledTime,
      entryId: e.id,
    }));

  const selectedDayWorkouts = [...recurringForDay, ...scheduledForDay];

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workout Calendar</h1>
          <p className="text-muted-foreground mt-1">
            View and schedule your workouts by month or week.
          </p>
        </div>
        <Button
          onClick={() => setScheduleDialogOpen(true)}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Schedule
        </Button>
      </div>

      {/* Calendar card */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
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

          <span className="font-semibold text-sm md:text-base flex-1 text-center md:text-left">
            {getHeaderLabel()}
          </span>

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

        {/* Calendar grid */}
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
            scheduledEntries={scheduledEntries}
          />
        ) : (
          <CalendarWeekView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            workouts={allWorkouts}
            scheduledEntries={scheduledEntries}
          />
        )}
      </div>

      {/* Selected day panel */}
      {!isLoading && !isError && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
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
            <button
              onClick={() => setScheduleDialogOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add workout
            </button>
          </div>

          {selectedDayWorkouts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 rounded-full bg-border flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No workouts scheduled.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This day is free — tap "Add workout" to schedule one.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setScheduleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Schedule a workout
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayWorkouts.map((w, i) => (
                <Link
                  key={`${"isScheduledEntry" in w && w.isScheduledEntry ? "sched" : "rec"}-${w.workoutId}-${i}`}
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
                    <div className="flex items-center gap-2 mt-0.5">
                      {w.category && (
                        <p className="text-xs text-muted-foreground capitalize">{w.category}</p>
                      )}
                      {"isScheduledEntry" in w && w.isScheduledEntry && (
                        <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {"scheduledTime" in w && w.scheduledTime && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {w.scheduledTime}
                      </div>
                    )}
                    {w.durationMinutes != null && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {w.durationMinutes} min
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Schedule dialog */}
      <ScheduleWorkoutDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
}
