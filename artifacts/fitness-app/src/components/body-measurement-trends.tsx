import React, { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, AlertCircle, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrendDirection = "improving" | "stable" | "declining";

type TrendOk = {
  measurementType: string;
  label: string;
  unit: string;
  status: "ok";
  trend: TrendDirection;
  avgWeeklyChange: number;
  currentValue: number;
  lastUpdated: string;
  dataPoints: number;
};

type TrendInsufficient = {
  measurementType: string;
  label: string;
  unit: string;
  status: "insufficient_data";
  currentValue: number;
  lastUpdated: string;
  dataPoints: 1;
};

type TrendNoData = {
  measurementType: string;
  label: string;
  unit: string;
  status: "no_data";
};

type TrendItem = TrendOk | TrendInsufficient | TrendNoData;

// ─── Config ───────────────────────────────────────────────────────────────────

const METRIC_COLORS: Record<string, string> = {
  weight:  "#84cc16",
  bodyFat: "#f97316",
  waist:   "#06b6d4",
  chest:   "#a855f7",
  arms:    "#ec4899",
  hips:    "#f59e0b",
  thighs:  "#10b981",
};

const TREND_CONFIG: Record<TrendDirection, {
  Icon: React.ElementType;
  label: string;
  textColor: string;
  bgColor: string;
}> = {
  improving: {
    Icon: TrendingUp,
    label: "Improving",
    textColor: "text-emerald-400",
    bgColor:   "bg-emerald-500/10",
  },
  stable: {
    Icon: Minus,
    label: "Stable",
    textColor: "text-muted-foreground",
    bgColor:   "bg-secondary",
  },
  declining: {
    Icon: TrendingDown,
    label: "Declining",
    textColor: "text-red-400",
    bgColor:   "bg-red-500/10",
  },
};

// ─── API helper ───────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function fetchTrends(): Promise<TrendItem[]> {
  const token = (() => {
    try { return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token; } catch { return null; }
  })();
  const res = await fetch(`${BASE}/api/body-measurements/trends`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error("Failed to load trends");
  return res.json();
}

// ─── TrendCard ────────────────────────────────────────────────────────────────

interface TrendCardProps {
  item: TrendOk;
}

export function TrendCard({ item }: TrendCardProps) {
  const cfg = TREND_CONFIG[item.trend];
  const color = METRIC_COLORS[item.measurementType] ?? "#84cc16";
  const sign = item.avgWeeklyChange > 0 ? "+" : "";

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Colour accent bar */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm">{item.label}</h4>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
            {item.dataPoints} pts
          </span>
        </div>

        {/* Trend badge */}
        <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 w-fit", cfg.bgColor)}>
          <cfg.Icon className={cn("h-4 w-4", cfg.textColor)} />
          <span className={cn("font-bold text-sm", cfg.textColor)}>{cfg.label}</span>
        </div>

        {/* Weekly change */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Avg. weekly change
          </div>
          <div className="font-mono font-bold text-lg leading-none">
            {sign}{item.avgWeeklyChange.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
            <span className="text-sm font-normal text-muted-foreground">{item.unit}/wk</span>
          </div>
        </div>

        {/* Current value + date */}
        <div className="flex items-end justify-between text-xs text-muted-foreground pt-1 border-t border-border">
          <span>
            Current:{" "}
            <span className="font-semibold text-foreground">
              {item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}
            </span>
          </span>
          <span>{format(new Date(item.lastUpdated), "MMM d")}</span>
        </div>
      </div>
    </div>
  );
}

// ─── State cards ──────────────────────────────────────────────────────────────

function InsufficientCard({ item }: { item: TrendInsufficient }) {
  const color = METRIC_COLORS[item.measurementType] ?? "#84cc16";
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="p-5 flex flex-col items-center text-center gap-2 min-h-[160px] justify-center">
        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">{item.label}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          One measurement logged
          {item.currentValue != null
            ? ` (${item.currentValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${item.unit})`
            : ""}
          . Add more to see trends.
        </p>
      </div>
    </div>
  );
}

function NoDataCard({ item }: { item: TrendNoData }) {
  const color = METRIC_COLORS[item.measurementType] ?? "#84cc16";
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden opacity-60">
      <div className="h-1 w-full" style={{ backgroundColor: color }} />
      <div className="p-5 flex flex-col items-center text-center gap-2 min-h-[160px] justify-center">
        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold">{item.label}</p>
        <p className="text-xs text-muted-foreground">No measurements logged yet.</p>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-1 bg-secondary animate-pulse" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8 rounded-full" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function BodyMeasurementTrends() {
  const [items, setItems]   = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetchTrends()
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Partition into meaningful categories for display
  const withData    = items.filter((i) => i.status === "ok") as TrendOk[];
  const partial     = items.filter((i) => i.status === "insufficient_data") as TrendInsufficient[];
  const noData      = items.filter((i) => i.status === "no_data") as TrendNoData[];

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-base">Measurement Trends</h3>
        <span className="ml-auto text-xs text-muted-foreground">Last 90 days</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Metric grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => <CardSkeleton key={i} />)
            : <>
                {withData.map((item) => <TrendCard key={item.measurementType} item={item} />)}
                {partial.map((item) => <InsufficientCard key={item.measurementType} item={item} />)}
                {noData.map((item) => <NoDataCard key={item.measurementType} item={item} />)}
              </>
          }
        </div>

        {/* Legend */}
        {!loading && withData.length > 0 && (
          <div className="flex flex-wrap gap-4 pt-1 border-t border-border text-xs text-muted-foreground">
            {(["improving", "stable", "declining"] as TrendDirection[]).map((dir) => {
              const cfg = TREND_CONFIG[dir];
              return (
                <span key={dir} className="flex items-center gap-1.5">
                  <cfg.Icon className={cn("h-3 w-3", cfg.textColor)} />
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.every((i) => i.status === "no_data") && (
          <div className="py-10 text-center space-y-2">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-semibold text-sm">No measurements yet</p>
            <p className="text-xs text-muted-foreground">
              Log your first body measurements to start tracking trends.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
