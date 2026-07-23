import React from "react";
import { useLocation } from "wouter";
import { Dumbbell, Zap, Users, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExerciseCardData = {
  id: number;
  name: string;
  category: string;
  difficulty: string;
  primaryMuscles: string[];
  muscleGroups?: string[];
  equipment: string[];
  shortDescription?: string | null;
  isFavorite?: boolean;
};

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  intermediate: "bg-amber-500/15  text-amber-400  border-amber-500/25",
  advanced:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  expert:       "bg-red-500/15    text-red-400    border-red-500/25",
};

function difficultyLabel(d: string) {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const key = difficulty.toLowerCase();
  const style = DIFFICULTY_STYLES[key] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border tracking-wide",
        style,
      )}
    >
      {difficultyLabel(difficulty)}
    </span>
  );
}

// ─── Equipment badge ──────────────────────────────────────────────────────────

function EquipmentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-secondary text-secondary-foreground">
      <Dumbbell className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse flex flex-col">
      <div className="p-5 flex-1 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="h-5 w-20 bg-secondary rounded-full" />
          <div className="h-5 w-5 bg-secondary rounded-full" />
        </div>
        <div className="space-y-1.5">
          <div className="h-5 w-3/4 bg-secondary rounded" />
          <div className="h-4 w-1/2 bg-secondary rounded" />
        </div>
      </div>
      <div className="px-5 pb-4 pt-0 flex items-center gap-2">
        <div className="h-5 w-16 bg-secondary rounded-md" />
        <div className="h-5 w-20 bg-secondary rounded-md" />
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: ExerciseCardData;
  /** Optimistic override — pass when the parent manages local favorite state */
  isFavoriteOverride?: boolean;
  onToggleFavorite?: (id: number) => void;
  isPending?: boolean;
}

export function ExerciseCard({
  exercise,
  isFavoriteOverride,
  onToggleFavorite,
  isPending = false,
}: ExerciseCardProps) {
  const [, setLocation] = useLocation();

  const primaryMuscle = exercise.primaryMuscles?.[0] ?? exercise.muscleGroups?.[0] ?? null;
  const equipmentList = exercise.equipment?.length ? exercise.equipment : ["Bodyweight"];
  const isFav = isFavoriteOverride !== undefined ? isFavoriteOverride : (exercise.isFavorite ?? false);

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={() => setLocation(`/exercises/${exercise.id}`)}
        className="w-full text-left bg-card border border-border rounded-2xl overflow-hidden
                   hover:border-primary/50 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5
                   transition-all duration-200 flex flex-col focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                   focus-visible:ring-offset-background"
      >
        {/* Body */}
        <div className="p-5 flex-1 space-y-3">
          {/* Difficulty + muscle row */}
          <div className="flex items-center justify-between gap-2 min-h-[24px]">
            <DifficultyBadge difficulty={exercise.difficulty} />
            {primaryMuscle && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium shrink-0 pr-6">
                <Users className="h-3 w-3" />
                {primaryMuscle}
              </span>
            )}
          </div>

          {/* Name + category */}
          <div>
            <h3 className="text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
              {exercise.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {exercise.category}
            </p>
          </div>
        </div>

        {/* Equipment footer */}
        <div className="px-5 pb-4 flex items-center gap-1.5 flex-wrap">
          {equipmentList.slice(0, 3).map((eq) => (
            <EquipmentBadge key={eq} label={eq} />
          ))}
          {equipmentList.length > 3 && (
            <span className="text-[11px] text-muted-foreground">
              +{equipmentList.length - 3}
            </span>
          )}
        </div>
      </button>

      {/* Favorite button — floats over the top-right corner */}
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(exercise.id);
          }}
          disabled={isPending}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-full transition-all",
            "bg-card/80 backdrop-blur-sm border border-border/50",
            "hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
            isFav ? "text-rose-500" : "text-muted-foreground hover:text-rose-500",
          )}
        >
          <Heart
            className={cn("h-4 w-4 transition-all", isFav && "fill-rose-500")}
          />
        </button>
      )}
    </div>
  );
}
