import { CheckCircle, Circle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConsistencyData = {
  score: number;
  completed: number;
  targetPerWeek: number;
  totalTarget: number;
  weeklyFrequency: number;
  periodDays: number;
  workoutDates: string[]; // "YYYY-MM-DD"
};

// ─── Mini calendar heatmap (last N days) ─────────────────────────────────────

function CalendarDots({ workoutDates, days }: { workoutDates: string[]; days: number }) {
  const dateSet = new Set(workoutDates);
  const slots: Array<{ dateStr: string; trained: boolean }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    slots.push({ dateStr, trained: dateSet.has(dateStr) });
  }

  return (
    <div className="flex flex-wrap gap-1" aria-label="Workout calendar">
      {slots.map(({ dateStr, trained }) => (
        <div
          key={dateStr}
          title={dateStr}
          className={cn(
            "h-3 w-3 rounded-sm transition-colors",
            trained ? "bg-primary" : "bg-secondary",
          )}
        />
      ))}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const size = 80;
  const r = 32;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#84cc16" : score >= 60 ? "#3b82f6" : score >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={40} cy={40} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={8} />
        <circle
          cx={40} cy={40} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={circ - (score / 100) * circ}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <span className="z-10 text-lg font-black tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

export type ConsistencyCardProps = {
  data?: ConsistencyData | null;
  loading?: boolean;
  className?: string;
};

/**
 * ConsistencyCard
 *
 * Shows a consistency score ring, completed vs. target workouts, and a dot
 * heatmap of the last N days.
 *
 * Usage:
 *   <ConsistencyCard loading />
 *   <ConsistencyCard data={consistency} />
 */
export function ConsistencyCard({ data, loading = false, className }: ConsistencyCardProps) {
  if (loading) {
    return (
      <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-4 animate-pulse", className)}>
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-secondary shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-secondary rounded-lg" />
            <div className="h-3 w-48 bg-secondary rounded" />
            <div className="h-3 w-40 bg-secondary rounded" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div key={i} className="h-3 w-3 bg-secondary rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.completed === 0) {
    return (
      <div className={cn("bg-card border border-border border-dashed rounded-3xl p-8 text-center space-y-2", className)}>
        <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/40" />
        <p className="font-semibold text-sm">No workouts logged yet</p>
        <p className="text-xs text-muted-foreground">Complete workouts to track your consistency score.</p>
      </div>
    );
  }

  const missed = Math.max(0, data.totalTarget - data.completed);

  return (
    <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-5", className)}>
      <div className="flex items-center gap-5">
        <ScoreArc score={data.score} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black">{data.score}%</span>
            <span className="text-xs text-muted-foreground font-medium">consistency</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-lime-400 shrink-0" />
            {data.completed} completed
            {missed > 0 && (
              <>
                <span className="mx-1">·</span>
                <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                {missed} missed
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Target: {data.targetPerWeek}× / week · {data.weeklyFrequency}× actual
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div>
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
          Last {data.periodDays} days
        </p>
        <CalendarDots workoutDates={data.workoutDates} days={data.periodDays} />
      </div>
    </div>
  );
}
