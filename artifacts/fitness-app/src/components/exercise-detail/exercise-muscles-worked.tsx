import React from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Exercise } from "@workspace/api-client-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ExerciseMusclesWorkedProps {
  exercise: Exercise;
}

export function ExerciseMusclesWorked({ exercise }: ExerciseMusclesWorkedProps) {
  const primary = exercise.primaryMuscles ?? [];
  const secondary = exercise.secondaryMuscles ?? [];
  const hasData = primary.length > 0 || secondary.length > 0;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5">
      {/* Section heading */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Zap className="h-3.5 w-3.5" />
        Muscles Worked
      </h2>

      {!hasData ? (
        <p className="text-sm text-muted-foreground">
          Muscle information is not available.
        </p>
      ) : (
        <div className="space-y-5">
          {/* Primary muscles */}
          {primary.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary
              </span>
              <div className="flex flex-wrap gap-2">
                {primary.map((muscle) => (
                  <span
                    key={muscle}
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border",
                      "bg-primary/15 text-primary border-primary/25",
                    )}
                  >
                    {capitalize(muscle)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Secondary muscles */}
          {secondary.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Secondary
              </span>
              <div className="flex flex-wrap gap-2">
                {secondary.map((muscle) => (
                  <span
                    key={muscle}
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                      "bg-secondary text-foreground border-border",
                    )}
                  >
                    {capitalize(muscle)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary line */}
          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            <span className="font-semibold text-foreground">Primary:</span>{" "}
            {primary.map(capitalize).join(", ") || "—"}
            {secondary.length > 0 && (
              <>
                {"  ·  "}
                <span className="font-semibold text-foreground">Secondary:</span>{" "}
                {secondary.map(capitalize).join(", ")}
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseMusclesWorkedSkeleton() {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5 animate-pulse">
      <div className="h-3 w-28 bg-secondary rounded" />
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-14 bg-secondary rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 bg-secondary rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
