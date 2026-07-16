import React from "react";
import { useGetWorkoutAnalytics, useGetWorkoutHistory } from "@workspace/api-client-react";
import { Trophy, Flame, Clock, Calendar, TrendingUp, Target, Zap, BarChart3, ArrowLeft, Dumbbell, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Very Easy", color: "text-green-400" },
  2: { label: "Easy", color: "text-emerald-400" },
  3: { label: "Moderate", color: "text-yellow-400" },
  4: { label: "Hard", color: "text-orange-400" },
  5: { label: "Very Hard", color: "text-red-400" },
};

export default function WorkoutAnalyticsPage() {
  const { data: analytics, isLoading } = useGetWorkoutAnalytics({ days: 30 });
  const { data: history, isLoading: historyLoading } = useGetWorkoutHistory({ limit: 10 });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/workouts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">Your training data — last 30 days.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Workouts",
            value: isLoading ? null : analytics?.totalWorkouts ?? 0,
            icon: Target,
            color: "text-primary",
          },
          {
            label: "Hours Trained",
            value: isLoading ? null : Math.round((analytics?.totalMinutes ?? 0) / 60),
            icon: Clock,
            color: "text-blue-400",
          },
          {
            label: "Calories Burned",
            value: isLoading ? null : (analytics?.caloriesBurned ?? 0).toLocaleString(),
            icon: Flame,
            color: "text-orange-400",
          },
          {
            label: "This Week",
            value: isLoading ? null : analytics?.thisWeekWorkouts ?? 0,
            icon: Calendar,
            color: "text-green-400",
          },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="h-24 w-24" />
            </div>
            <div className="relative z-10">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", `bg-${stat.color.split('-')[1]}-500/10`)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div className="text-3xl font-bold font-mono">
                {isLoading ? <Skeleton className="h-8 w-16" /> : stat.value}
              </div>
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Weekly Consistency */}
        <div className="md:col-span-4 bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Weekly Consistency</h3>
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold">{analytics?.weeklyConsistency ?? 0}<span className="text-2xl text-muted-foreground">%</span></span>
              </div>
              <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${analytics?.weeklyConsistency ?? 0}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {analytics?.thisWeekWorkouts ?? 0} workouts this week vs. 3-day target.
              </p>
            </>
          )}
        </div>

        {/* Avg Difficulty */}
        <div className="md:col-span-4 bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h3 className="font-bold">Avg Difficulty</h3>
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold font-mono">
                  {analytics?.avgDifficultyRating ? analytics.avgDifficultyRating.toFixed(1) : "—"}
                </span>
                <span className="text-muted-foreground mb-1">/ 5</span>
              </div>
              {analytics?.avgDifficultyRating && (
                <div className={cn("text-sm font-semibold", DIFFICULTY_LABELS[Math.round(analytics.avgDifficultyRating)]?.color)}>
                  {DIFFICULTY_LABELS[Math.round(analytics.avgDifficultyRating)]?.label}
                </div>
              )}
              <p className="text-sm text-muted-foreground">Based on post-workout feedback.</p>
            </>
          )}
        </div>

        {/* Avg Duration */}
        <div className="md:col-span-4 bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold">Avg Duration</h3>
          </div>
          {isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold font-mono">
                  {analytics?.avgDuration ? Math.round(analytics.avgDuration) : 0}
                </span>
                <span className="text-muted-foreground mb-1">min</span>
              </div>
              <p className="text-sm text-muted-foreground">Average session length per workout.</p>
            </>
          )}
        </div>
      </div>

      {/* Muscle Groups & Favorite Exercises */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Muscle Groups This Week */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Muscle Groups This Week</h3>
          </div>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
            </div>
          ) : (analytics?.muscleGroupsThisWeek ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-primary/40" />
              </div>
              <p className="text-sm text-muted-foreground">Complete a workout this week to see muscle coverage.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(analytics!.muscleGroupsThisWeek as string[]).map((mg, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold capitalize">
                  {mg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top Exercises */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <h3 className="font-bold">Top Exercises</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
            </div>
          ) : (analytics?.favoriteExercises ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
              <div className="h-10 w-10 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-yellow-400/40" />
              </div>
              <p className="text-sm text-muted-foreground">Log workouts to see your most-trained exercises.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(analytics!.favoriteExercises ?? []).map((ex, i) => {
                const maxCount = analytics!.favoriteExercises![0]?.count ?? 1;
                const pct = Math.round(((ex.count ?? 0) / maxCount) * 100);
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate mr-2">{ex.name}</span>
                      <span className="text-muted-foreground shrink-0">{ex.count}×</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-1.5">
                      <div
                        className="h-full bg-yellow-400/70 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Recent PRs */}
        <div className="md:col-span-5 bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <h3 className="font-bold">Personal Records</h3>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
            </div>
          ) : (analytics?.recentPersonalRecords ?? []).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-400/10 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-400/50" />
              </div>
              <p className="text-sm text-muted-foreground">No PRs yet. Keep lifting!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(analytics?.recentPersonalRecords ?? []).map((pr: { id: number; exerciseName: string; recordType: string; value: number; unit: string; achievedAt: string }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-yellow-400/5 border border-yellow-400/20 rounded-xl">
                  <div className="h-8 w-8 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{pr.exerciseName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {pr.recordType.replace("_", " ")} · {format(new Date(pr.achievedAt), "MMM d")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-yellow-400">{pr.value}</span>
                    <span className="text-xs text-muted-foreground ml-1">{pr.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session History */}
        <div className="md:col-span-7 bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Session History</h3>
          </div>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (history ?? []).length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground">No sessions logged yet. Start a workout!</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-80">
              {(history ?? []).map(session => (
                <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.workoutName || "Workout Session"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(session.completedAt), "EEE, MMM d")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium">{session.durationMinutes}min</div>
                    {session.caloriesBurned && (
                      <div className="text-xs text-muted-foreground">{session.caloriesBurned} kcal</div>
                    )}
                  </div>
                  {session.difficultyRating && (
                    <div className={cn("text-xs font-bold w-5 text-center", DIFFICULTY_LABELS[session.difficultyRating]?.color)}>
                      {session.difficultyRating}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
