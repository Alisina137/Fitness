import React, { useState } from "react";
import { Link } from "wouter";
import { useListWorkouts } from "@workspace/api-client-react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Dumbbell, Plus, Clock, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  startOfWeek, addDays, addWeeks, subWeeks, format, isSameDay, isToday,
} from "date-fns";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ScheduledWorkout = {
  dayOfWeek: number;  // 0=Sun, 1=Mon ... 6=Sat
  workoutName: string;
  workoutId: number;
  category: string | null;
  durationMinutes: number | null;
};

export default function WorkoutSchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const { data: workouts, isLoading } = useListWorkouts({ status: "active" });

  // Build a schedule from workouts with weeklySchedule configured
  const schedule: ScheduledWorkout[] = [];
  (workouts ?? []).forEach(w => {
    const days: number[] = (w.weeklySchedule as { days?: number[] } | null)?.days ?? [];
    days.forEach(dayOfWeek => {
      schedule.push({
        dayOfWeek,
        workoutName: w.name,
        workoutId: w.id,
        category: w.category,
        durationMinutes: w.durationMinutes,
      });
    });
  });

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const workoutsOnDay = (dayIdx: number) =>
    schedule.filter(s => s.dayOfWeek === dayIdx);

  const selectedDayWorkouts = workoutsOnDay(selectedDay);
  const selectedDate = weekDays[selectedDay];

  // Count active workouts with no schedule
  const unscheduled = (workouts ?? []).filter(w => {
    const days = (w.weeklySchedule as { days?: number[] } | null)?.days ?? [];
    return days.length === 0;
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/workouts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground mt-1">Your weekly training calendar.</p>
        </div>
      </div>

      {/* Week navigator */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <span className="font-semibold">
              {weekOffset === 0 ? "This Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Last Week" : format(weekStart, "MMM d")}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date, idx) => {
            const dayWorkouts = workoutsOnDay(idx);
            const isSelected = selectedDay === idx;
            const today = isToday(date);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(idx)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                  isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50 border border-transparent",
                )}
              >
                <span className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}>
                  {DAY_LABELS[idx]}
                </span>
                <span className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                  today ? "bg-primary text-black" : isSelected ? "text-primary" : ""
                )}>
                  {format(date, "d")}
                </span>
                {/* Workout count indicators */}
                <div className="flex gap-0.5">
                  {dayWorkouts.slice(0, 3).map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/70" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">
            {format(selectedDate, "EEEE, MMMM d")}
            {isToday(selectedDate) && (
              <span className="ml-2 text-xs bg-primary text-black font-bold px-2 py-0.5 rounded-full">Today</span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
        ) : selectedDayWorkouts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 rounded-full bg-border flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Rest Day</p>
              <p className="text-sm text-muted-foreground mt-1">
                No workouts scheduled for this day.
              </p>
            </div>
            <Link href="/workouts">
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> Schedule a workout
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayWorkouts.map((sw, i) => (
              <Link key={i} href={`/workouts/${sw.workoutId}`}>
                <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Dumbbell className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{sw.workoutName}</p>
                    {sw.category && (
                      <p className="text-xs text-muted-foreground mt-0.5">{sw.category}</p>
                    )}
                  </div>
                  {sw.durationMinutes && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                      <Clock className="h-4 w-4" />
                      {sw.durationMinutes}min
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Weekly summary */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-bold mb-4">Week at a Glance</h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, idx) => {
            const dayWorkouts = workoutsOnDay(idx);
            return (
              <div key={idx} className="flex flex-col items-center gap-1 text-center">
                <span className="text-[10px] text-muted-foreground">{DAY_LABELS[idx]}</span>
                {dayWorkouts.length > 0 ? (
                  <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Dumbbell className="h-4 w-4 text-primary" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-border/30 border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/50">–</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Scheduled this week</span>
          <span className="font-bold">{schedule.filter(s => s.dayOfWeek >= 0).reduce((days, s) => {
            const key = `${s.dayOfWeek}`;
            if (!days.has(key)) days.set(key, true);
            return days;
          }, new Map()).size} training days</span>
        </div>
      </div>

      {/* Unscheduled workouts tip */}
      {unscheduled.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Dumbbell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Unscheduled workouts</p>
            <p className="text-xs text-muted-foreground mt-1">
              You have {unscheduled.length} workout{unscheduled.length > 1 ? "s" : ""} with no days assigned. Open a workout and set weekly schedule days to see them here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
