import { Dumbbell, Clock, Flame, BarChart2, Repeat, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkoutSummaryData = {
  totalWorkouts: number;
  totalMinutes: number;
  totalVolume: number;
  totalCalories: number;
  avgDuration: number;
  totalSets: number;
  totalReps: number;
  consistency: number;
  weeklyFrequency: number;
  targetPerWeek: number;
  periodDays: number;
};

type StatProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
};

function Stat({ icon: Icon, label, value, sub, color }: StatProps) {
  return (
    <div className="bg-secondary/40 rounded-2xl p-4 space-y-2">
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", `bg-${color}-500/10`)}>
        <Icon className={cn("h-4 w-4", `text-${color}-400`)} />
      </div>
      <div className="text-2xl font-black tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground font-medium leading-tight">
        {label}
        {sub && <span className="block text-[10px] mt-0.5 text-muted-foreground/60">{sub}</span>}
      </div>
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="bg-secondary/40 rounded-2xl p-4 space-y-2 animate-pulse">
      <div className="h-8 w-8 bg-secondary rounded-xl" />
      <div className="h-7 w-16 bg-secondary rounded-lg" />
      <div className="h-3 w-24 bg-secondary rounded" />
    </div>
  );
}

export type WorkoutSummaryCardProps = {
  data?: WorkoutSummaryData | null;
  loading?: boolean;
  className?: string;
};

/**
 * WorkoutSummaryCard
 *
 * Displays key workout totals for a time period (workouts, volume, time, calories).
 *
 * Usage:
 *   <WorkoutSummaryCard loading />
 *   <WorkoutSummaryCard data={summary} />
 */
export function WorkoutSummaryCard({ data, loading = false, className }: WorkoutSummaryCardProps) {
  if (loading) {
    return (
      <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-4", className)}>
        <div className="h-5 w-40 bg-secondary rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonStat key={i} />)}
        </div>
      </div>
    );
  }

  if (!data || data.totalWorkouts === 0) {
    return (
      <div className={cn("bg-card border border-border border-dashed rounded-3xl p-8 text-center space-y-2", className)}>
        <Dumbbell className="h-8 w-8 mx-auto text-muted-foreground/40" />
        <p className="font-semibold text-sm">No workouts yet</p>
        <p className="text-xs text-muted-foreground">Complete your first workout to see analytics here.</p>
      </div>
    );
  }

  const hours = Math.floor(data.totalMinutes / 60);
  const mins = data.totalMinutes % 60;
  const timeLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Workout Summary</h2>
          <p className="text-xs text-muted-foreground">Last {data.periodDays} days</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-primary">{data.consistency}%</div>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Consistency</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat icon={Dumbbell} label="Workouts" value={data.totalWorkouts} sub={`${data.weeklyFrequency}× / week`} color="primary" />
        <Stat icon={Clock}    label="Training Time" value={timeLabel} sub={`avg ${data.avgDuration}m`} color="blue" />
        <Stat icon={BarChart2} label="Total Volume" value={`${(data.totalVolume / 1000).toFixed(1)}t`} sub="weight lifted" color="violet" />
        <Stat icon={Flame}    label="Calories" value={data.totalCalories.toLocaleString()} sub="estimated" color="orange" />
        <Stat icon={Repeat}   label="Total Sets" value={data.totalSets.toLocaleString()} color="green" />
        <Stat icon={TrendingUp} label="Total Reps" value={data.totalReps.toLocaleString()} color="yellow" />
      </div>
    </div>
  );
}
