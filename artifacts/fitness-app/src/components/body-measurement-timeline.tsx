import React, { useEffect, useState, useCallback } from "react";
import { BarChart3, CalendarDays, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineItem = {
  id: string;
  entryId: number;
  date: string;
  measurementType: string;
  label: string;
  value: number;
  unit: string;
};

type FilterKey = "all" | "weight" | "bodyFat" | "waist" | "chest" | "arms" | "hips" | "thighs";

// ─── Config ───────────────────────────────────────────────────────────────────

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "weight",  label: "Weight" },
  { key: "bodyFat", label: "Body Fat" },
  { key: "waist",   label: "Waist" },
  { key: "chest",   label: "Chest" },
  { key: "arms",    label: "Arms" },
  { key: "hips",    label: "Hips" },
  { key: "thighs",  label: "Thighs" },
];

const METRIC_COLORS: Record<string, string> = {
  weight:  "#84cc16",
  bodyFat: "#f97316",
  waist:   "#06b6d4",
  chest:   "#a855f7",
  arms:    "#ec4899",
  hips:    "#f59e0b",
  thighs:  "#10b981",
};

// ─── API helper ───────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function fetchTimeline(type: FilterKey): Promise<TimelineItem[]> {
  const token = (() => {
    try { return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token; } catch { return null; }
  })();
  const qs = type !== "all" ? `?type=${type}` : "";
  const res = await fetch(`${BASE}/api/body-measurements/timeline${qs}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Failed to load timeline");
  }
  return res.json();
}

// ─── Date label ───────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d))     return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="h-2.5 w-2.5 rounded-full bg-secondary shrink-0 animate-pulse" />
            {i < 4 && <div className="w-px flex-1 bg-border animate-pulse" style={{ minHeight: 48 }} />}
          </div>
          <div className="flex-1 pb-4 space-y-2">
            <Skeleton className="h-3 w-24" />
            <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineEntry({
  item,
  isLast,
}: {
  item: TimelineItem;
  isLast: boolean;
}) {
  const color = METRIC_COLORS[item.measurementType] ?? "#84cc16";

  return (
    <div className="flex gap-4">
      {/* Dot + connector */}
      <div className="flex flex-col items-center gap-0 pt-1 shrink-0">
        <div
          className="h-2.5 w-2.5 rounded-full ring-2 ring-background shrink-0 mt-0.5"
          style={{ backgroundColor: color }}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-border" style={{ minHeight: 40 }} />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-3", isLast && "pb-0")}>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-0.5 w-full" style={{ backgroundColor: color }} />
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {item.label}
              </div>
              <div className="font-mono font-bold text-lg leading-none">
                {item.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                <span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {format(new Date(item.date), "h:mm a")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BodyMeasurementTimeline() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [items, setItems]               = useState<TimelineItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const load = useCallback(async (filter: FilterKey) => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchTimeline(filter));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(activeFilter); }, [activeFilter, load]);

  // Group items by calendar date for date separators
  const grouped = items.reduce<{ dateLabel: string; entries: TimelineItem[] }[]>((acc, item) => {
    const label = formatDateLabel(item.date);
    const existing = acc.find((g) => g.dateLabel === label);
    if (existing) existing.entries.push(item);
    else acc.push({ dateLabel: label, entries: [item] });
    return acc;
  }, []);

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-base">Transformation Timeline</h3>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border shrink-0",
                activeFilter === f.key
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-secondary border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-4 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && <TimelineSkeleton />}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="py-10 text-center space-y-2">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-semibold text-sm">
              {activeFilter === "all" ? "No measurements logged yet" : `No ${FILTERS.find(f => f.key === activeFilter)?.label ?? activeFilter} entries`}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeFilter === "all"
                ? "Log your first body measurement to start your transformation timeline."
                : "Try a different filter or log your first measurement."}
            </p>
          </div>
        )}

        {/* Timeline grouped by date */}
        {!loading && !error && grouped.length > 0 && (
          <div className="space-y-4">
            {grouped.map((group, gi) => {
              const allEntries = grouped.flatMap((g) => g.entries);
              return (
                <div key={group.dateLabel}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {group.dateLabel}
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Entries for this date */}
                  <div className="space-y-0">
                    {group.entries.map((item, ei) => {
                      const globalIndex = allEntries.indexOf(item);
                      const isLast = globalIndex === allEntries.length - 1;
                      return (
                        <TimelineEntry key={item.id} item={item} isLast={isLast} />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
