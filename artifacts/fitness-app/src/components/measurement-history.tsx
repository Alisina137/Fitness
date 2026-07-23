import React, { useState } from "react";
import { Trash2, Ruler, Weight, Percent, ChevronDown, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MeasurementEntry = {
  id: number;
  type: string;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  notes?: string | null;
  loggedAt: string | Date;
};

// ─── Filter config ────────────────────────────────────────────────────────────

type FieldKey = "all" | "weight" | "bodyFat" | "waist" | "chest" | "arms" | "hips" | "thighs";

const FIELD_CONFIG: Record<FieldKey, { label: string; unit: string; key: keyof MeasurementEntry | null }> = {
  all:      { label: "All",       unit: "",    key: null },
  weight:   { label: "Weight",    unit: "kg",  key: "weightKg" },
  bodyFat:  { label: "Body Fat",  unit: "%",   key: "bodyFatPercent" },
  waist:    { label: "Waist",     unit: "cm",  key: "waistCm" },
  chest:    { label: "Chest",     unit: "cm",  key: "chestCm" },
  arms:     { label: "Arms",      unit: "cm",  key: "armCm" },
  hips:     { label: "Hips",      unit: "cm",  key: "hipsCm" },
  thighs:   { label: "Thighs",    unit: "cm",  key: "thighCm" },
};

const FILTERS = Object.entries(FIELD_CONFIG) as [FieldKey, typeof FIELD_CONFIG[FieldKey]][];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEntryRows(entry: MeasurementEntry): { label: string; value: number; unit: string }[] {
  const rows: { label: string; value: number; unit: string }[] = [];
  if (entry.weightKg != null)       rows.push({ label: "Weight",   value: entry.weightKg,       unit: "kg" });
  if (entry.bodyFatPercent != null)  rows.push({ label: "Body Fat", value: entry.bodyFatPercent,  unit: "%" });
  if (entry.chestCm != null)         rows.push({ label: "Chest",    value: entry.chestCm,         unit: "cm" });
  if (entry.waistCm != null)         rows.push({ label: "Waist",    value: entry.waistCm,         unit: "cm" });
  if (entry.hipsCm != null)          rows.push({ label: "Hips",     value: entry.hipsCm,          unit: "cm" });
  if (entry.armCm != null)           rows.push({ label: "Arms",     value: entry.armCm,           unit: "cm" });
  if (entry.thighCm != null)         rows.push({ label: "Thighs",   value: entry.thighCm,         unit: "cm" });
  return rows;
}

function measurementIcon(entry: MeasurementEntry) {
  if (entry.weightKg != null) return Weight;
  if (entry.bodyFatPercent != null) return Percent;
  return Ruler;
}

// ─── Row component ────────────────────────────────────────────────────────────

function MeasurementRow({
  entry,
  onDelete,
}: {
  entry: MeasurementEntry;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = getEntryRows(entry);
  const Icon = measurementIcon(entry);
  const primary = rows[0];

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex items-center gap-3 px-5 py-4 hover:bg-secondary/20 transition-colors cursor-pointer"
        onClick={() => rows.length > 1 && setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>

        {/* Type + date */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight">
            {primary ? `${primary.label}` : "Entry"}
            {rows.length > 1 && (
              <span className="ml-1.5 text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                +{rows.length - 1} more
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(entry.loggedAt), "MMM d, yyyy · h:mm a")}
          </div>
        </div>

        {/* Primary value */}
        {primary && (
          <div className="text-right shrink-0">
            <span className="font-mono font-bold text-base">{primary.value}</span>
            <span className="text-xs text-muted-foreground ml-1">{primary.unit}</span>
          </div>
        )}

        {/* Expand chevron */}
        {rows.length > 1 && (
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", expanded && "rotate-180")} />
        )}

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          className="ml-1 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          aria-label="Delete measurement"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded detail rows */}
      {expanded && rows.length > 1 && (
        <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {rows.map((r) => (
            <div key={r.label} className="bg-secondary/40 rounded-xl px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{r.label}</div>
              <div className="font-mono font-bold text-sm mt-0.5">
                {r.value} <span className="text-xs font-normal text-muted-foreground">{r.unit}</span>
              </div>
            </div>
          ))}
          {entry.notes && (
            <div className="col-span-full bg-secondary/40 rounded-xl px-3 py-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</div>
              <div className="text-sm mt-0.5">{entry.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MeasurementHistory() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FieldKey>("all");
  const [entries, setEntries] = useState<MeasurementEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(async (field: FieldKey) => {
    setLoading(true);
    setError(null);
    try {
      const qs = field !== "all" ? `?field=${field}` : "";
      const data = await apiFetch<MeasurementEntry[]>(`/body-measurements/history${qs}`);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load measurements");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(activeFilter); }, [load, activeFilter]);

  const handleFilterChange = (f: FieldKey) => {
    setActiveFilter(f);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this measurement? This cannot be undone.")) return;
    try {
      await apiFetch(`/body-measurements/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Measurement deleted" });
    } catch (e: unknown) {
      toast({
        title: "Failed to delete",
        description: e instanceof Error ? e.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30 flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-primary" />
        <h3 className="font-bold">Measurement History</h3>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-border flex gap-1.5 flex-wrap">
        {FILTERS.map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors border",
              activeFilter === key
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-secondary border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 bg-secondary rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-secondary rounded w-1/3" />
                <div className="h-3 bg-secondary rounded w-1/4" />
              </div>
              <div className="h-4 bg-secondary rounded w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => load(activeFilter)} className="mt-2 text-xs underline text-muted-foreground">
            Try again
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-secondary mx-auto flex items-center justify-center">
            <Ruler className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-semibold">No body measurements yet.</p>
          <p className="text-sm text-muted-foreground">
            {activeFilter === "all"
              ? "Log your first measurement to start tracking progress."
              : `No ${FIELD_CONFIG[activeFilter].label.toLowerCase()} measurements recorded yet.`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry) => (
            <MeasurementRow key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
