import { Trophy, TrendingUp, Star, Zap, Timer, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonalRecordData = {
  id?: number;
  exerciseId: number;
  exerciseName: string;
  recordType: string;
  value: number;
  previousValue: number | null;
  improvementPercentage: number | null;
  unit: string;
  achievedAt?: string | Date;
  isFirstRecord?: boolean;
};

// ─── Record type config ───────────────────────────────────────────────────────

const RECORD_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  max_weight:     { label: "Max Weight",     icon: Trophy,    color: "text-yellow-400",  bgColor: "bg-yellow-500/10 border-yellow-500/25" },
  max_reps:       { label: "Max Reps",       icon: Zap,       color: "text-blue-400",    bgColor: "bg-blue-500/10 border-blue-500/25" },
  max_volume:     { label: "Max Volume",     icon: Flame,     color: "text-orange-400",  bgColor: "bg-orange-500/10 border-orange-500/25" },
  longest_streak: { label: "Streak Record",  icon: Star,      color: "text-purple-400",  bgColor: "bg-purple-500/10 border-purple-500/25" },
  fastest_time:   { label: "Fastest Time",   icon: Timer,     color: "text-green-400",   bgColor: "bg-green-500/10 border-green-500/25" },
};

function defaultConfig(recordType: string) {
  return RECORD_CONFIG[recordType] ?? { label: recordType, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10 border-primary/25" };
}

function formatValue(value: number, unit: string): string {
  if (unit === "kg") return `${value % 1 === 0 ? value : value.toFixed(1)}kg`;
  if (unit === "reps") return `${value} rep${value !== 1 ? "s" : ""}`;
  if (unit === "days") return `${value} day${value !== 1 ? "s" : ""}`;
  if (unit === "seconds") {
    const m = Math.floor(value / 60), s = value % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  return `${value} ${unit}`;
}

// ─── PersonalRecordCard ───────────────────────────────────────────────────────

export type PersonalRecordCardProps = {
  record: PersonalRecordData;
  compact?: boolean;
  className?: string;
};

/**
 * PersonalRecordCard
 *
 * Displays a single personal record with improvement % and previous best.
 * Compact mode renders a slim horizontal row for lists.
 */
export function PersonalRecordCard({ record, compact = false, className }: PersonalRecordCardProps) {
  const cfg = defaultConfig(record.recordType);
  const Icon = cfg.icon;
  const isImprovement = record.improvementPercentage !== null && record.improvementPercentage > 0;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 py-2.5 px-3 rounded-xl border", cfg.bgColor, className)}>
        <div className={cn("shrink-0 h-7 w-7 rounded-lg flex items-center justify-center", cfg.bgColor)}>
          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{record.exerciseName}</p>
          <p className="text-xs text-muted-foreground">{cfg.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-sm font-black tabular-nums", cfg.color)}>{formatValue(record.value, record.unit)}</p>
          {isImprovement && (
            <p className="text-[10px] text-lime-400 font-bold">+{record.improvementPercentage}%</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border rounded-2xl p-5 space-y-4", cfg.bgColor, className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", cfg.bgColor)}>
          <Icon className={cn("h-5 w-5", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[11px] font-bold uppercase tracking-widest", cfg.color)}>{cfg.label}</span>
            {record.isFirstRecord && (
              <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5 font-bold">First Record</span>
            )}
          </div>
          <h3 className="font-bold text-base leading-tight mt-0.5">{record.exerciseName}</h3>
        </div>
      </div>

      {/* Value display */}
      <div className="flex items-end gap-4">
        <div>
          <div className={cn("text-4xl font-black tabular-nums tracking-tight", cfg.color)}>
            {formatValue(record.value, record.unit)}
          </div>
          {record.achievedAt && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(record.achievedAt), { addSuffix: true })}
            </div>
          )}
        </div>
        {isImprovement && (
          <div className="mb-1 flex items-center gap-1 text-lime-400 bg-lime-500/10 border border-lime-500/25 rounded-full px-3 py-1 text-sm font-black">
            <TrendingUp className="h-3.5 w-3.5" />
            +{record.improvementPercentage}%
          </div>
        )}
      </div>

      {/* Previous best */}
      {record.previousValue !== null && (
        <div className="pt-3 border-t border-border/50 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Previous best</span>
          <span className="font-semibold tabular-nums">{formatValue(record.previousValue, record.unit)}</span>
        </div>
      )}
    </div>
  );
}

// ─── PRNotification ───────────────────────────────────────────────────────────

export type PRNotificationProps = {
  records: PersonalRecordData[];
  onDismiss?: () => void;
  autoDismissMs?: number;
};

/**
 * PRNotification
 *
 * Overlay celebration panel shown after a workout when new PRs are detected.
 * Auto-dismisses after `autoDismissMs` (default 6 s).
 *
 * Usage:
 *   const [prs, setPRs] = useState<PersonalRecordData[]>([]);
 *   ...
 *   {prs.length > 0 && (
 *     <PRNotification records={prs} onDismiss={() => setPRs([])} />
 *   )}
 */
export function PRNotification({ records, onDismiss, autoDismissMs = 6000 }: PRNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismissMs <= 0) return;
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDismiss]);

  if (!visible || records.length === 0) return null;

  const first = records[0];
  const cfg = defaultConfig(first.recordType);
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-4 z-50 w-80 max-w-[calc(100vw-2rem)]",
        "animate-in slide-in-from-bottom-4 fade-in duration-500",
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={cn("rounded-2xl border shadow-2xl p-4 space-y-3 backdrop-blur-sm bg-card/95", cfg.bgColor)}>
        {/* Congrats header */}
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 animate-bounce", cfg.bgColor)}>
            <Icon className={cn("h-5 w-5", cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-bold uppercase tracking-widest", cfg.color)}>
              🏆 New Personal Record
            </p>
            <p className="font-bold text-sm truncate">{first.exerciseName}</p>
          </div>
          <button
            onClick={() => { setVisible(false); onDismiss?.(); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 text-lg leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        {/* New value */}
        <div className="flex items-center justify-between">
          <div>
            <span className={cn("text-2xl font-black tabular-nums", cfg.color)}>
              {formatValue(first.value, first.unit)}
            </span>
            {first.previousValue !== null && (
              <span className="text-xs text-muted-foreground ml-2">
                prev. {formatValue(first.previousValue, first.unit)}
              </span>
            )}
          </div>
          {first.improvementPercentage !== null && first.improvementPercentage > 0 && (
            <span className="text-lime-400 bg-lime-500/10 border border-lime-500/25 rounded-full px-2 py-0.5 text-xs font-black">
              +{first.improvementPercentage}%
            </span>
          )}
        </div>

        {/* Congratulation text */}
        <p className="text-xs text-muted-foreground">
          {first.isFirstRecord
            ? `Your first ${cfg.label.toLowerCase()} for ${first.exerciseName} — great start!`
            : `Congratulations! You broke your ${first.exerciseName} record.`}
          {records.length > 1 && ` +${records.length - 1} more PR${records.length - 1 !== 1 ? "s" : ""} this workout!`}
        </p>

        {/* Progress bar (auto-dismiss countdown) */}
        {autoDismissMs > 0 && (
          <div className="h-0.5 bg-border rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", cfg.color.replace("text-", "bg-"))}
              style={{
                animation: `shrink ${autoDismissMs}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
