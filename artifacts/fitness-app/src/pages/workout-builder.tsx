import React, { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import {
  useGetWorkout,
  getGetWorkoutQueryKey,
  useCreateWorkout,
  useUpdateWorkout,
  useListExercises,
  getListExercisesQueryKey,
} from "@workspace/api-client-react";
import {
  ArrowLeft, Plus, Search, Trash2, GripVertical, Save,
  ChevronDown, ChevronUp, Dumbbell, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ExerciseRow = {
  exerciseId: number;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  weightKg?: number;
  restSeconds: number;
  tempo: string;
  notes: string;
};

const GOALS = [
  { value: "fat_loss", label: "Fat Loss" },
  { value: "muscle_gain", label: "Muscle Gain" },
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "general_fitness", label: "General Fitness" },
  { value: "mobility", label: "Mobility" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CATEGORIES = ["Strength", "Hypertrophy", "Endurance", "HIIT", "Mobility", "Full Body", "Push/Pull/Legs", "Upper/Lower"];

export default function WorkoutBuilderPage() {
  const [, params] = useRoute("/workouts/builder/:id");
  const editId = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("general_fitness");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [category, setCategory] = useState("Strength");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Exercise picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");

  // Load existing workout if editing
  const { data: existing } = useGetWorkout(editId!, { query: { enabled: !!editId, queryKey: getGetWorkoutQueryKey(editId!) } });
  const createWorkout = useCreateWorkout();
  const updateWorkout = useUpdateWorkout();

  // Exercise search
  const { data: exerciseResults } = useListExercises(
    { search: search || undefined, muscleGroup: muscleFilter !== "all" ? muscleFilter : undefined, limit: 30 },
    { query: { enabled: pickerOpen, queryKey: getListExercisesQueryKey({ search: search || undefined, muscleGroup: muscleFilter !== "all" ? muscleFilter : undefined, limit: 30 }) } }
  );

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description || "");
      setGoal((existing as any).goal || "general_fitness");
      setDifficulty(existing.difficulty || "intermediate");
      setCategory(existing.category || "Strength");
      setDurationMinutes(existing.durationMinutes || 45);
      setExercises(
        (existing.exercises || []).map(e => ({
          exerciseId: e.exerciseId,
          name: e.name,
          sets: e.sets || 3,
          repsMin: (e as any).repsMin || e.reps || 8,
          repsMax: (e as any).repsMax || e.reps || 12,
          weightKg: (e as any).weightKg || undefined,
          restSeconds: e.restSeconds || 90,
          tempo: (e as any).tempo || "",
          notes: e.notes || "",
        }))
      );
    }
  }, [existing]);

  const addExercise = (ex: { id: number; name: string }) => {
    setExercises(prev => [...prev, {
      exerciseId: ex.id,
      name: ex.name,
      sets: 3,
      repsMin: 8,
      repsMax: 12,
      restSeconds: 90,
      tempo: "",
      notes: "",
    }]);
    setPickerOpen(false);
    setSearch("");
    setExpandedIdx(exercises.length);
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateExercise = (idx: number, field: keyof ExerciseRow, value: string | number) => {
    setExercises(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const moveExercise = (idx: number, dir: -1 | 1) => {
    const newArr = [...exercises];
    const target = idx + dir;
    if (target < 0 || target >= newArr.length) return;
    [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
    setExercises(newArr);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (exercises.length === 0) {
      toast({ variant: "destructive", title: "Add at least one exercise" });
      return;
    }

    const payload = {
      name,
      description,
      goal,
      difficulty,
      category,
      durationMinutes,
      exercises: exercises.map((e, i) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        orderIndex: i,
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        weightKg: e.weightKg,
        restSeconds: e.restSeconds,
        tempo: e.tempo || null,
        notes: e.notes || null,
      })),
    };

    if (editId) {
      updateWorkout.mutate(
        { id: editId, data: payload as any },
        {
          onSuccess: () => {
            toast({ title: "Workout updated" });
            setLocation(`/workouts/${editId}`);
          },
          onError: () => toast({ variant: "destructive", title: "Failed to save" }),
        }
      );
    } else {
      createWorkout.mutate(
        { data: payload as any },
        {
          onSuccess: (data) => {
            toast({ title: "Workout created" });
            setLocation(`/workouts/${data.id}`);
          },
          onError: () => toast({ variant: "destructive", title: "Failed to save" }),
        }
      );
    }
  };

  const isSaving = createWorkout.isPending || updateWorkout.isPending;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/workouts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="font-bold text-lg">{editId ? "Edit Workout" : "Build Workout"}</h1>
          <Button onClick={handleSave} disabled={isSaving} size="sm" className="font-bold text-black">
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Plan Details */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Plan Details</h2>

          <div className="space-y-3">
            <label className="text-sm font-medium">Workout Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Push Day A, Full Body Monday"
              className="bg-background"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this workout for?"
              className="bg-background resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Goal</label>
              <Select value={goal} onValueChange={setGoal}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GOALS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration (min)</label>
              <Input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="bg-background"
                min={5}
                max={240}
              />
            </div>
          </div>
        </section>

        {/* Exercise List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Exercises <span className="text-muted-foreground text-sm font-normal">({exercises.length})</span></h2>
            <Button onClick={() => setPickerOpen(true)} size="sm" variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Add Exercise
            </Button>
          </div>

          {exercises.length === 0 ? (
            <div
              onClick={() => setPickerOpen(true)}
              className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Dumbbell className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium">Add your first exercise</p>
              <p className="text-sm text-muted-foreground">Tap to browse the exercise library</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exercises.map((ex, idx) => (
                <div key={idx} className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Row header */}
                  <div className="flex items-center gap-3 p-4">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveExercise(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <button onClick={() => moveExercise(idx, 1)} disabled={idx === exercises.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{idx + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ex.sets} sets · {ex.repsMin}–{ex.repsMax} reps · {Math.round(ex.restSeconds / 60)}min rest
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {expandedIdx === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => removeExercise(idx)} className="text-muted-foreground hover:text-destructive p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded editor */}
                  {expandedIdx === idx && (
                    <div className="border-t border-border bg-background/50 p-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Sets</label>
                          <Input
                            type="number"
                            value={ex.sets}
                            onChange={e => updateExercise(idx, "sets", parseInt(e.target.value))}
                            className="bg-background"
                            min={1}
                            max={20}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Reps Min</label>
                          <Input
                            type="number"
                            value={ex.repsMin}
                            onChange={e => updateExercise(idx, "repsMin", parseInt(e.target.value))}
                            className="bg-background"
                            min={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Reps Max</label>
                          <Input
                            type="number"
                            value={ex.repsMax}
                            onChange={e => updateExercise(idx, "repsMax", parseInt(e.target.value))}
                            className="bg-background"
                            min={1}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Rest (sec)</label>
                          <Input
                            type="number"
                            value={ex.restSeconds}
                            onChange={e => updateExercise(idx, "restSeconds", parseInt(e.target.value))}
                            className="bg-background"
                            min={0}
                            step={15}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Weight (kg)</label>
                          <Input
                            type="number"
                            value={ex.weightKg || ""}
                            onChange={e => updateExercise(idx, "weightKg", parseFloat(e.target.value) || 0)}
                            placeholder="Optional"
                            className="bg-background"
                            min={0}
                            step={0.5}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Tempo</label>
                          <Input
                            value={ex.tempo}
                            onChange={e => updateExercise(idx, "tempo", e.target.value)}
                            placeholder="e.g. 3-1-2-0"
                            className="bg-background"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs text-muted-foreground font-medium">Notes</label>
                          <Input
                            value={ex.notes}
                            onChange={e => updateExercise(idx, "notes", e.target.value)}
                            placeholder="Coaching cues, form notes…"
                            className="bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {exercises.length > 0 && (
            <Button onClick={() => setPickerOpen(true)} variant="outline" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add Another Exercise
            </Button>
          )}
        </section>
      </div>

      {/* Exercise Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-card border border-border rounded-t-3xl md:rounded-2xl w-full md:max-w-lg max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold text-lg">Add Exercise</h3>
              <button onClick={() => { setPickerOpen(false); setSearch(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search + filter */}
            <div className="p-4 space-y-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search exercises…"
                  className="pl-9 bg-background"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {["all", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"].map(m => (
                  <button
                    key={m}
                    onClick={() => setMuscleFilter(m)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                      muscleFilter === m
                        ? "bg-primary text-black"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m === "all" ? "All" : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {((exerciseResults as any)?.exercises ?? exerciseResults ?? []).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {search ? "No exercises found" : "Loading…"}
                </div>
              ) : (
                ((exerciseResults as any)?.exercises ?? (exerciseResults as unknown as any[]) ?? []).map((ex: any) => {
                  const alreadyAdded = exercises.some(e => e.exerciseId === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => !alreadyAdded && addExercise(ex)}
                      disabled={alreadyAdded}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 border-b border-border/50 text-left transition-colors",
                        alreadyAdded
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">{ex.category} · {ex.difficulty}</p>
                      </div>
                      {alreadyAdded ? (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
