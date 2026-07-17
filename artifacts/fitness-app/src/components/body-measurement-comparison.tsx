import React, { useState, useCallback, useEffect } from "react";
import { ArrowRight, TrendingDown, TrendingUp, Minus, GitCompare, AlertCircle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementType =
  | "weight" | "bodyFat" | "waist" | "chest" | "arms" | "hips" | "thighs";

type PeriodKey = "7d" | "30d" | "90d" | "custom";

interface ComparisonResult {
  measurementType: string;
  startValue: number;
  endValue: number;
  difference: number;
  percentageChange: number;
  startDate: string;
  endDate: string;
  dataPoints: number;
}

type ComparisonState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "no_data"; message: string }
  | { status: "insufficient_data"; message: string; onlyValue: number | null; onlyDate: string }
  | { status: "invalid_range"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; data: ComparisonResult };

// ─── Config ───────────────────────────────────────────────────────────────────

const METRICS: { key: MeasurementType; label: string; unit: string; color: string }[] = [
  { key: "weight",  label: "Weight",   unit: "kg", color: "#84cc16" },
  { key: "bodyFat", label: "Body Fat", unit: "%",  color: "#f97316" },
  { key: "waist",   label: "Waist",    unit: "cm", color: "#06b6d4" },
  { key: "chest",   label: "Chest",    unit: "cm", color: "#a855f7" },
  { key: "arms",    label: "Arms",     unit: "cm", color: "#ec4899" },
  { key: "hips",    label: "Hips",     unit: "cm", color: "#f59e0b" },
  { key: "thighs",  label: "Thighs",   unit: "cm", color: "#10b981" },
];

const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "7d",     label: "7 Days",   days: 7   },
  { key: "30d",    label: "30 Days",  days: 30  },
  { key: "90d",    label: "90 Days",  days: 90  },
  { key: "custom", label: "Custom",   days: null },
];

// ─── API helper ───────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function apiFetch<T>(path: string): Promise<T> {
  const token = (() => {
    try { return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token; } catch { return null; }
  })();
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || body.error || "Request failed") as Error & {
      code: string; status: number; body: Record<string, unknown>;
    };
    err.code   = body.error  || "unknown";
    err.status = res.status;
    err.body   = body;
    throw err;
  }
  return body as T;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Convert a local date-input value ("2026-01-15") to start-of-day ISO */
function localDateToStartISO(val: string): string {
  const [y, m, d] = val.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0).toISOString();
}

/** Convert a local date-input value to end-of-day ISO */
function localDateToEndISO(val: string): string {
  const [y, m, d] = val.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).toISOString();
}

/** Today as YYYY-MM-DD for <input type="date"> max attribute */
function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── ComparisonCard ───────────────────────────────────────────────────────────

interface ComparisonCardProps {
  metric: typeof METRICS[number];
  data: ComparisonResult;
}

