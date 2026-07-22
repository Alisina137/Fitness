import React, { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { 
  useGetWorkout,
  getGetWorkoutQueryKey,
  useCompleteWorkout,
  useUpdateWorkout,
} from "@workspace/api-client-react";
import { 
  ArrowLeft, 
  Clock, 
  Activity, 
  Play, 
  CheckCircle2, 
  Info,
  Dumbbell,
  LayoutTemplate
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SaveAsTemplateDialog } from "@/components/save-as-template-dialog";
import { useToast } from "@/hooks/use-toast";

export default function WorkoutDetailPage() {
  const [, params] = useRoute("/workouts/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: workout, isLoading, refetch } = useGetWorkout(id, {
    query: { enabled: !!id, queryKey: getGetWorkoutQueryKey(id) }
  });
  
  const completeWorkout = useCompleteWorkout();

  // Save-as-template dialog state
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);

  // Local state for active workout tracking
  const [isActive, setIsActive] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Set<number>>(new Set());
  const [startTime, setStartTime] = useState<number | null>(null);

  const startWorkout = () => {
    setIsActive(true);
    setStartTime(Date.now());
    setCompletedExercises(new Set());
  };

  const toggleExercise = (index: number) => {
    if (!isActive) return;
    const newSet = new Set(completedExercises);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setCompletedExercises(newSet);
  };

  const finishWorkout = () => {
    if (!startTime) return;
    
    const durationMs = Date.now() - startTime;
    const durationMinutes = Math.round(durationMs / 60000);
    // Rough estimate if duration is too short (just clicking through)
    const finalDuration = durationMinutes < 1 ? (workout?.durationMinutes || 30) : durationMinutes;
    
    completeWorkout.mutate({
      id,
      data: {
        durationMinutes: finalDuration,
        caloriesBurned: Math.round(finalDuration * 8),
        rating: 4,
        notes: `Completed ${completedExercises.size}/${workout?.exercises.length} exercises`
      }
    }, {
      onSuccess: () => {
        setIsActive(false);
        setStartTime(null);
        toast({ 
          title: "Workout Complete!", 
          description: `Logged ${finalDuration} minutes. Great work.`
        });
        setLocation("/dashboard");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32 mb-8" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="space-y-4 pt-8">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!workout) return <div>Workout not found</div>;

  const allCompleted = workout.exercises && completedExercises.size === workout.exercises.length;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <Link href="/workouts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          
          {isActive && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono bg-secondary px-3 py-1 rounded-full">
                {completedExercises.size} / {workout.exercises.length}
              </span>
              <Button 
                onClick={finishWorkout} 
                disabled={completeWorkout.isPending}
                className={cn(
                  "font-bold transition-all",
                  allCompleted ? "bg-primary text-black" : "bg-destructive text-white"
                )}
              >
                {completeWorkout.isPending ? "Logging..." : (allCompleted ? "Finish" : "End Early")}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in">
        {/* Workout Meta */}
        <div className="space-y-6">
          <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider rounded-full">
            {workout.category || "Protocol"}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{workout.name}</h1>
          {workout.description && (
            <p className="text-lg text-muted-foreground max-w-2xl">{workout.description}</p>
          )}
          
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Clock className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">{workout.durationMinutes} min</div>
                <div className="text-xs uppercase tracking-wider">Duration</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Activity className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground capitalize">{workout.difficulty}</div>
                <div className="text-xs uppercase tracking-wider">Intensity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        {!isActive && (
          <div className="bg-card border border-border p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-muted-foreground text-sm">
              <span className="font-bold text-foreground">{workout.exercises?.length || 0}</span> movements loaded.
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setIsTemplateOpen(true)}
                className="w-full sm:w-auto font-bold h-14 px-6"
              >
                <LayoutTemplate className="mr-2 h-5 w-5" /> Save as Template
              </Button>
              <Button size="lg" onClick={startWorkout} className="w-full sm:w-auto text-black font-bold text-lg h-14 px-8 shadow-lg shadow-primary/20">
                <Play className="mr-2 h-5 w-5 fill-current" /> Initialize Protocol
              </Button>
            </div>
          </div>
        )}

        <SaveAsTemplateDialog
          open={isTemplateOpen}
          onOpenChange={setIsTemplateOpen}
          workoutId={id}
          workoutName={workout.name}
        />

        {/* Exercises List */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> 
            Movements
          </h3>
          
          {workout.exercises && workout.exercises.length > 0 ? (
            <div className="space-y-3">
              {workout.exercises.map((ex, idx) => {
                const isDone = completedExercises.has(idx);
                return (
                  <div 
                    key={idx} 
                    className={cn(
                      "group p-4 md:p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row gap-4 items-start md:items-center",
                      isActive ? "cursor-pointer hover:border-primary/50" : "bg-card border-border",
                      isDone ? "border-primary bg-primary/5" : "border-border bg-card",
                      isActive && !isDone ? "hover-elevate" : ""
                    )}
                    onClick={() => toggleExercise(idx)}
                  >
                    {/* Completion styling overlay */}
                    {isDone && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
                    
                    <div className="flex items-center gap-4 flex-1 z-10">
                      <div className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        isDone ? "bg-primary text-black" : "bg-secondary text-muted-foreground"
                      )}>
                        {isDone ? <CheckCircle2 className="h-6 w-6" /> : <span className="font-bold text-lg">{idx + 1}</span>}
                      </div>
                      
                      <div>
                        <h4 className={cn(
                          "text-lg font-bold transition-colors",
                          isDone ? "text-primary" : "text-foreground"
                        )}>{ex.name}</h4>
                        {ex.notes && (
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Info className="h-3 w-3" /> {ex.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 z-10 pl-16 md:pl-0">
                      <div className="bg-background border border-border px-4 py-2 rounded-lg text-center min-w-[80px]">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Sets</div>
                        <div className="font-mono font-bold text-lg">{ex.sets}</div>
                      </div>
                      <div className="text-muted-foreground font-light text-xl">×</div>
                      <div className="bg-background border border-border px-4 py-2 rounded-lg text-center min-w-[80px]">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Reps</div>
                        <div className="font-mono font-bold text-lg">{ex.reps || '—'}</div>
                      </div>
                      {(ex.durationSeconds || ex.restSeconds) && (
                        <div className="bg-background border border-border px-4 py-2 rounded-lg text-center hidden sm:block">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Rest</div>
                          <div className="font-mono font-bold">{ex.restSeconds || 0}s</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-3xl border border-border border-dashed">
              <p className="text-muted-foreground">No exercises added to this protocol yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
