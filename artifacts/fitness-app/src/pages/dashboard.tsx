import React from "react";
import { Link } from "wouter";
import { 
  useGetDashboardSummary, 
  useGetRecentActivity,
  useCompleteWorkout
} from "@workspace/api-client-react";
import { 
  Activity, 
  Flame, 
  Clock, 
  Target, 
  ChevronRight, 
  CheckCircle2,
  Utensils
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const completeWorkout = useCompleteWorkout();

  const handleQuickComplete = (workoutId: number, workoutName: string, duration: number) => {
    completeWorkout.mutate({
      id: workoutId,
      data: {
        durationMinutes: duration,
        caloriesBurned: Math.round(duration * 8), // estimation
        rating: 4,
        notes: "Completed from dashboard"
      }
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Your daily overview and metrics.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-card border border-border px-4 py-2 rounded-xl">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="font-bold text-lg">{summary?.currentStreak || 0}</span>
            <span className="text-sm text-muted-foreground uppercase tracking-wider">Day Streak</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Main Focus: Today's Action */}
        <div className="md:col-span-8 space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> Today's Objective
            </h2>
            
            {loadingSummary ? (
              <Skeleton className="h-[200px] w-full rounded-2xl" />
            ) : summary?.nextWorkout?.hasWorkout && summary.nextWorkout.workout ? (
              <div className="bg-card border border-primary/30 p-6 md:p-8 rounded-3xl shadow-lg shadow-primary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider rounded-full mb-3">
                      Scheduled
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{summary.nextWorkout.workout.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {summary.nextWorkout.workout.durationMinutes} min</span>
                      <span className="flex items-center gap-1"><Activity className="h-4 w-4" /> {summary.nextWorkout.workout.difficulty}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      onClick={() => handleQuickComplete(
                        summary.nextWorkout!.workout!.id, 
                        summary.nextWorkout!.workout!.name,
                        summary.nextWorkout!.workout!.durationMinutes || 45
                      )}
                      disabled={completeWorkout.isPending}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Quick Log
                    </Button>
                    <Link href={`/workouts/${summary.nextWorkout.workout.id}`}>
                      <Button className="w-full text-black font-bold">Start Workout</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border border-dashed p-8 rounded-3xl text-center flex flex-col items-center">
                <div className="h-16 w-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Rest Day</h3>
                <p className="text-muted-foreground max-w-md mb-6">No scheduled workout for today. Focus on recovery and mobility.</p>
                <Link href="/workouts">
                  <Button variant="secondary">Browse Workouts</Button>
                </Link>
              </div>
            )}
          </section>

          {/* Key Metrics Row */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Workouts", val: `${summary?.workoutsThisWeek || 0}/${summary?.weeklyTarget || 4}`, icon: Activity },
              { label: "Minutes", val: summary?.totalMinutes || 0, icon: Clock },
              { label: "Calories", val: summary?.caloriesBurned || 0, icon: Flame },
              { label: "Streak", val: summary?.currentStreak || 0, icon: Target },
            ].map((stat, i) => (
              <div key={i} className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-between h-32 hover-elevate transition-all">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono">{loadingSummary ? "-" : stat.val}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Sidebar Data */}
        <div className="md:col-span-4 space-y-6">
          {/* Nutrition Mini */}
          <div className="bg-card border border-border p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" /> Fuel
              </h3>
              <Link href="/nutrition" className="text-xs text-muted-foreground hover:text-primary">Details</Link>
            </div>
            
            {loadingSummary ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-bold font-mono">{summary?.nutritionToday.totalCalories || 0}</span>
                  <span className="text-muted-foreground pb-1">/ {summary?.nutritionToday.calorieGoal || 2500} kcal</span>
                </div>
                
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${Math.min(100, ((summary?.nutritionToday.totalCalories || 0) / (summary?.nutritionToday.calorieGoal || 2500)) * 100)}%` }} 
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div>
                    <div className="font-bold">{summary?.nutritionToday.totalProtein || 0}g</div>
                    <div className="text-muted-foreground">Protein</div>
                  </div>
                  <div>
                    <div className="font-bold">{summary?.nutritionToday.totalCarbs || 0}g</div>
                    <div className="text-muted-foreground">Carbs</div>
                  </div>
                  <div>
                    <div className="font-bold">{summary?.nutritionToday.totalFat || 0}g</div>
                    <div className="text-muted-foreground">Fat</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="bg-card border border-border p-6 rounded-3xl">
            <h3 className="font-bold mb-6">Recent Activity</h3>
            {loadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-6">
                {activity.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex gap-4 items-start">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <div className="text-sm font-medium leading-none mb-1">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 opacity-50 uppercase tracking-wider">
                        {format(new Date(item.occurredAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No recent activity. Get to work.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
