import { Target, TrendingUp, TrendingDown, Dumbbell, Heart, BarChart3, ListChecks, Trophy, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoalProgress = {
  id: number;
  title: string;
  category: string;
  status: string;
  priority: string;
  isPrimary: boolean;
  currentValue: number | null;
  targetValue: number | null;
  referenceValue: number | null;
  unit: string | null;
  progressPercentage: number;
  remaining: number | null;
  startDate: string | Date;
  targetDate: string | Date | null;
  updatedAt?: string | Date;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  weight_loss: TrendingDown,
  weight_gain: TrendingUp,
  muscle_gain: Dumbbell,
  strength:    Trophy,
  endurance:   Heart,
  body_fat:    BarChart3,
  workout_consistency: ListChecks,
  custom: Target,
};

const CAT_COLOR: Record<string, string> = {
  weight_loss:          "text-orange-400",
  weight_gain:          "text-blue-400",
  muscle_gain:          "text-violet-400",
  strength:             "text-yellow-400",
  endurance:            "text-red-400",
  body_fat:             "text-pink-400",
  workout_consistency:  "text-lime-400",
  custom:               "text-primary",
};

function progressColor(pct: number): string {
  if (pct >= 80) return "bg-lime-500";
  if (pct >= 50) return "bg-primary";
  if (pct >= 25) return "bg-yellow-500";
  return "bg-orange-500";
}

function formatValue(v: number | null, unit: string | null): string {
  if (v === null) return "—";
  const u = unit ?? "";
  return u ? `${v}${u.startsWith("%") ? "" : " "}${u}` : String(v);
}

// ─── GoalProgressCard ─────────────────────────────────────────────────────────

export type GoalProgressCardProps = {
  goal: GoalProgress;
  compact?: boolean;
  className?: string;
};

/**
 * GoalProgressCard
 *
 * Shows goal title, animated progress bar, %, remaining amount, and target date.
 *
 * Usage:
 *   <GoalProgressCard goal={goal} />
 *   <GoalProgressCard goal={goal} compact />
 */
export function GoalProgressCard({ goal, compact = false, className }: GoalProgressCardProps) {
  const Icon = CAT_ICON[goal.category] ?? Target;
  const iconColor = CAT_COLOR[goal.category] ?? "text-primary";
  const pct = Math.min(100, Math.max(0, goal.progressPercentage));
  const barColor = progressColor(pct);

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86_400_000)
    : null;

  const isExpired = goal.status === "expired" || (daysLeft !== null && daysLeft < 0 && goal.status !== "completed");

  if (compact) {
    return (
      <div className={cn("bg-card border border-border rounded-2xl p-4 space-y-3", className)}>
        <div className="flex items-center gap-3">
          <div className={cn("h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0")}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {goal.isPrimary && <Star className="h-3 w-3 text-yellow-400 shrink-0" />}
              <p className="text-sm font-semibold truncate">{goal.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">{formatValue(goal.currentValue, goal.unit)} → {formatValue(goal.targetValue, goal.unit)}</p>
          </div>
          <span className={cn("text-sm font-black tabular-nums shrink-0", pct >= 100 ? "text-lime-400" : iconColor)}>
            {pct}%
          </span>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${pct}%` }} />
          </div>
          {goal.remaining !== null && goal.remaining > 0 && (
            <p className="text-[10px] text-muted-foreground">{formatValue(goal.remaining, goal.unit)} remaining</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {goal.isPrimary && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 rounded-full px-2 py-0.5">
                <Star className="h-2.5 w-2.5" /> Primary
              </span>
            )}
            {goal.status === "completed" && (
              <span className="text-[10px] font-bold text-lime-400 bg-lime-500/10 border border-lime-500/25 rounded-full px-2 py-0.5">✓ Completed</span>
            )}
            {isExpired && goal.status !== "completed" && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/25 rounded-full px-2 py-0.5">Expired</span>
            )}
          </div>
          <h3 className="font-bold mt-0.5 leading-tight">{goal.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <span className={cn("text-2xl font-black tabular-nums", pct >= 100 ? "text-lime-400" : iconColor)}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatValue(goal.currentValue, goal.unit)}</span>
          <span>{formatValue(goal.targetValue, goal.unit)}</span>
        </div>
      </div>

      {/* Remaining + dates */}
      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
        {goal.remaining !== null && goal.remaining > 0 ? (
          <span className="font-medium text-muted-foreground">
            <span className={iconColor}>{formatValue(goal.remaining, goal.unit)}</span> remaining
          </span>
        ) : pct >= 100 ? (
          <span className="font-bold text-lime-400 flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Goal reached!</span>
        ) : (
          <span />
        )}

        {daysLeft !== null && (
          <span className={cn("font-medium", isExpired ? "text-red-400" : daysLeft < 14 ? "text-yellow-400" : "text-muted-foreground")}>
            {isExpired
              ? `Ended ${formatDistanceToNow(new Date(goal.targetDate!), { addSuffix: true })}`
              : `${daysLeft}d left · ${format(new Date(goal.targetDate!), "MMM d")}`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

export function GoalProgressCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-secondary rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-secondary rounded w-3/4" />
            <div className="h-3 bg-secondary rounded w-1/2" />
          </div>
          <div className="h-5 w-10 bg-secondary rounded shrink-0" />
        </div>
        <div className="h-1.5 bg-secondary rounded-full" />
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 bg-secondary rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary rounded w-2/3" />
          <div className="h-3 bg-secondary rounded w-1/3" />
        </div>
        <div className="h-7 w-14 bg-secondary rounded shrink-0" />
      </div>
      <div className="h-3 bg-secondary rounded-full" />
      <div className="flex justify-between">
        <div className="h-3 bg-secondary rounded w-16" />
        <div className="h-3 bg-secondary rounded w-16" />
      </div>
    </div>
  );
}
