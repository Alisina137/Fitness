import React from "react";
import { ListOrdered } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Exercise } from "@workspace/api-client-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Split a raw instructions string into individual step strings.
 * Strips leading numbering (e.g. "1.", "1)") so we can re-number uniformly.
 */
function parseSteps(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^\d+[.)]\s*/, ""));
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ExerciseInstructionsProps {
  exercise: Exercise;
}

export function ExerciseInstructions({ exercise }: ExerciseInstructionsProps) {
  const raw = exercise.instructions?.trim() ?? "";
  const steps = raw.length > 0 ? parseSteps(raw) : [];

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5">
      {/* Section heading */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <ListOrdered className="h-3.5 w-3.5" />
        Instructions
      </h2>

      {steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No instructions available.</p>
      ) : (
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              {/* Step number badge */}
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {index + 1}
              </span>
              {/* Step text */}
              <p className="text-sm leading-relaxed text-foreground">{step}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseInstructionsSkeleton() {
  const widths = ["w-full", "w-5/6", "w-full", "w-4/6"];
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5 animate-pulse">
      <div className="h-3 w-24 bg-secondary rounded" />
      <div className="space-y-4">
        {widths.map((w, i) => (
          <div key={i} className="flex gap-4 items-start">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className={`h-4 ${w} rounded`} />
          </div>
        ))}
      </div>
    </section>
  );
}
