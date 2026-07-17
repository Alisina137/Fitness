import React from "react";
import { useGetProgressStats, useGetAchievements, useListProgressEntries } from "@workspace/api-client-react";
import { Trophy, Calendar, Zap, Target, Star, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MeasurementHistory } from "@/components/measurement-history";
import { BodyMeasurementChart } from "@/components/body-measurement-chart";
import { BodyMeasurementComparison } from "@/components/body-measurement-comparison";

export default function ProgressPage() {
  const { data: stats, isLoading: loadingStats } = useGetProgressStats();
  const { data: achievements, isLoading: loadingAchievements } = useGetAchievements();
  const { data: history, isLoading: loadingHistory } = useListProgressEntries({ type: 'weight', limit: 5 });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance Data</h1>
        <p className="text-muted-foreground mt-1">Long-term trends and physiological adaptations.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Workouts", val: stats?.totalWorkouts || 0, icon: Target },
          { label: "Hours Trained", val: Math.round((stats?.totalMinutes || 0) / 60), icon: Calendar },
          { label: "Max Streak", val: `${stats?.longestStreak || 0}d`, icon: Zap },
          { label: "Achievements", val: stats?.achievementsEarned || 0, icon: Trophy },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <stat.icon className="h-24 w-24" />
            </div>
            <div className="relative z-10">
              <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <stat.icon className="h-3 w-3 text-primary" /> {stat.label}
              </div>
              <div className="text-3xl md:text-4xl font-bold font-mono">{loadingStats ? "-" : stat.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Measurement Comparison */}
      <BodyMeasurementComparison />

      <div className="grid md:grid-cols-12 gap-8">
        {/* Body Measurement Chart */}
        <div className="md:col-span-8 space-y-6">
          <BodyMeasurementChart />

          {/* Recent Weigh-ins */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-secondary/30">
              <h3 className="font-bold">Recent Weight Logs</h3>
            </div>
            <div className="divide-y divide-border">
              {loadingHistory ? (
                [1,2,3].map(i => <div key={i} className="p-4"><Skeleton className="h-8 w-full" /></div>)
              ) : history && history.length > 0 ? (
                history.map((entry) => (
                  <div key={entry.id} className="p-4 px-6 flex justify-between items-center hover:bg-secondary/20 transition-colors">
                    <div className="font-medium">{format(new Date(entry.loggedAt), "MMM d, yyyy")}</div>
                    <div className="font-mono font-bold text-lg">{entry.weightKg} kg</div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">No measurements logged yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Measurement History */}
        <div className="md:col-span-8">
          <MeasurementHistory />
        </div>

        {/* Badges / Achievements */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-card border border-border p-6 rounded-3xl">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" /> Honors Board
            </h3>
            
            {loadingAchievements ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : achievements && achievements.length > 0 ? (
              <div className="space-y-4">
                {achievements.map((ach) => (
                  <div key={ach.id} className="flex gap-4 items-center p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <div className="h-12 w-12 rounded-full bg-background border border-primary/30 flex items-center justify-center shrink-0">
                      <span className="text-2xl" role="img" aria-label="icon">{ach.icon || '🏆'}</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm leading-tight mb-1 text-primary">{ach.name}</div>
                      <div className="text-xs text-muted-foreground">{ach.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-secondary mx-auto flex items-center justify-center mb-3">
                  <Star className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No badges yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Keep training to unlock milestones.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
