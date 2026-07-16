import { cn } from "@/lib/utils";
import { CheckCircle, RefreshCw, AlertTriangle, XCircle, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MuscleFatigueLevel = "low" | "medium" | "high";

export type MuscleRecoveryData = {
  muscleGroup: string;
  recoveryPercentage: number;
  fatigueLevel: MuscleFatigueLevel;
  sorenessLevel: number;
  lastTrainedDate: string | null;
  estimatedRecoveryDate: string | null;
  trainingVolume: number;
};

// ─── Style helpers ────────────────────────────────────────────────────────────

function getStatusFromPct(pct: number): {
  label: string;
  color: string;
  icon: React.ReactNode;
} {
  if (pct >= 80) return {
    label: "Fully Recovered",
    color: "#84cc16",
    icon: <CheckCircle className="h-3.5 w-3.5 text-lime-400" />,
  };
  if (pct >= 60) return {
    label: "Almost Recovered",
    color: "#3b82f6",
    icon: <RefreshCw className="h-3.5 w-3.5 text-blue-400" />,
  };
  if (pct >= 40) return {
    label: "Needs Recovery",
    color: "#eab308",
    icon: <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />,
  };
  return {
    label: "Rest Required",
    color: "#ef4444",
    icon: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  };
}

const FATIGUE_BADGE: Record<MuscleFatigueLevel, { label: string; cls: string }> = {
  low:    { label: "Low Fatigue",    cls: "bg-lime-500/10 text-lime-400 border-lime-500/20" },
  medium: { label: "Medium Fatigue", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  high:   { label: "High Fatigue",   cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function hoursAgoLabel(dateStr: string | null): string {
  if (!dateStr) return "Never trained";
  const h = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function recoveryDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (date <= new Date()) return null; // Already recovered
  const h = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
  if (h < 1) return "< 1h";
  if (h < 24) return `~${h}h`;
  const d = Math.round(h / 24);
  return `~${d}d`;
}

// ─── Compact variant ──────────────────────────────────────────────────────────

function MuscleRecoveryCardCompact({ data }: { data: MuscleRecoveryData }) {
  const status = getStatusFromPct(data.recoveryPercentage);
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {status.icon}
          <span className="font-semibold text-sm">{data.muscleGroup}</span>
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color: status.color }}>
          {data.recoveryPercentage}%
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${data.recoveryPercentage}%`, backgroundColor: status.color }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{status.label}</span>
        <span>{hoursAgoLabel(data.lastTrainedDate)}</span>
      </div>
    </div>
  );
}

// ─── Full variant ─────────────────────────────────────────────────────────────

function MuscleRecoveryCardFull({ data }: { data: MuscleRecoveryData }) {
  const status = getStatusFromPct(data.recoveryPercentage);
  const fatigueBadge = FATIGUE_BADGE[data.fatigueLevel] ?? FATIGUE_BADGE.low;
  const etaLabel = recoveryDateLabel(data.estimatedRecoveryDate);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {status.icon}
            <span className="font-bold">{data.muscleGroup}</span>
          </div>
          <span
            className={cn(
              "inline-block text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5",
              fatigueBadge.cls,
            )}
          >
            {fatigueBadge.label}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black tabular-nums" style={{ color: status.color }}>
            {data.recoveryPercentage}%
          </div>
          <div className="text-[10px] text-muted-foreground font-medium">recovered</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${data.recoveryPercentage}%`, backgroundColor: status.color }}
        />
      </div>

      {/* Status label */}
      <p className="text-sm font-medium" style={{ color: status.color }}>{status.label}</p>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-secondary/40 rounded-xl p-2.5 space-y-0.5">
          <div className="text-muted-foreground font-medium">Last trained</div>
          <div className="font-semibold">{hoursAgoLabel(data.lastTrainedDate)}</div>
        </div>
        <div className="bg-secondary/40 rounded-xl p-2.5 space-y-0.5">
          <div className="text-muted-foreground font-medium">Volume</div>
          <div className="font-semibold">{data.trainingVolume} exercise{data.trainingVolume !== 1 ? "s" : ""}</div>
        </div>
        <div className="bg-secondary/40 rounded-xl p-2.5 space-y-0.5">
          <div className="text-muted-foreground font-medium">Soreness</div>
          <div className="font-semibold">{data.sorenessLevel}/10</div>
        </div>
        {etaLabel && (
          <div className="bg-secondary/40 rounded-xl p-2.5 space-y-0.5">
            <div className="flex items-center gap-1 text-muted-foreground font-medium">
              <Clock className="h-3 w-3" /> Full recovery
            </div>
            <div className="font-semibold">{etaLabel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MuscleRecoveryCardSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className={cn("bg-card border border-border rounded-2xl animate-pulse", compact ? "p-4" : "p-5")}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-secondary rounded-xl w-24" />
        <div className="h-5 bg-secondary rounded-xl w-12" />
      </div>
      <div className="h-2 bg-secondary rounded-full mb-2" />
      {!compact && (
        <>
          <div className="h-3 bg-secondary rounded-xl w-32 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-secondary rounded-xl" />)}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type MuscleRecoveryCardProps = {
  data?: MuscleRecoveryData | null;
  loading?: boolean;
  /** Compact mode: bar + label only, no meta grid. Default false. */
  compact?: boolean;
  className?: string;
};

/**
 * MuscleRecoveryCard
 *
 * Reusable component showing per-muscle recovery status.
 *
 * Usage:
 *   <MuscleRecoveryCard loading />
 *   <MuscleRecoveryCard data={muscle} />
 *   <MuscleRecoveryCard data={muscle} compact />
 */
export function MuscleRecoveryCard({ data, loading = false, compact = false, className }: MuscleRecoveryCardProps) {
  if (loading) return <MuscleRecoveryCardSkeleton compact={compact} />;
  if (!data) return null;
  return (
    <div className={className}>
      {compact ? <MuscleRecoveryCardCompact data={data} /> : <MuscleRecoveryCardFull data={data} />}
    </div>
  );
}

// ─── Dashboard section helper ─────────────────────────────────────────────────

export type MuscleRecoveryDashboardProps = {
  muscles: MuscleRecoveryData[];
  loading?: boolean;
  compact?: boolean;
};

/**
 * MuscleRecoveryDashboard
 *
 * Renders a grid of MuscleRecoveryCard components for all tracked muscles.
 * Shows a split: recovered (≥80%) vs. still recovering.
 */
export function MuscleRecoveryDashboard({ muscles, loading = false, compact = false }: MuscleRecoveryDashboardProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <MuscleRecoveryCardSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (muscles.length === 0) {
    return (
      <div className="bg-card border border-border border-dashed rounded-3xl p-8 text-center space-y-2">
        <p className="text-sm font-semibold">No muscle data yet</p>
        <p className="text-xs text-muted-foreground">
          Complete a workout to start tracking per-muscle recovery.
        </p>
      </div>
    );
  }

  const recovered = muscles.filter((m) => m.recoveryPercentage >= 80);
  const recovering = muscles.filter((m) => m.recoveryPercentage < 80);

  return (
    <div className="space-y-5">
      {recovered.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-lime-400 mb-3">
            ✓ Ready to Train ({recovered.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recovered.map((m) => (
              <MuscleRecoveryCard key={m.muscleGroup} data={m} compact={compact} />
            ))}
          </div>
        </div>
      )}
      {recovering.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-yellow-400 mb-3">
            ↻ Still Recovering ({recovering.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recovering.map((m) => (
              <MuscleRecoveryCard key={m.muscleGroup} data={m} compact={compact} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