export function ComparisonCard({ metric, data }: ComparisonCardProps) {
  const improved  = data.difference < 0; // weight/fat going down is good; size metrics depend on goal
  const unchanged = data.difference === 0;
  const positive  = data.difference > 0;

  const DeltaIcon = unchanged ? Minus : positive ? TrendingUp : TrendingDown;

  const deltaColor = unchanged
    ? "text-muted-foreground"
    : positive
    ? "text-orange-400"
    : "text-emerald-400";

  const deltaBg = unchanged
    ? "bg-secondary"
    : positive
    ? "bg-orange-500/10"
    : "bg-emerald-500/10";

  const sign = data.difference > 0 ? "+" : "";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: metric.color }}
      />

      <div className="p-5 space-y-4">
        {/* Metric name + period */}
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm">{metric.label}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {data.dataPoints} pts
          </span>
        </div>

        {/* Arrow flow: start → end */}
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Start</div>
            <div className="font-mono font-bold text-xl leading-none">
              {data.startValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <div className="text-[10px] text-muted-foreground">{metric.unit}</div>
          </div>

          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 h-px bg-border" />
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Now</div>
            <div
              className="font-mono font-bold text-xl leading-none"
              style={{ color: metric.color }}
            >
              {data.endValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <div className="text-[10px] text-muted-foreground">{metric.unit}</div>
          </div>
        </div>

        {/* Delta chips */}
        <div className="flex gap-2">
          <div className={cn("flex-1 rounded-xl px-3 py-2 text-center", deltaBg)}>
            <div className={cn("font-mono font-bold text-sm", deltaColor)}>
              {sign}{data.difference.toLocaleString(undefined, { maximumFractionDigits: 1 })} {metric.unit}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Total change</div>
          </div>
          <div className={cn("flex-1 rounded-xl px-3 py-2 text-center flex flex-col items-center justify-center", deltaBg)}>
            <div className={cn("flex items-center gap-1 font-mono font-bold text-sm", deltaColor)}>
              <DeltaIcon className="h-3 w-3" />
              {sign}{data.percentageChange.toLocaleString(undefined, { maximumFractionDigits: 1 })}%
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Percentage</div>
          </div>
        </div>

        {/* Date range footer */}
        <div className="text-[10px] text-muted-foreground text-center font-medium">
          {format(new Date(data.startDate), "MMM d, yyyy")}
          {" — "}
          {format(new Date(data.endDate), "MMM d, yyyy")}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-1 bg-secondary animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center space-y-1">
            <Skeleton className="h-3 w-8 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-2 w-4 mx-auto" />
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className="text-center space-y-1">
            <Skeleton className="h-3 w-8 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-2 w-4 mx-auto" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-12 rounded-xl" />
          <Skeleton className="flex-1 h-12 rounded-xl" />
        </div>
        <Skeleton className="h-3 w-36 mx-auto" />
      </div>
    </div>
  );
}

// ─── Inline state card (no-data / insufficient / error) ───────────────────────

