import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useGetWorkout, useCompleteWorkout } from "@workspace/api-client-react";
import {
  ArrowLeft, CheckCircle2, Circle, ChevronRight, ChevronLeft,
  Timer, Pause, Play, SkipForward, X, Star, Flame, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SetLog = {
  setNumber: number;
  repsCompleted: number;
  weightKg: number;
  done: boolean;
};

type ExerciseLog = {
  exerciseId: number;
  name: string;
  sets: SetLog[];
  skipped: boolean;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const DIFFICULTY_LABELS = [
  { value: 1, label: "Very Easy", emoji: "😴" },
  { value: 2, label: "Easy", emoji: "🙂" },
  { value: 3, label: "Moderate", emoji: "💪" },
  { value: 4, label: "Hard", emoji: "🔥" },
  { value: 5, label: "Very Hard", emoji: "💀" },
];

export default function WorkoutActivePage() {
  const [, params] = useRoute("/workouts/:id/active");
  const workoutId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: workout, isLoading } = useGetWorkout(workoutId, { query: { enabled: !!workoutId } });
  const completeWorkout = useCompleteWorkout();

  // Session state
  const [phase, setPhase] = useState<"active" | "rest" | "feedback" | "done">("active");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState(() => new Date());

  // Timers
  const [elapsedSec, setElapsedSec] = useState(0);
  const [restSec, setRestSec] = useState(0);
  const [restTarget, setRestTarget] = useState(90);
  const [restPaused, setRestPaused] = useState(false);
  const restInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Feedback
  const [difficultyRating, setDifficultyRating] = useState(3);
  const [feedbackNotes, setFeedbackNotes] = useState("");

  // Initialise exercise logs from workout data
  useEffect(() => {
    if (workout?.exercises && exerciseLogs.length === 0) {
      setExerciseLogs(
        workout.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          skipped: false,
          sets: Array.from({ length: ex.sets || 3 }, (_, i) => ({
            setNumber: i + 1,
            repsCompleted: ex.repsMax || ex.reps || 10,
            weightKg: ex.weightKg || 0,
            done: false,
          })),
        }))
      );
    }
  }, [workout, exerciseLogs.length]);

  // Elapsed timer
  useEffect(() => {
    elapsedInterval.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => { if (elapsedInterval.current) clearInterval(elapsedInterval.current); };
  }, []);

  // Rest timer
  const startRest = useCallback((seconds: number) => {
    setRestTarget(seconds);
    setRestSec(seconds);
    setPhase("rest");
    setRestPaused(false);
    if (restInterval.current) clearInterval(restInterval.current);
    restInterval.current = setInterval(() => {
      setRestSec(s => {
        if (s <= 1) {
          clearInterval(restInterval.current!);
          setPhase("active");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const skipRest = () => {
    if (restInterval.current) clearInterval(restInterval.current);
    setPhase("active");
    setRestSec(0);
  };

  const toggleRestPause = () => {
    if (restPaused) {
      restInterval.current = setInterval(() => {
        setRestSec(s => {
          if (s <= 1) { clearInterval(restInterval.current!); setPhase("active"); return 0; }
          return s - 1;
        });
      }, 1000);
    } else {
      if (restInterval.current) clearInterval(restInterval.current);
    }
    setRestPaused(p => !p);
  };

  const currentExercise = exerciseLogs[currentIdx];
  const totalExercises = exerciseLogs.length;

  const completeSet = (setIdx: number) => {
    setExerciseLogs(prev => {
      const updated = prev.map((ex, ei) => {
        if (ei !== currentIdx) return ex;
        const sets = ex.sets.map((s, si) => si === setIdx ? { ...s, done: true } : s);
        return { ...ex, sets };
      });
      return updated;
    });

    const ex = exerciseLogs[currentIdx];
    const isLastSet = setIdx === ex.sets.length - 1;
    const restSecs = workout?.exercises?.[currentIdx]?.restSeconds || 90;
    startRest(isLastSet && currentIdx < totalExercises - 1 ? restSecs : 30);
  };

  const updateSetValue = (setIdx: number, field: "repsCompleted" | "weightKg", val: number) => {
    setExerciseLogs(prev => prev.map((ex, ei) => {
      if (ei !== currentIdx) return ex;
      return { ...ex, sets: ex.sets.map((s, si) => si === setIdx ? { ...s, [field]: val } : s) };
    }));
  };

  const skipExercise = () => {
    setExerciseLogs(prev => prev.map((ex, ei) => ei === currentIdx ? { ...ex, skipped: true } : ex));
    if (currentIdx < totalExercises - 1) setCurrentIdx(i => i + 1);
    else setPhase("feedback");
  };

  const goNext = () => {
    if (currentIdx < totalExercises - 1) {
      setCurrentIdx(i => i + 1);
      if (restInterval.current) clearInterval(restInterval.current);
      setPhase("active");
    } else {
      setPhase("feedback");
    }
  };

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(i => i - 1);
      if (restInterval.current) clearInterval(restInterval.current);
      setPhase("active");
    }
  };

  const finishWorkout = () => {
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

    completeWorkout.mutate({
      id: workoutId,
      data: {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMinutes: Math.max(durationMinutes, 1),
        caloriesBurned: Math.round(Math.max(durationMinutes, 1) * 8),
        exercisesCompleted: exerciseLogs.map(ex => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          sets: ex.sets.filter(s => s.done).map(s => ({
            setNumber: s.setNumber,
            repsCompleted: s.repsCompleted,
            weightKg: s.weightKg,
            durationSeconds: 0,
            completedAt: new Date().toISOString(),
          })),
          skipped: ex.skipped,
        })),
        difficultyRating,
        rating: difficultyRating,
        notes: feedbackNotes,
      },
    }, {
      onSuccess: () => {
        setPhase("done");
        setTimeout(() => setLocation("/workouts"), 2500);
      },
      onError: () => toast({ variant: "destructive", title: "Failed to save session" }),
    });
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (isLoading || !workout || exerciseLogs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Preparing workout…</p>
        </div>
      </div>
    );
  }

  // ── Done Screen ───────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-8 space-y-6">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center animate-in zoom-in duration-500">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold">Workout Complete!</h1>
        <p className="text-muted-foreground">Outstanding work. Session logged and progress recorded.</p>
        <p className="text-sm text-muted-foreground">Redirecting to workouts…</p>
      </div>
    );
  }

  // ── Feedback Screen ───────────────────────────────────────────────────────────
  if (phase === "feedback") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-lg mx-auto w-full flex-1 flex flex-col p-6 md:p-8 space-y-8 justify-center">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">How was that?</h2>
            <p className="text-muted-foreground">Rate the difficulty to help your AI coach calibrate.</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {DIFFICULTY_LABELS.map(d => (
              <button
                key={d.value}
                onClick={() => setDifficultyRating(d.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                  difficultyRating === d.value
                    ? "border-primary bg-primary/10 scale-105"
                    : "border-border hover:border-border/80"
                )}
              >
                <span className="text-2xl">{d.emoji}</span>
                <span className="text-xs font-medium text-center leading-tight">{d.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={feedbackNotes}
              onChange={e => setFeedbackNotes(e.target.value)}
              placeholder="How did it feel? Any PRs? Tweaks needed?"
              className="w-full bg-card border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>

          {/* Session summary */}
          <div className="grid grid-cols-3 gap-4 bg-card border border-border rounded-2xl p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatTime(elapsedSec)}</div>
              <div className="text-xs text-muted-foreground mt-1">Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{exerciseLogs.filter(e => !e.skipped).length}</div>
              <div className="text-xs text-muted-foreground mt-1">Exercises</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{exerciseLogs.reduce((sum, ex) => sum + ex.sets.filter(s => s.done).length, 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">Sets Done</div>
            </div>
          </div>

          <Button
            onClick={finishWorkout}
            disabled={completeWorkout.isPending}
            className="w-full h-14 text-base font-bold text-black"
          >
            {completeWorkout.isPending ? "Saving…" : "Log Workout"}
          </Button>
        </div>
      </div>
    );
  }

  // ── Rest Timer ────────────────────────────────────────────────────────────────
  if (phase === "rest") {
    const progress = restSec / restTarget;
    const circumference = 2 * Math.PI * 54;

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 space-y-8">
        <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wider">Rest</h2>

        <div className="relative h-40 w-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold font-mono tabular-nums">{formatTime(restSec)}</span>
          </div>
        </div>

        <p className="text-center text-muted-foreground">
          Next: <span className="font-semibold text-foreground">{currentIdx < totalExercises - 1 ? exerciseLogs[currentIdx + 1]?.name : "Feedback"}</span>
        </p>

        <div className="flex gap-4">
          <Button onClick={toggleRestPause} variant="outline" size="lg" className="gap-2">
            {restPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            {restPaused ? "Resume" : "Pause"}
          </Button>
          <Button onClick={skipRest} size="lg" className="gap-2 text-black font-bold">
            <SkipForward className="h-5 w-5" /> Skip Rest
          </Button>
        </div>

        {/* Total timer */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          {formatTime(elapsedSec)} elapsed
        </div>
      </div>
    );
  }

  // ── Active Workout ────────────────────────────────────────────────────────────
  const doneSets = currentExercise?.sets.filter(s => s.done).length || 0;
  const totalSets = currentExercise?.sets.length || 0;
  const exerciseMeta = workout.exercises?.[currentIdx];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/workouts/${workoutId}`} className="text-sm text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </Link>

          <div className="flex items-center gap-3">
            {/* Progress pips */}
            <div className="flex gap-1">
              {exerciseLogs.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === currentIdx ? "w-6 bg-primary" :
                    exerciseLogs[i].sets.every(s => s.done) ? "w-3 bg-primary/60" : "w-3 bg-border"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
            <Timer className="h-4 w-4" />
            {formatTime(elapsedSec)}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Exercise header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Exercise {currentIdx + 1} of {totalExercises}
            </span>
            <Button onClick={skipExercise} variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
              <SkipForward className="h-3 w-3" /> Skip
            </Button>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold">{currentExercise?.name}</h1>

          {exerciseMeta?.notes && (
            <p className="text-sm text-muted-foreground bg-secondary/50 rounded-xl px-4 py-2.5">
              💡 {exerciseMeta.notes}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="bg-secondary rounded-xl px-4 py-2 text-sm font-medium">
              {totalSets} sets
            </div>
            {exerciseMeta?.repsMin && (
              <div className="bg-secondary rounded-xl px-4 py-2 text-sm font-medium">
                {exerciseMeta.repsMin}–{exerciseMeta.repsMax} reps
              </div>
            )}
            {exerciseMeta?.restSeconds && (
              <div className="bg-secondary rounded-xl px-4 py-2 text-sm font-medium">
                {exerciseMeta.restSeconds}s rest
              </div>
            )}
            {exerciseMeta?.tempo && (
              <div className="bg-secondary rounded-xl px-4 py-2 text-sm font-medium font-mono">
                {exerciseMeta.tempo}
              </div>
            )}
          </div>
        </div>

        {/* Set tracker */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Sets</h2>
            <span className="text-sm text-muted-foreground">{doneSets}/{totalSets} done</span>
          </div>

          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <span>#</span>
              <span>Reps</span>
              <span>Weight (kg)</span>
              <span></span>
            </div>

            {currentExercise?.sets.map((set, si) => (
              <div
                key={si}
                className={cn(
                  "grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 items-center p-3 rounded-xl border transition-colors",
                  set.done
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card border-border"
                )}
              >
                <span className={cn("text-sm font-bold", set.done ? "text-primary" : "text-muted-foreground")}>
                  {si + 1}
                </span>
                <Input
                  type="number"
                  value={set.repsCompleted}
                  onChange={e => updateSetValue(si, "repsCompleted", parseInt(e.target.value) || 0)}
                  disabled={set.done}
                  className="h-9 bg-background disabled:opacity-70"
                  min={0}
                />
                <Input
                  type="number"
                  value={set.weightKg || ""}
                  onChange={e => updateSetValue(si, "weightKg", parseFloat(e.target.value) || 0)}
                  disabled={set.done}
                  placeholder="0"
                  className="h-9 bg-background disabled:opacity-70"
                  min={0}
                  step={0.5}
                />
                <button
                  onClick={() => !set.done && completeSet(si)}
                  disabled={set.done}
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center transition-all border",
                    set.done
                      ? "bg-primary border-primary text-black"
                      : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {set.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center gap-3">
          <Button
            onClick={goPrev}
            disabled={currentIdx === 0}
            variant="outline"
            size="lg"
            className="flex-1 gap-2"
          >
            <ChevronLeft className="h-5 w-5" /> Previous
          </Button>

          <Button
            onClick={goNext}
            size="lg"
            className={cn(
              "flex-1 gap-2 font-bold",
              currentIdx === totalExercises - 1 ? "bg-primary text-black" : ""
            )}
          >
            {currentIdx === totalExercises - 1 ? (
              <><Flame className="h-5 w-5" /> Finish</>
            ) : (
              <>Next <ChevronRight className="h-5 w-5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
