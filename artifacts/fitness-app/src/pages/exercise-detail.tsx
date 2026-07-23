import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetExercise,
  useToggleExerciseFavorite,
  getGetExerciseQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  ExerciseMusclesWorked,
  ExerciseMusclesWorkedSkeleton,
} from "@/components/exercise-detail/exercise-muscles-worked";
import {
  ExerciseInformation,
  ExerciseInformationSkeleton,
} from "@/components/exercise-detail/exercise-information";
import { toast } from "@/hooks/use-toast";

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ExerciseDetailSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-secondary rounded-xl shrink-0" />
        <div className="h-8 w-64 bg-secondary rounded" />
      </div>
      <ExerciseImageGallerySkeleton />
      <ExerciseOverviewCardSkeleton />
      <ExerciseInfoSectionSkeleton />
      <ExerciseInstructionsSkeleton />
      <ExerciseMusclesWorkedSkeleton />
      <ExerciseInformationSkeleton />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const exerciseId = Number(id);
  const isValidId = !!exerciseId && !isNaN(exerciseId);

  const { data: exercise, isLoading, isError } = useGetExercise(exerciseId, {
    query: { enabled: isValidId },
  });

  // Local optimistic favorite state
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [isFavPending, setIsFavPending] = useState(false);
  const toggleFavoriteMutation = useToggleExerciseFavorite();

  const isFavorite = favoriteOverride !== null
    ? favoriteOverride
    : (exercise?.isFavorite ?? false);

  async function handleToggleFavorite() {
    if (!exercise) return;
    const next = !isFavorite;
    setFavoriteOverride(next);
    setIsFavPending(true);
    try {
      await toggleFavoriteMutation.mutateAsync({ id: exerciseId });
      queryClient.invalidateQueries({ queryKey: getGetExerciseQueryKey(exerciseId) });
    } catch {
      setFavoriteOverride(isFavorite); // revert
      toast({
        title: "Couldn't update favorite",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFavPending(false);
    }
  }

  if (isLoading) return <ExerciseDetailSkeleton />;

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
      <ExerciseDetailHeader
        name={exercise.name}
        onBack={() => setLocation("/exercises")}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        isFavoritePending={isFavPending}
      />
      <ExerciseImageGallery exercise={exercise} />
      <ExerciseOverviewCard exercise={exercise} />
      <ExerciseInfoSection exercise={exercise} />
      <ExerciseInstructions exercise={exercise} />
      <ExerciseMusclesWorked exercise={exercise} />
      <ExerciseInformation exercise={exercise} />
    </div>
  );
}
