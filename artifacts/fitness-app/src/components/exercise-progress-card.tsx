import { TrendingUp, TrendingDown, Minus, Trophy, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExerciseProgressData = {
  exerciseId: number;
  exerciseName: string | null;
  history: Array<{
    date: Date | string;
    maxWeightKg: number | null;
    totalVolume: number;
    totalReps: number;
    totalSets: number;
    isPersonalRecord: boolean;
  }>;
  progress: {
    sessions: number;
    weightChangePct: number | null;
    volumeChangePct: number | null;
    strengthTrend: "improving" | "stable" | "declining";
    avgWeightKg: number | null;
    maxWeightEver: number | null;
  } | null;
};

const TREND_CONFIG = {
  improving: {
    icon: TrendingUp,
    label: "Improving",
    color: "text-lime-400",
    bg: "bg-lime-500/10 border-lime-500/20",
  },
  stable: {
    icon: Minus,
    label: "Stable",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  declining: {
    icon: TrendingDown,
    label: "Declining",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
  },
} as const;

function ChangePill({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 border",
      positive ? "text-lime-400 bg-lime-500/10 border-lime-500/20" : "text-red-400 bg-red-500/10 border-red-500/20",
    )}>
      {positive ? "+" : ""}{value}% {label}
    </div>
  );
}

export type ExerciseProgressCardProps = {
  data?: ExerciseProgressData | null;
  loading?: boolean;
  className?: string;
};

/**
 * ExerciseProgressCard
 *
 * Displays strength trend, best weight, sessions count, and % changes for one exercise.
 *
 * Usage:
 *   <ExerciseProgressCard loading />
 *   <ExerciseProgressCard data={exerciseData} />
 */
export function ExerciseProgressCard({ data, loading = false, className }: ExerciseProgressCardProps) {
  if (loading) {
    return (
      <div className={cn("bg-card border border-border rounded-2xl p-5 space-y-4 animate-pulse", className)}>
        <div className="h-5 w-32 bg-secondary rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-secondary rounded-xl" />)}
        </div>
        <div className="h-4 w-48 bg-secondary rounded" />
      </div>
    );
  }

  if (!data || !data.progress || data.history.length === 0) {
    return (
      <div className={cn("bg-card border border-border border-dashed rounded-2xl p-6 text-center space-y-2", className)}>
        <Dumbbell className="h-7 w-7 mx-auto text-muted-foreground/40" />
        <p className="text-sm font-semibold">No history yet</p>
        <p className="text-xs text-muted-foreground">
          {data?.exerciseName ?? "This exercise"} hasn't been logged yet.
        </p>
      </div>
    );
  }

  const { progress } = data;
  const trend = TREND_CONFIG[progress.strengthTrend];
  const TrendIcon = trend.icon;
  const latestSession = data.history[data.history.length - 1];

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{data.exerciseName ?? `Exercise #${data.exerciseId}`}</h3>
          <p className="text-xs text-muted-foreground">{progress.sessions} session{progress.sessions !== 1 ? "s" : ""} logged</p>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-bold border rounded-full px-2.5 py-1", trend.bg, trend.color)}>
          <TrendIcon className="h-3 w-3" />
          {trend.label}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/40 rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Best Weight</div>
          <div className="font-black text-lg">
            {progress.maxWeightEver !== null ? `${progress.maxWeightEver}kg` : "—"}
          </div>
        </div>
        <div className="bg-secondary/40 rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Avg Weight</div>
          <div className="font-black text-lg">
            {progress.avgWeightKg !== null ? `${progress.avgWeightKg}kg` : "—"}
          </div>
        </div>
        <div className="bg-secondary/40 rounded-xl p-3">
          <div className="text-xs text-muted-foreground mb-1">Last Session</div>
          <div className="font-black text-lg">
            {latestSession.maxWeightKg !== null ? `${latestSession.maxWeightKg}kg` : "BW"}
          </div>
        </div>
      </div>

      {/* Progress pills */}
      <div className="flex flex-wrap gap-2">
        <ChangePill value={progress.weightChangePct} label="strength" />
        <ChangePill value={progress.volumeChangePct} label="volume" />
        {data.history.some((h) => h.isPersonalRecord) && (
          <div className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
            <Trophy className="h-3 w-3" /> PR achieved
          </div>
        )}
      </div>
    </div>
  );
}
