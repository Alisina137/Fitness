import React, { useState, useCallback } from "react";
import { Link } from "wouter";
import {
  useListWorkouts,
  useListWorkoutSchedule,
  useDeleteWorkoutSchedule,
  useUpdateWorkoutScheduleStatus,
  useRescheduleWorkoutSchedule,
  getListWorkoutScheduleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Dumbbell,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  EditScheduleDialog,
  type EditableScheduledEntry,
} from "@/components/edit-schedule-dialog";
import { RescheduleConfirmDialog } from "@/components/reschedule-confirm-dialog";
import { ReminderSettingsCard } from "@/components/reminder-settings-card";

type ViewMode = "month" | "week";

export default function WorkoutCalendarPage() {
  const today = new Date();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);

  // Dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<EditableScheduledEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<{ id: number; name: string } | null>(null);

  // Drag & drop state
  const [draggingEntry, setDraggingEntry] = useState<ScheduledEntry | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    entry: ScheduledEntry;
    newDate: string;
  } | null>(null);

  // Data
  const { data: workouts, isLoading: loadingWorkouts, isError: errorWorkouts } =
    useListWorkouts({ status: "active" });
  const { data: scheduledData, isLoading: loadingScheduled, isError: errorScheduled } =
    useListWorkoutSchedule();
  const deleteSchedule = useDeleteWorkoutSchedule();
  const updateStatus = useUpdateWorkoutScheduleStatus();
  const reschedule = useRescheduleWorkoutSchedule();

  const allWorkouts = workouts ?? [];
  const scheduledEntries: ScheduledEntry[] = (scheduledData ?? []).map((s) => ({
    id: s.id,
    workoutId: s.workoutId,
    workoutName: s.workoutName,
    scheduledDate: s.scheduledDate,
    scheduledTime: s.scheduledTime ?? null,
    status: s.status,
    isRecurring: s.isRecurring,
  }));

  const isLoading = loadingWorkouts || loadingScheduled;
  const isError = errorWorkouts || errorScheduled;

  // Merge recurring + one-off for the selected day
  const recurringForDay = getWorkoutsForDate(selectedDate, allWorkouts);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const scheduledForDay = scheduledEntries.filter(
    (e) => e.scheduledDate === selectedDateStr && e.status !== "cancelled",
  );

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

  function getHeaderLabel() {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    const weekStart = startOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 6);
    if (weekStart.getMonth() === weekEnd.getMonth())
      return `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`;
    if (weekStart.getFullYear() === weekEnd.getFullYear())
      return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
    return `${format(weekStart, "MMM d, yyyy")} – ${format(weekEnd, "MMM d, yyyy")}`;
  }

  // ── Status handler ───────────────────────────────────────────────────────────

  async function handleStatusUpdate(id: number, status: "scheduled" | "completed" | "missed") {
    await updateStatus.mutateAsync({ id, data: { status } });
    queryClient.invalidateQueries({ queryKey: getListWorkoutScheduleQueryKey() });
  }

  // ── Delete handler ───────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!deleteEntry) return;
    try {
      await deleteSchedule.mutateAsync({ id: deleteEntry.id });
      queryClient.invalidateQueries({ queryKey: getListWorkoutScheduleQueryKey() });
    } finally {
      setDeleteEntry(null);
    }
  }

  // ── Drag & Drop handlers ─────────────────────────────────────────────────────

  const handleEntryDragStart = useCallback((entry: ScheduledEntry) => {
    setDraggingEntry(entry);
    setDragOverDate(null);
  }, []);

  const handleEntryDragEnd = useCallback(() => {
    setDraggingEntry(null);
    setDragOverDate(null);
  }, []);

  const handleDayCellDragOver = useCallback(
    (date: Date, e: React.DragEvent) => {
      if (!draggingEntry) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const dateStr = format(date, "yyyy-MM-dd");
      // Don't highlight the origin date
      if (dateStr !== draggingEntry.scheduledDate) {
        setDragOverDate(dateStr);
      }
    },
    [draggingEntry],
  );

  const handleDayCellDrop = useCallback(
    (date: Date) => {
      if (!draggingEntry) return;
      const newDateStr = format(date, "yyyy-MM-dd");
      // Ignore drop on same date
      if (newDateStr === draggingEntry.scheduledDate) {
        setDraggingEntry(null);
        setDragOverDate(null);
        return;
      }
      // Show confirmation dialog
      setRescheduleTarget({ entry: draggingEntry, newDate: newDateStr });
      setDraggingEntry(null);
      setDragOverDate(null);
    },
    [draggingEntry],
  );

  const handleDayCellDragLeave = useCallback((date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    setDragOverDate((prev) => (prev === dateStr ? null : prev));
  }, []);

  const handleRescheduleConfirm = async () => {
    if (!rescheduleTarget) return;
    try {
      await reschedule.mutateAsync({
        id: rescheduleTarget.entry.id,
        data: { scheduledDate: rescheduleTarget.newDate },
      });
      queryClient.invalidateQueries({ queryKey: getListWorkoutScheduleQueryKey() });
    } finally {
      setRescheduleTarget(null);
    }
  };

  const handleRescheduleCancel = () => {
    setRescheduleTarget(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const totalForDay = recurringForDay.length + scheduledForDay.length;

  const dragDropProps = {
    draggingEntryId: draggingEntry?.id ?? null,
    dragOverDate,
    onEntryDragStart: handleEntryDragStart,
    onEntryDragEnd: handleEntryDragEnd,
    onDayCellDragOver: handleDayCellDragOver,
    onDayCellDrop: handleDayCellDrop,
    onDayCellDragLeave: handleDayCellDragLeave,
  };

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
        <Button onClick={() => setScheduleDialogOpen(true)} className="gap-2 shrink-0">
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

          {draggingEntry && (
            <span className="text-xs text-primary font-medium animate-pulse">
              Drop onto a day to reschedule
            </span>
          )}

          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {(["month", "week"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize",
                  view === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
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
              Check your connection and try refreshing.
            </p>
          </div>
        ) : view === "month" ? (
          <CalendarMonthView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            workouts={allWorkouts}
            scheduledEntries={scheduledEntries}
            {...dragDropProps}
          />
        ) : (
          <CalendarWeekView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            workouts={allWorkouts}
            scheduledEntries={scheduledEntries}
            {...dragDropProps}
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

          {totalForDay === 0 ? (
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
              {/* Recurring workouts (read-only, no edit/delete) */}
              {recurringForDay.map((w, i) => (
                <Link
                  key={`rec-${w.workoutId}-${i}`}
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
                    <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Clock className="h-4 w-4" />
                      {w.durationMinutes} min
                    </div>
                  )}
                </Link>
              ))}

              {/* One-off scheduled entries (with status / edit / delete) */}
              {scheduledForDay.map((entry) => {
                const isCompleted = entry.status === "completed";
                const isMissed = entry.status === "missed";
                const isPending = updateStatus.isPending;

                const statusBadge = isCompleted ? (
                  <span className="text-[10px] font-semibold bg-green-500/15 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                    Completed
                  </span>
                ) : isMissed ? (
                  <span className="text-[10px] font-semibold bg-destructive/15 text-destructive px-1.5 py-0.5 rounded-full">
                    Missed
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    Scheduled
                  </span>
                );

                return (
                  <div
                    key={`sched-${entry.id}`}
                    className={cn(
                      "flex items-center gap-4 bg-card border rounded-2xl p-5 transition-colors",
                      isCompleted
                        ? "border-green-500/30"
                        : isMissed
                          ? "border-destructive/30"
                          : "border-border hover:border-primary/20",
                    )}
                  >
                    <Link
                      href={`/workouts/${entry.workoutId}`}
                      className="flex items-center gap-4 flex-1 min-w-0 group"
                    >
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                          isCompleted
                            ? "bg-green-500/15"
                            : isMissed
                              ? "bg-destructive/10"
                              : "bg-primary/10",
                        )}
                      >
                        <Dumbbell
                          className={cn(
                            "h-6 w-6",
                            isCompleted
                              ? "text-green-500"
                              : isMissed
                                ? "text-destructive"
                                : "text-primary",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-bold truncate transition-colors",
                            isCompleted
                              ? "text-muted-foreground line-through"
                              : "group-hover:text-primary",
                          )}
                        >
                          {entry.workoutName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {statusBadge}
                          {entry.isRecurring && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              <Repeat className="h-2.5 w-2.5" />
                              Recurring
                            </span>
                          )}
                          {entry.scheduledTime && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {entry.scheduledTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    {/* Status + edit / delete actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Status toggles */}
                      {isCompleted || isMissed ? (
                        <button
                          onClick={() => handleStatusUpdate(entry.id, "scheduled")}
                          disabled={isPending}
                          title="Reset to Scheduled"
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(entry.id, "completed")}
                            disabled={isPending}
                            title="Mark as Completed"
                            className="p-2 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(entry.id, "missed")}
                            disabled={isPending}
                            title="Mark as Missed"
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() =>
                          setEditEntry({
                            id: entry.id,
                            workoutId: entry.workoutId,
                            workoutName: entry.workoutName,
                            scheduledDate: entry.scheduledDate,
                            scheduledTime: entry.scheduledTime,
                            notes: null,
                          })
                        }
                        title="Edit scheduled workout"
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() =>
                          setDeleteEntry({ id: entry.id, name: entry.workoutName })
                        }
                        title="Delete scheduled workout"
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {/* Edit dialog */}
      <EditScheduleDialog
        open={!!editEntry}
        onOpenChange={(open) => { if (!open) setEditEntry(null); }}
        entry={editEntry}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteEntry} onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Scheduled Workout</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{deleteEntry?.name}</span> from
            your calendar? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteEntry(null)}
              disabled={deleteSchedule.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSchedule.isPending}
            >
              {deleteSchedule.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule confirmation dialog */}
      <RescheduleConfirmDialog
        open={!!rescheduleTarget}
        workoutName={rescheduleTarget?.entry.workoutName ?? ""}
        newDate={rescheduleTarget?.newDate ?? ""}
        isPending={reschedule.isPending}
        onConfirm={handleRescheduleConfirm}
        onCancel={handleRescheduleCancel}
      />
    </div>
  );
}
