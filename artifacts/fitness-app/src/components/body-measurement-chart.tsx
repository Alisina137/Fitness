import React, { useState, useCallback, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────

type ChartPoint = { date: string; value: number };
type ChartData = Partial<Record<MetricKey, ChartPoint[]>>;

// ─── Config ─────────────────────────────────────────────────────────────────

export type MetricKey = "weight" | "bodyFat" | "waist" | "chest" | "arms" | "hips" | "thighs";
export type RangeKey  = "30d" | "90d" | "1y" | "all";

const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: "weight",  label: "Weight",    unit: "kg",  color: "#84cc16" },
  { key: "bodyFat", label: "Body Fat",  unit: "%",   color: "#f97316" },
  { key: "waist",   label: "Waist",     unit: "cm",  color: "#06b6d4" },
  { key: "chest",   label: "Chest",     unit: "cm",  color: "#a855f7" },
  { key: "arms",    label: "Arms",      unit: "cm",  color: "#ec4899" },
  { key: "hips",    label: "Hips",      unit: "cm",  color: "#f59e0b" },
  { key: "thighs",  label: "Thighs",    unit: "cm",  color: "#10b981" },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "30d",  label: "30 Days" },
  { key: "90d",  label: "90 Days" },
  { key: "1y",   label: "1 Year"  },
  { key: "all",  label: "All Time"},
];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function MeasurementTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-muted-foreground mb-1">
        {label ? format(new Date(label), "MMM d, yyyy") : ""}
      </p>
      <p className="font-mono font-bold text-foreground text-sm">
        {payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
        <span className="text-muted-foreground font-normal text-xs">{unit}</span>
      </p>
    </div>
  );
}

// ─── X-axis tick formatter ───────────────────────────────────────────────────

function formatXTick(dateStr: string, range: RangeKey): string {
  try {
    const d = new Date(dateStr);
    if (range === "1y" || range === "all") return format(d, "MMM ''yy");
    return format(d, "MMM d");
  } catch {
    return dateStr;
  }
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 h-full justify-end pt-4 px-2">
      {/* Y-axis mock */}
      <div className="flex items-end gap-2 flex-1">
        <div className="flex flex-col justify-between h-full py-2 gap-1">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-3 w-8" />)}
        </div>
        {/* Bar area */}
        <div className="flex-1 flex items-end gap-1">
          {[60, 45, 70, 50, 80, 55, 65, 40, 75, 60].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/10 rounded-t-sm animate-pulse"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      {/* X-axis mock */}
      <div className="flex justify-between px-10">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-3 w-12" />)}
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ metric }: { metric: typeof METRICS[number] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
        <Activity className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-sm">No measurement data available.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Log your {metric.label.toLowerCase()} measurements to see trends here.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BodyMeasurementChart() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("weight");
  const [activeRange, setActiveRange]   = useState<RangeKey>("30d");
  const [chartData, setChartData]       = useState<ChartData>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const load = useCallback(async (range: RangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ChartData>(`/body-measurements/chart?range=${range}`);
      setChartData(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load chart data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeRange); }, [load, activeRange]);

  const metric      = METRICS.find((m) => m.key === activeMetric)!;
  const points      = chartData[activeMetric] ?? [];
  const hasData     = points.length > 0;

  // Compute min/max with 5% padding for the Y-axis
  const values      = points.map((p) => p.value);
  const minVal      = values.length ? Math.min(...values) : 0;
  const maxVal      = values.length ? Math.max(...values) : 100;
  const yPad        = (maxVal - minVal) * 0.1 || 1;
  const yDomain: [number, number] = [
    Math.max(0, Math.floor(minVal - yPad)),
    Math.ceil(maxVal + yPad),
  ];

  // Delta badge
  const delta =
    points.length >= 2
      ? points[points.length - 1].value - points[0].value
      : null;

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center justify-between gap-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Body Measurements
        </h3>
        {/* Delta badge */}
        {!loading && delta !== null && (
          <span
            className={cn(
              "text-xs font-mono font-bold px-2.5 py-1 rounded-full",
              delta < 0
                ? "bg-emerald-500/10 text-emerald-400"
                : delta > 0
                ? "bg-orange-500/10 text-orange-400"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} {metric.unit}
          </span>
        )}
      </div>

      {/* Metric selector */}
      <div className="px-4 pt-4 flex flex-wrap gap-1.5">
        {METRICS.map((m) => {
          const count = chartData[m.key]?.length ?? 0;
          return (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border relative",
                activeMetric === m.key
                  ? "border-transparent text-background"
                  : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
              )}
              style={
                activeMetric === m.key
                  ? { backgroundColor: m.color, borderColor: m.color }
                  : undefined
              }
            >
              {m.label}
              {!loading && count > 0 && activeMetric !== m.key && (
                <span className="ml-1 text-[9px] opacity-60 font-normal">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Range selector */}
      <div className="px-4 pt-2 pb-3 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setActiveRange(r.key)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-colors border",
              activeRange === r.key
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-transparent border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="px-2 pb-5" style={{ height: 300 }}>
        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => load(activeRange)}
              className="text-xs underline text-muted-foreground"
            >
              Try again
            </button>
          </div>
        ) : !hasData ? (
          <EmptyState metric={metric} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v) => formatXTick(v, activeRange)}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={yDomain}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v.toLocaleString(undefined, { maximumFractionDigits: 1 })
                }
                width={48}
              />
              <Tooltip
                content={
                  <MeasurementTooltip unit={metric.unit} />
                }
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 2" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={metric.color}
                strokeWidth={2.5}
                dot={points.length <= 30}
                activeDot={{ r: 5, fill: metric.color, strokeWidth: 0 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
