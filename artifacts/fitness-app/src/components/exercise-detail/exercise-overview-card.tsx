import React from "react";
import { Users, Dumbbell, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@workspace/api-client-react";

// ─── Difficulty styles (mirrors exercise-card.tsx) ────────────────────────────

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  intermediate: "bg-amber-500/15  text-amber-400  border-amber-500/25",
  advanced:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  expert:       "bg-red-500/15    text-red-400    border-red-500/25",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function OverviewItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ExerciseOverviewCardProps {
  exercise: Exercise;
}

export function ExerciseOverviewCard({ exercise }: ExerciseOverviewCardProps) {
  const primaryMuscle =
    exercise.primaryMuscles?.[0] ?? exercise.muscleGroups?.[0] ?? "—";
  const equipmentLabel = exercise.equipment?.length
    ? exercise.equipment.join(", ")
    : "Bodyweight";
  const difficultyKey = exercise.difficulty?.toLowerCase() ?? "";
  const difficultyStyle =
    DIFFICULTY_STYLES[difficultyKey] ??
    "bg-muted text-muted-foreground border-border";
  const difficultyLabel =
    difficultyKey.charAt(0).toUpperCase() + difficultyKey.slice(1);

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Overview
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:divide-x sm:divide-border">
        {/* Primary Muscle */}
        <OverviewItem
          icon={<Users className="h-3.5 w-3.5 text-primary" />}
          label="Primary Muscle"
          value={primaryMuscle}
        />

        {/* Equipment */}
        <div className="sm:pl-5">
          <OverviewItem
            icon={<Dumbbell className="h-3.5 w-3.5 text-primary" />}
            label="Equipment"
            value={equipmentLabel}
          />
        </div>

        {/* Difficulty */}
        <div className="sm:pl-5 flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Difficulty
          </span>
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full border tracking-wide w-fit",
              difficultyStyle,
            )}
          >
            {difficultyLabel}
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseOverviewCardSkeleton() {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5 animate-pulse">
      <div className="h-3 w-16 bg-secondary rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-24 bg-secondary rounded" />
            <div className="h-4 w-32 bg-secondary rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
