import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays, startOfWeek } from "date-fns";
import { useGetProgressWeeklySummary } from "@workspace/api-client-react";
import { WeeklySummaryCard } from "@/components/weekly-summary-card";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the Monday (ISO week start) for a given date. */
function toWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function WeeklySkeleton() {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 bg-secondary rounded w-48" />
        <div className="h-4 bg-secondary rounded w-36" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-background border border-border rounded-2xl p-5 space-y-2">
            <div className="h-3 bg-secondary rounded w-20" />
            <div className="h-8 bg-secondary rounded w-14" />
            <div className="h-3 bg-secondary rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const THIS_WEEK_START = toWeekStart(new Date());
// Earliest week we allow navigating to
const MIN_WEEK_START  = toWeekStart(new Date("2020-01-06")); // first Monday >= 2020-01-01

export default function WeeklySummaryPage() {
  const [weekStart, setWeekStart] = useState<Date>(THIS_WEEK_START);

  const weekStartStr = toDateStr(weekStart);
  const weekEnd      = addDays(weekStart, 6); // inclusive last day for display
  const isCurrentWeek = weekStartStr === toDateStr(THIS_WEEK_START);
  const isMinWeek     = weekStartStr <= toDateStr(MIN_WEEK_START);

  const { data, isLoading, isError } = useGetProgressWeeklySummary({ weekStartDate: weekStartStr });

  function prevWeek() {
    setWeekStart((d) => {
      const prev = subDays(d, 7);
      return prev < MIN_WEEK_START ? MIN_WEEK_START : prev;
    });
  }

  function nextWeek() {
    if (!isCurrentWeek) {
      setWeekStart((d) => {
        const next = addDays(d, 7);
        return next > THIS_WEEK_START ? THIS_WEEK_START : next;
      });
    }
  }

  function goToCurrentWeek() {
    setWeekStart(THIS_WEEK_START);
  }

  // Week range label for the selector header
  const rangeLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          Weekly Summary
        </h1>
        <p className="text-muted-foreground mt-1">
          Your fitness activity, week by week.
        </p>
      </div>

      {/* Week navigator */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={prevWeek}
            disabled={isMinWeek}
            className="rounded-xl shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <div className="text-lg font-bold">{rangeLabel}</div>
            {isCurrentWeek ? (
              <span className="text-xs font-medium text-primary">Current Week</span>
            ) : (
              <button
                onClick={goToCurrentWeek}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
              >
                Jump to current week
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={nextWeek}
            disabled={isCurrentWeek}
            className="rounded-xl shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick-jump: last 6 weeks as pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {Array.from({ length: 6 }, (_, i) => {
            const ws = subDays(THIS_WEEK_START, i * 7);
            if (ws < MIN_WEEK_START) return null;
            const str = toDateStr(ws);
            const isSelected = str === weekStartStr;
            const label = i === 0 ? "This week" : `${format(ws, "MMM d")}`;
            return (
              <button
                key={str}
                onClick={() => setWeekStart(ws)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  isSelected
                    ? "bg-primary text-black"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Report */}
      {isLoading ? (
        <WeeklySkeleton />
      ) : isError ? (
        <div className="bg-card border border-border rounded-3xl p-10 text-center text-muted-foreground">
          <p className="font-medium">Could not load weekly summary.</p>
          <p className="text-sm mt-1">Please try again.</p>
        </div>
      ) : data ? (
        <WeeklySummaryCard data={data} />
      ) : null}
    </div>
  );
}
