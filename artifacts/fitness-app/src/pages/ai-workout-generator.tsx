import React, { useState, useCallback } from "react";
import { Link } from "wouter";
import {
  Sparkles, Zap, RefreshCw, Save, ChevronDown, ChevronUp,
  Dumbbell, Clock, Flame, Calendar, CheckCircle, RotateCcw,
  ArrowRight, Info, Trophy, Target, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type GeneratedExercise = {
  exerciseId: number;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  tempo?: string;
  estimatedCaloriesPerSet: number;
  muscleGroups: string[];
  equipment: string[];
  reasoning: string;
};

type GeneratedDay = {
  dayOfWeek: number;
  dayName: string;
  title: string;
  focusArea: string;
  estimatedDurationMinutes: number;
  estimatedCalories: number;
  exercises: GeneratedExercise[];
  reasoning: string;
};

type ScoreBreakdown = {
  goalMatch: number;
  equipmentMatch: number;
  levelMatch: number;
  historyScore: number;
  profileComplete: number;
  total: number;
  improvementTips: string[];
};

type GeneratedPlan = {
  name: string;
  description: string;
  goal: string;
  split: string;
  durationWeeks: number;
  difficulty: string;
  days: GeneratedDay[];
  overallReasoning: string;
  adaptationNotes: string;
  progressionRecommendation: string;
};

type GenerationResult = {
  generationId: number;
  plan: GeneratedPlan;
  personalizationScore: number;
  scoreBreakdown: ScoreBreakdown;
  cached?: boolean;
};

type HistoryItem = {
  id: number;
  name: string;
  goal: string;
  split: string;
  personalizationScore: number | null;
  status: string;
  workoutPlanId: number | null;
  createdAt: string;
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? "#84cc16" : score >= 65 ? "#eab308" : "#f97316";

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-black" style={{ color }}>{score}%</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Match</div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  goal,
  onReplace,
  replacing,
}: {
  exercise: GeneratedExercise;
  goal: string;
  onReplace: (ex: GeneratedExercise) => void;
  replacing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const restLabel = exercise.restSeconds >= 60
    ? `${Math.round(exercise.restSeconds / 60)}m rest`
    : `${exercise.restSeconds}s rest`;

  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-secondary/30 transition-colors"
      >
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Dumbbell className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{exercise.name}</div>
          <div className="text-xs text-muted-foreground">
            {exercise.sets} × {exercise.repsMin}–{exercise.repsMax} reps · {restLabel}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {exercise.muscleGroups.slice(0, 1).map((m) => (
            <span key={m} className="hidden sm:inline text-[10px] px-2 py-0.5 bg-secondary rounded-full text-muted-foreground font-medium">{m}</span>
          ))}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary/50 rounded-xl p-2">
              <div className="text-sm font-bold">{exercise.sets}</div>
              <div className="text-[10px] text-muted-foreground">Sets</div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-2">
              <div className="text-sm font-bold">{exercise.repsMin}–{exercise.repsMax}</div>
              <div className="text-[10px] text-muted-foreground">Reps</div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-2">
              <div className="text-sm font-bold">{restLabel}</div>
              <div className="text-[10px] text-muted-foreground">Rest</div>
            </div>
          </div>

          {exercise.tempo && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Tempo:</span> {exercise.tempo}
              <span className="ml-1 text-[10px]">(eccentric-pause-concentric-pause)</span>
            </div>
          )}

          {/* Muscle groups */}
          {exercise.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {exercise.muscleGroups.map((m) => (
                <span key={m} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">{m}</span>
              ))}
            </div>
          )}

          {/* AI reasoning */}
          <div className="flex gap-2 bg-card border border-border rounded-xl p-3">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{exercise.reasoning}</p>
          </div>

          {/* Replace button */}
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8 border-dashed"
            onClick={() => onReplace(exercise)}
            disabled={replacing}
          >
            {replacing ? (
              <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Finding replacement…</>
            ) : (
              <><RotateCcw className="h-3 w-3 mr-1.5" /> Replace this exercise</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
  index,
  goal,
  onReplace,
  replacingId,
}: {
  day: GeneratedDay;
  index: number;
  goal: string;
  onReplace: (dayIndex: number, ex: GeneratedExercise) => void;
  replacingId: number | null;
}) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-secondary/20 transition-colors"
      >
        <div className="shrink-0 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center">
            <Calendar className="h-4 w-4 text-primary mb-0.5" />
            <span className="text-[9px] font-bold text-primary uppercase">{day.dayName.slice(0, 3)}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">{day.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{day.focusArea} · {day.exercises.length} exercises</div>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {day.estimatedDurationMinutes} min
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-500" /> ~{day.estimatedCalories} kcal
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{day.exercises.length} ex</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
          {/* Day reasoning */}
          <div className="flex gap-2 mb-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{day.reasoning}</p>
          </div>

          {day.exercises.map((ex) => (
            <ExerciseCard
              key={ex.exerciseId}
              exercise={ex}
              goal={goal}
              onReplace={(exercise) => onReplace(index, exercise)}
              replacing={replacingId === ex.exerciseId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-6">
          <div className="h-36 w-36 rounded-full bg-secondary" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-secondary rounded-xl w-3/4" />
            <div className="h-4 bg-secondary rounded-xl w-full" />
            <div className="h-4 bg-secondary rounded-xl w-2/3" />
          </div>
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border rounded-3xl h-24" />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiWorkoutGeneratorPage() {
  const { toast } = useToast();

  const [state, setState] = useState<"idle" | "generating" | "ready" | "saving">("idle");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<number | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const data = await apiFetch<HistoryItem[]>("/ai/workout/history");
      setHistory(data);
      setHistoryLoaded(true);
    } catch {
      // silently ignore
    }
  }, [historyLoaded]);

  const generate = useCallback(async (regenerate = false) => {
    setState("generating");
    setError(null);
    setSavedPlanId(null);
    try {
      const data = await apiFetch<GenerationResult>("/ai/workout/generate", {
        method: "POST",
        body: JSON.stringify({ regenerate }),
      });
      setResult(data);
      setState("ready");
      loadHistory();
      if (data.cached) {
        toast({ title: "Loaded recent plan", description: "Your plan was generated less than an hour ago." });
      }
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
      toast({ title: "Generation failed", description: (err as Error).message, variant: "destructive" });
    }
  }, [loadHistory, toast]);

  const handleReplace = useCallback(async (dayIndex: number, exercise: GeneratedExercise) => {
    if (!result) return;
    setReplacingId(exercise.exerciseId);
    try {
      const data = await apiFetch<{
        exercise: { exerciseId: number; name: string; muscleGroups: string[]; equipment: string[]; difficulty: string; category: string };
        reasoning: string;
      }>("/ai/workout/replace-exercise", {
        method: "POST",
        body: JSON.stringify({ exerciseId: exercise.exerciseId, goal: result.plan.goal }),
      });

      setResult((prev) => {
        if (!prev) return prev;
        const newDays = [...prev.plan.days];
        const day = { ...newDays[dayIndex] };
        day.exercises = day.exercises.map((ex) =>
          ex.exerciseId === exercise.exerciseId
            ? {
                ...ex,
                exerciseId: data.exercise.exerciseId,
                name: data.exercise.name,
                muscleGroups: data.exercise.muscleGroups,
                equipment: data.exercise.equipment,
                reasoning: data.reasoning,
              }
            : ex,
        );
        newDays[dayIndex] = day;
        return { ...prev, plan: { ...prev.plan, days: newDays } };
      });

      toast({ title: `Replaced with ${data.exercise.name}`, description: data.reasoning });
    } catch (err) {
      toast({ title: "Replacement failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReplacingId(null);
    }
  }, [result, toast]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setState("saving");
    try {
      const data = await apiFetch<{ workoutPlanId: number; message: string }>("/ai/workout/save", {
        method: "POST",
        body: JSON.stringify({ generationId: result.generationId }),
      });
      setSavedPlanId(data.workoutPlanId);
      setState("ready");
      loadHistory();
      toast({ title: "Plan saved!", description: "Your AI-generated workout is now in My Workouts." });
    } catch (err) {
      setState("ready");
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    }
  }, [result, loadHistory, toast]);

  // ── Idle state ──
  if (state === "idle") {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Hero */}
        <div className="relative bg-card border border-border rounded-3xl overflow-hidden p-8 md:p-12">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative space-y-6 text-center md:text-left md:flex md:items-center md:gap-10">
            <div className="md:flex-1">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 uppercase tracking-wider text-[10px] font-bold">
                <Sparkles className="h-3 w-3 mr-1" /> AI Powered
              </Badge>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Your Personal AI<br />
                <span className="text-primary">Strength Coach</span>
              </h1>
              <p className="text-muted-foreground mt-3 text-base leading-relaxed max-w-md">
                Generate a fully personalized workout program built around your goals, equipment, schedule, and performance history — in seconds.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="font-bold text-black h-14 px-8 text-base rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                  onClick={() => generate(false)}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Generate My Plan
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-6 rounded-2xl font-medium"
                  onClick={loadHistory}
                  asChild={false}
                >
                  <span onClick={loadHistory}>
                    <Calendar className="h-4 w-4 mr-2" />
                    View History
                  </span>
                </Button>
              </div>
            </div>

            {/* Feature pills */}
            <div className="hidden md:flex flex-col gap-3 shrink-0">
              {[
                { icon: Target, label: "Goal-optimized selection" },
                { icon: Dumbbell, label: "Equipment-aware filtering" },
                { icon: Trophy, label: "Progressive overload built-in" },
                { icon: CheckCircle, label: "Injury-safe programming" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 bg-secondary/50 rounded-2xl px-4 py-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex gap-3 bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-destructive text-sm">Generation failed</div>
              <div className="text-sm text-muted-foreground mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">Recent Plans</h2>
            {history.slice(0, 5).map((h) => (
              <div key={h.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{h.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {h.split} · {h.goal?.replace("_", " ")}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {h.personalizationScore != null && (
                    <span className="text-sm font-bold text-primary">{h.personalizationScore}%</span>
                  )}
                  {h.status === "saved" && h.workoutPlanId && (
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">Saved</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Generating state ──
  if (state === "generating") {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="text-center py-8 space-y-4">
          <div className="relative inline-flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary animate-pulse" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Building Your Program</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Analyzing your profile, history, and available exercises…
            </p>
          </div>
          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            {["Filtering exercises", "Optimizing split", "Applying AI reasoning"].map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" style={{ animationDelay: `${i * 0.3}s` }} />
                {step}
                {i < 2 && <span className="mx-1 opacity-40">·</span>}
              </span>
            ))}
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // ── Results / Saving state ──
  if (!result) return null;
  const { plan, personalizationScore, scoreBreakdown } = result;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-28 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{plan.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider">{plan.split}</Badge>
            <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">{plan.difficulty}</Badge>
            <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-wider">{plan.goal?.replace("_", " ")}</Badge>
            <span className="text-xs text-muted-foreground">{plan.durationWeeks} weeks</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => generate(true)}
            disabled={state === "saving"}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
          </Button>
        </div>
      </div>

      {/* Score + Overview card */}
      <div className="bg-card border border-border rounded-3xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Score ring */}
          <div className="flex flex-col items-center gap-2 shrink-0 mx-auto sm:mx-0">
            <ScoreRing score={personalizationScore} />
            <div className="text-xs text-muted-foreground font-medium">Personalization Score</div>
          </div>

          {/* Description + score breakdown */}
          <div className="flex-1 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>

            <div className="space-y-2">
              <ScoreBar label="Goal Match" value={scoreBreakdown.goalMatch} max={30} color="#84cc16" />
              <ScoreBar label="Equipment Match" value={scoreBreakdown.equipmentMatch} max={25} color="#3b82f6" />
              <ScoreBar label="Level Alignment" value={scoreBreakdown.levelMatch} max={20} color="#a855f7" />
              <ScoreBar label="Performance History" value={scoreBreakdown.historyScore} max={15} color="#f97316" />
              <ScoreBar label="Profile Completeness" value={scoreBreakdown.profileComplete} max={10} color="#ec4899" />
            </div>

            {scoreBreakdown.improvementTips.length > 0 && (
              <div className="bg-secondary/50 rounded-2xl p-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To improve your score</div>
                {scoreBreakdown.improvementTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    {tip}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="bg-card border border-primary/20 rounded-3xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">Why this program?</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{plan.overallReasoning}</p>
        {plan.adaptationNotes && (
          <div className="border-t border-border pt-3">
            <p className="text-xs text-muted-foreground italic">{plan.adaptationNotes}</p>
          </div>
        )}
        {plan.progressionRecommendation && (
          <div className="flex items-start gap-2 bg-primary/5 rounded-2xl p-3">
            <Trophy className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground font-medium">{plan.progressionRecommendation}</p>
          </div>
        )}
      </div>

      {/* Weekly schedule summary */}
      <div className="grid grid-cols-7 gap-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
          const isTraining = plan.days.some((day) => day.dayOfWeek === i);
          return (
            <div
              key={i}
              className={cn(
                "rounded-xl p-2 text-center flex flex-col items-center gap-1",
                isTraining ? "bg-primary/10 border border-primary/30" : "bg-secondary/30 border border-transparent",
              )}
            >
              <span className={cn("text-[10px] font-bold uppercase", isTraining ? "text-primary" : "text-muted-foreground")}>{d}</span>
              {isTraining ? (
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              ) : (
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {/* Day cards */}
      <div className="space-y-4">
        {plan.days.map((day, idx) => (
          <DayCard
            key={idx}
            day={day}
            index={idx}
            goal={plan.goal}
            onReplace={handleReplace}
            replacingId={replacingId}
          />
        ))}
      </div>

      {/* Bottom action bar */}
      <div className="fixed md:relative bottom-16 md:bottom-auto left-0 right-0 md:left-auto md:right-auto z-30 px-4 md:px-0 pb-4 md:pb-0">
        <div className="max-w-4xl mx-auto">
          {savedPlanId ? (
            <div className="flex gap-3">
              <div className="flex-1 bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <span className="font-semibold text-sm text-primary">Plan saved to My Workouts</span>
              </div>
              <Link href={`/workouts/${savedPlanId}`}>
                <Button className="h-full rounded-2xl font-bold text-black px-5">
                  Open <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="lg"
              className="w-full h-14 rounded-2xl font-bold text-black shadow-lg shadow-primary/20 text-base"
              onClick={handleSave}
              disabled={state === "saving"}
            >
              {state === "saving" ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-5 w-5 mr-2" /> Save This Plan</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
