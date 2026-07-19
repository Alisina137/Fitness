import React, { useState } from "react";
import { ChevronLeft, ChevronRight, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetProgressMonthlyReport } from "@workspace/api-client-react";
import { MonthlyReportCard } from "@/components/monthly-report-card";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 bg-secondary rounded w-40" />
        <div className="h-4 bg-secondary rounded w-56" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-background border border-border rounded-2xl p-5 space-y-2">
            <div className="h-3 bg-secondary rounded w-20" />
            <div className="h-8 bg-secondary rounded w-12" />
            <div className="h-3 bg-secondary rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const MIN_YEAR = 2020;
const MAX_YEAR = CURRENT_YEAR;

export default function MonthlyReportPage() {
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear]   = useState(CURRENT_YEAR);

  const { data, isLoading, isError } = useGetProgressMonthlyReport(
    { month, year },
  );

  // Navigation helpers
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => clamp(y - 1, MIN_YEAR, MAX_YEAR)); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const isCurrentMonth = month === CURRENT_MONTH && year === CURRENT_YEAR;
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear(y => clamp(y + 1, MIN_YEAR, MAX_YEAR)); }
    else setMonth(m => m + 1);
  }

  const isAtCurrent = month === CURRENT_MONTH && year === CURRENT_YEAR;
  const isAtMin     = month === 1 && year === MIN_YEAR;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart2 className="h-7 w-7 text-primary" />
          Monthly Report
        </h1>
        <p className="text-muted-foreground mt-1">
          Review your progress month by month.
        </p>
      </div>

      {/* Month / Year Selector */}
      <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Select Period
        </h2>

        {/* Month picker */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            disabled={isAtMin}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <div className="text-2xl font-bold">{MONTH_NAMES[month - 1]}</div>
            <div className="text-muted-foreground text-sm">{year}</div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            disabled={isAtCurrent}
            className="rounded-xl"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick month grid */}
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            const isFuture = year === CURRENT_YEAR && m > CURRENT_MONTH;
            const isSelected = m === month;
            return (
              <button
                key={m}
                disabled={isFuture}
                onClick={() => !isFuture && setMonth(m)}
                className={`text-xs font-medium rounded-lg py-1.5 transition-colors ${
                  isSelected
                    ? "bg-primary text-black"
                    : isFuture
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground font-medium">Year:</span>
          {Array.from(
            { length: MAX_YEAR - MIN_YEAR + 1 },
            (_, i) => MIN_YEAR + i,
          ).map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${
                y === year
                  ? "bg-primary text-black"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Report */}
      {isLoading ? (
        <ReportSkeleton />
      ) : isError ? (
        <div className="bg-card border border-border rounded-3xl p-10 text-center text-muted-foreground">
          <p className="font-medium">Could not load report.</p>
          <p className="text-sm mt-1">Please try again.</p>
        </div>
      ) : data ? (
        <MonthlyReportCard data={data} />
      ) : null}
    </div>
  );
}
