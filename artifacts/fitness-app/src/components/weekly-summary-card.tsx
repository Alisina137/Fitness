import { Dumbbell, Clock, Flame, Trophy, Target, Heart } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WeeklyComparison = {
  prevWeekStartDate: string;
  deltaTotalWorkouts: number;
  deltaTotalWorkoutMinutes: number;
  deltaCaloriesBurned: number | null;
  deltaTotalPersonalRecords: number;
  deltaGoalsCompleted: number;
  deltaRecoveryCheckIns: number;
};

export type WeeklySummaryData = {
  weekStartDate: string;
  weekEndDate: string;
  totalWorkouts: number;
  totalWorkoutMinutes: number;
  caloriesBurned: number | null;
  totalPersonalRecords: number;
  goalsCompleted: number;
  recoveryCheckIns: number;
  avgRecoveryScore: number | null;
  comparison: WeeklyComparison;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (minutes === 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDurationDelta(minutes: number): string {
  if (minutes === 0) return "0m";
  const abs = Math.abs(minutes);
  const h   = Math.floor(abs / 60);
  const m   = abs % 60;
  const str = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  return `${minutes > 0 ? "+" : "−"}${str}`;
}

function recoveryLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Moderate";
  return "Poor";
}

function recoveryColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 65) return "text-blue-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

type DeltaBadgeProps = {
  delta: number | null;
  /** Custom label override — used for formatted durations */
  label?: string;
  /** When true, a positive delta is bad (e.g. calories if someone wants to cut) */
  invertColor?: boolean;
};

function DeltaBadge({ delta, label, invertColor = false }: DeltaBadgeProps) {
  if (delta == null) return null;

  const isZero    = delta === 0;
  const isPos     = delta > 0;
  const isGood    = invertColor ? !isPos : isPos;

  const colorClass = isZero
    ? "text-muted-foreground"
    : isGood
    ? "text-green-500"
    : "text-red-500";

  const displayLabel = label ?? (isZero ? "=" : `${isPos ? "+" : "−"}${Math.abs(delta)}`);

  return (
    <span className={cn("text-[11px] font-semibold tabular-nums", colorClass)}>
      {displayLabel} vs last week
    </span>
  );
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

type TileProps = {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: string;
  delta?: React.ReactNode;
  accent: string;
  dim?: boolean;
};

function Tile({ icon: Icon, label, value, sub, delta, accent, dim }: TileProps) {
  return (
    <div className={cn(
      "bg-background border border-border rounded-2xl p-5 flex flex-col gap-1 relative overflow-hidden group",
      dim && "opacity-50",
    )}>
      <div className="absolute -right-3 -top-3 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-20 w-20" />
      </div>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-3 w-3", accent)} />
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-bold font-mono">{value}</div>
      {sub   && <div className="text-xs text-muted-foreground">{sub}</div>}
      {delta && <div className="mt-0.5">{delta}</div>}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

type WeeklySummaryCardProps = {
  data: WeeklySummaryData;
};

export function WeeklySummaryCard({ data }: WeeklySummaryCardProps) {
  const start   = parseISO(data.weekStartDate);
  // weekEndDate is exclusive (start + 7), so last day shown is start + 6
  const lastDay = parseISO(data.weekEndDate);
  lastDay.setDate(lastDay.getDate() - 1);

  const sameMonth  = start.getMonth() === lastDay.getMonth();
  const rangeLabel = sameMonth
    ? `${format(start, "MMM d")}–${format(lastDay, "d, yyyy")}`
    : `${format(start, "MMM d")}–${format(lastDay, "MMM d, yyyy")}`;

  const { comparison: c } = data;

  const isEmpty =
    data.totalWorkouts === 0 &&
    data.totalPersonalRecords === 0 &&
    data.goalsCompleted === 0 &&
    data.recoveryCheckIns === 0;

  return (
    <div className="bg-card border border-border rounded-3xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{rangeLabel}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Weekly fitness summary
            {c && (
              <span className="ml-2 text-xs text-muted-foreground/60">
                vs week of {format(parseISO(c.prevWeekStartDate), "MMM d")}
              </span>
            )}
          </p>
        </div>
        {isEmpty && (
          <span className="text-xs font-medium bg-secondary text-muted-foreground px-3 py-1 rounded-full">
            No activity
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="py-10 text-center text-muted-foreground">
          <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No activity recorded this week.</p>
          <p className="text-sm mt-1">Log workouts, check-ins, or goals to see your summary.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Tile
            icon={Dumbbell}
            label="Workouts"
            value={data.totalWorkouts}
            sub={data.totalWorkouts === 1 ? "session" : "sessions"}
            delta={c && <DeltaBadge delta={c.deltaTotalWorkouts} />}
            accent="text-blue-500"
          />
          <Tile
            icon={Clock}
            label="Workout Time"
            value={formatDuration(data.totalWorkoutMinutes)}
            sub={`${data.totalWorkoutMinutes} min total`}
            delta={
              c && (
                <DeltaBadge
                  delta={c.deltaTotalWorkoutMinutes}
                  label={formatDurationDelta(c.deltaTotalWorkoutMinutes) + " vs last week"}
                />
              )
            }
            accent="text-cyan-500"
          />
          <Tile
            icon={Flame}
            label="Calories"
            value={data.caloriesBurned != null ? data.caloriesBurned.toLocaleString() : "—"}
            sub={data.caloriesBurned != null ? "kcal burned" : "not tracked"}
            delta={
              c?.deltaCaloriesBurned != null && (
                <DeltaBadge
                  delta={c.deltaCaloriesBurned}
                  label={`${c.deltaCaloriesBurned > 0 ? "+" : "−"}${Math.abs(c.deltaCaloriesBurned).toLocaleString()} kcal vs last week`}
                />
              )
            }
            accent="text-orange-500"
            dim={data.caloriesBurned == null}
          />
          <Tile
            icon={Heart}
            label="Recovery"
            value={
              data.avgRecoveryScore != null ? (
                <span className={recoveryColor(data.avgRecoveryScore)}>
                  {data.avgRecoveryScore}
                </span>
              ) : "—"
            }
            sub={
              data.avgRecoveryScore != null
                ? `${recoveryLabel(data.avgRecoveryScore)} · ${data.recoveryCheckIns} check-in${data.recoveryCheckIns !== 1 ? "s" : ""}`
                : `${data.recoveryCheckIns} check-in${data.recoveryCheckIns !== 1 ? "s" : ""}`
            }
            delta={c && <DeltaBadge delta={c.deltaRecoveryCheckIns} label={`${c.deltaRecoveryCheckIns === 0 ? "=" : c.deltaRecoveryCheckIns > 0 ? `+${c.deltaRecoveryCheckIns}` : `−${Math.abs(c.deltaRecoveryCheckIns)}`} check-in${Math.abs(c.deltaRecoveryCheckIns) !== 1 ? "s" : ""} vs last week`} />}
            accent="text-green-500"
            dim={data.recoveryCheckIns === 0}
          />
          <Tile
            icon={Trophy}
            label="Personal Records"
            value={data.totalPersonalRecords}
            sub={data.totalPersonalRecords === 1 ? "new PR" : "new PRs"}
            delta={c && <DeltaBadge delta={c.deltaTotalPersonalRecords} />}
            accent="text-yellow-500"
          />
          <Tile
            icon={Target}
            label="Goals Completed"
            value={data.goalsCompleted}
            sub={data.goalsCompleted === 1 ? "goal reached" : "goals reached"}
            delta={c && <DeltaBadge delta={c.deltaGoalsCompleted} />}
            accent="text-purple-500"
          />
        </div>
      )}
    </div>
  );
}