function StateCard({
  metric,
  icon: Icon,
  title,
  description,
  accent = false,
}: {
  metric: typeof METRICS[number];
  icon: React.ElementType;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: metric.color }} />
      <div className="p-5 flex flex-col items-center text-center gap-2 min-h-[160px] justify-center">
        <div
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center",
            accent ? "bg-destructive/10" : "bg-secondary"
          )}
        >
          <Icon className={cn("h-4 w-4", accent ? "text-destructive" : "text-muted-foreground")} />
        </div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BodyMeasurementComparison() {
  const [activePeriod, setActivePeriod]   = useState<PeriodKey>("30d");
  const [customStart,  setCustomStart]    = useState<string>("");
  const [customEnd,    setCustomEnd]      = useState<string>(todayInputValue());
  const [results, setResults]             = useState<Map<MeasurementType, ComparisonState>>(
    () => new Map(METRICS.map((m) => [m.key, { status: "idle" }]))
  );

  const fetchAll = useCallback(async (period: PeriodKey, cStart: string, cEnd: string) => {
    // Determine date range
    let startISO: string | null = null;
    let endISO: string          = todayISO();

    if (period === "custom") {
      if (!cStart) return; // wait for user to fill in start
      if (!cEnd)   return;
      if (cStart >= cEnd) {
        // Mark all as invalid range
        setResults(new Map(METRICS.map((m) => [
          m.key,
          { status: "invalid_range", message: "Start date must be before end date" },
        ])));
        return;
      }
      startISO = localDateToStartISO(cStart);
      endISO   = localDateToEndISO(cEnd);
    } else {
      const p = PERIODS.find((p) => p.key === period)!;
      startISO = daysAgoISO(p.days!);
    }

    // Set all to loading
    setResults(new Map(METRICS.map((m) => [m.key, { status: "loading" }])));

    // Fetch all metrics in parallel
    await Promise.all(
      METRICS.map(async (metric) => {
        const qs = new URLSearchParams({ measurementType: metric.key });
        if (startISO) qs.set("startDate", startISO);
        qs.set("endDate", endISO);

        try {
          const data = await apiFetch<ComparisonResult>(`/body-measurements/compare?${qs}`);
          setResults((prev) => new Map(prev).set(metric.key, { status: "success", data }));
        } catch (e: unknown) {
          const err = e as Error & { code?: string; status?: number; body?: Record<string, unknown> };
          if (err.status === 404) {
            setResults((prev) =>
              new Map(prev).set(metric.key, { status: "no_data", message: err.message })
            );
          } else if (err.status === 422) {
            setResults((prev) =>
              new Map(prev).set(metric.key, {
                status: "insufficient_data",
                message: err.message,
                onlyValue: (err.body?.onlyValue as number | null) ?? null,
                onlyDate:  (err.body?.onlyDate  as string)       ?? "",
              })
            );
          } else if (err.status === 400) {
            setResults((prev) =>
              new Map(prev).set(metric.key, { status: "invalid_range", message: err.message })
            );
          } else {
            setResults((prev) =>
              new Map(prev).set(metric.key, { status: "error", message: err.message })
            );
          }
        }
      })
    );
  }, []);

  // Fetch when period changes (auto-fetch for presets, manual submit for custom)
  useEffect(() => {
    if (activePeriod !== "custom") {
      fetchAll(activePeriod, "", "");
    }
  }, [activePeriod, fetchAll]);

  const handleCustomApply = () => {
    if (customStart && customEnd) fetchAll("custom", customStart, customEnd);
  };

  const periodLabel = (() => {
    if (activePeriod === "custom" && customStart && customEnd) {
      return `${format(new Date(customStart), "MMM d")} – ${format(new Date(customEnd), "MMM d, yyyy")}`;
    }
    return PERIODS.find((p) => p.key === activePeriod)?.label ?? "";
  })();

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-base">Measurement Comparison</h3>
        {periodLabel && (
          <span className="ml-auto text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Period selector + custom inputs */}
      <div className="px-5 pt-4 pb-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setActivePeriod(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                activePeriod === p.key
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {activePeriod === "custom" && (
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                From
              </label>
              <input
                type="date"
                value={customStart}
                max={customEnd || todayInputValue()}
                onChange={(e) => setCustomStart(e.target.value)}
                className="block rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                To
              </label>
              <input
                type="date"
                value={customEnd}
                max={todayInputValue()}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="block rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Compare
            </button>
          </div>
        )}
      </div>

      {/* Metric cards grid */}
      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {METRICS.map((metric) => {
          const state = results.get(metric.key) ?? { status: "idle" };

          if (state.status === "loading" || state.status === "idle") {
            return <CardSkeleton key={metric.key} />;
          }

          if (state.status === "success") {
            return <ComparisonCard key={metric.key} metric={metric} data={state.data} />;
          }

          if (state.status === "no_data") {
            return (
              <StateCard
                key={metric.key}
                metric={metric}
                icon={BarChart3}
                title="No data available"
                description={`No ${metric.label.toLowerCase()} measurements found for this period.`}
              />
            );
          }

          if (state.status === "insufficient_data") {
            const dateStr = state.onlyDate
              ? format(new Date(state.onlyDate), "MMM d, yyyy")
              : "";
            const valStr = state.onlyValue != null
              ? `${state.onlyValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${metric.unit}`
              : "";
            return (
              <StateCard
                key={metric.key}
                metric={metric}
                icon={BarChart3}
                title="Only one measurement"
                description={
                  valStr && dateStr
                    ? `${valStr} logged on ${dateStr}. Add another to compare.`
                    : "Add at least two measurements to compare."
                }
              />
            );
          }

          if (state.status === "invalid_range") {
            return (
              <StateCard
                key={metric.key}
                metric={metric}
                icon={AlertCircle}
                title="Invalid date range"
                description={state.message}
                accent
              />
            );
          }

          // error fallback
          return (
            <StateCard
              key={metric.key}
              metric={metric}
              icon={AlertCircle}
              title="Failed to load"
              description={(state as { status: "error"; message: string }).message}
              accent
            />
          );
        })}
      </div>
    </div>
  );
}
