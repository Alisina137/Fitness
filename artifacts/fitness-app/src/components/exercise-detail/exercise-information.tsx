import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Exercise } from "@workspace/api-client-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  intermediate: "bg-amber-500/15  text-amber-400  border-amber-500/25",
  advanced:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  expert:       "bg-red-500/15    text-red-400    border-red-500/25",
};

const EQUIPMENT_STYLE = "bg-secondary text-foreground border-border";

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function InfoValue({ children }: { children: React.ReactNode }) {
  return <span className="text-sm text-foreground">{children}</span>;
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <InfoLabel>{label}</InfoLabel>
      {children}
    </div>
  );
}

function NotSpecified() {
  return <InfoValue><span className="text-muted-foreground italic">Not specified</span></InfoValue>;
}

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit",
        className,
      )}
    >
      {children}
    </span>
  );
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ExerciseInformationProps {
  exercise: Exercise;
}

export function ExerciseInformation({ exercise }: ExerciseInformationProps) {
  const difficultyKey = exercise.difficulty?.toLowerCase() ?? "";
  const difficultyStyle =
    DIFFICULTY_STYLES[difficultyKey] ?? "bg-muted text-muted-foreground border-border";
  const difficultyLabel = difficultyKey ? capitalize(difficultyKey) : null;

  const equipmentList = exercise.equipment ?? [];
  const trainingType = exercise.trainingType
    ? capitalize(exercise.trainingType)
    : null;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5">
      {/* Section heading */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5" />
        Exercise Information
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Equipment */}
        <InfoRow label="Equipment">
          {equipmentList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {equipmentList.map((item) => (
                <Badge key={item} className={EQUIPMENT_STYLE}>
                  {capitalize(item)}
                </Badge>
              ))}
            </div>
          ) : (
            <InfoValue>Bodyweight</InfoValue>
          )}
        </InfoRow>

        {/* Difficulty */}
        <InfoRow label="Difficulty">
          {difficultyLabel ? (
            <Badge className={difficultyStyle}>{difficultyLabel}</Badge>
          ) : (
            <NotSpecified />
          )}
        </InfoRow>

        {/* Category */}
        <InfoRow label="Category">
          {exercise.category ? (
            <InfoValue>{capitalize(exercise.category)}</InfoValue>
          ) : (
            <NotSpecified />
          )}
        </InfoRow>

        {/* Training Type (closest to "Exercise Type") */}
        <InfoRow label="Training Type">
          {trainingType ? (
            <InfoValue>{trainingType}</InfoValue>
          ) : (
            <NotSpecified />
          )}
        </InfoRow>

        {/* Force Type — not in current model */}
        <InfoRow label="Force Type">
          <NotSpecified />
        </InfoRow>

        {/* Mechanics — not in current model */}
        <InfoRow label="Mechanics">
          <NotSpecified />
        </InfoRow>

        {/* Experience Level — maps to difficulty */}
        <InfoRow label="Experience Level">
          {difficultyLabel ? (
            <InfoValue>{difficultyLabel}</InfoValue>
          ) : (
            <NotSpecified />
          )}
        </InfoRow>
      </div>
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseInformationSkeleton() {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5 animate-pulse">
      <div className="h-3 w-36 bg-secondary rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
