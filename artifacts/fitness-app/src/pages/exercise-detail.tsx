import React from "react";
import { useParams, useLocation } from "wouter";
import { useGetExercise } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ExerciseDetailHeader } from "@/components/exercise-detail/exercise-detail-header";
import {
  ExerciseOverviewCard,
  ExerciseOverviewCardSkeleton,
} from "@/components/exercise-detail/exercise-overview-card";
import {
  ExerciseInfoSection,
  ExerciseInfoSectionSkeleton,
} from "@/components/exercise-detail/exercise-info-section";
import {
  ExerciseImageGallery,
  ExerciseImageGallerySkeleton,
} from "@/components/exercise-detail/exercise-image-gallery";
import {
  ExerciseInstructions,
  ExerciseInstructionsSkeleton,
} from "@/components/exercise-detail/exercise-instructions";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ExerciseDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-secondary rounded-xl shrink-0" />
        <div className="h-8 w-64 bg-secondary rounded" />
      </div>
      <ExerciseImageGallerySkeleton />
      <ExerciseOverviewCardSkeleton />
      <ExerciseInfoSectionSkeleton />
      <ExerciseInstructionsSkeleton />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const exerciseId = Number(id);
  const isValidId = !!exerciseId && !isNaN(exerciseId);

  const { data: exercise, isLoading, isError } = useGetExercise(exerciseId, {
    query: { enabled: isValidId },
  });

  // Loading state
  if (isLoading) {
    return <ExerciseDetailSkeleton />;
  }

  // Error / not found state
  if (!isValidId || isError || !exercise) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 text-center bg-card border border-border border-dashed rounded-3xl">
          <h2 className="text-2xl font-bold mb-2">Exercise not found.</h2>
          <p className="text-muted-foreground mb-6">
            This exercise doesn't exist or may have been removed.
          </p>
          <Button onClick={() => setLocation("/exercises")}>
            Back to Exercises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <ExerciseDetailHeader
        name={exercise.name}
        onBack={() => setLocation("/exercises")}
      />

      {/* Image Gallery */}
      <ExerciseImageGallery exercise={exercise} />

      {/* Overview */}
      <ExerciseOverviewCard exercise={exercise} />

      {/* Information */}
      <ExerciseInfoSection exercise={exercise} />

      {/* Instructions */}
      <ExerciseInstructions exercise={exercise} />
    </div>
  );
}
