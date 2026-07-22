import React from "react";
import { Tag } from "lucide-react";
import type { Exercise } from "@workspace/api-client-react";

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Tag className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ExerciseInfoSectionProps {
  exercise: Exercise;
}

export function ExerciseInfoSection({ exercise }: ExerciseInfoSectionProps) {
  const rows: { label: string; value: string }[] = [
    { label: "Category", value: exercise.category },
    ...(exercise.trainingType
      ? [{ label: "Training Type", value: exercise.trainingType }]
      : []),
  ];

  const hasDescription =
    exercise.shortDescription && exercise.shortDescription.trim().length > 0;

  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Information
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {rows.map(({ label, value }) => (
          <InfoRow key={label} label={label} value={value} />
        ))}

        {hasDescription && (
          <div className="sm:col-span-2">
            <InfoRow
              label="Description"
              value={exercise.shortDescription as string}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ExerciseInfoSectionSkeleton() {
  return (
    <section className="bg-card border border-border rounded-2xl p-5 space-y-5 animate-pulse">
      <div className="h-3 w-20 bg-secondary rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-20 bg-secondary rounded" />
            <div className="h-4 w-28 bg-secondary rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}
