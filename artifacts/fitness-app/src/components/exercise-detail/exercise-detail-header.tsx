import React from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExerciseDetailHeaderProps {
  name: string;
  onBack: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isFavoritePending?: boolean;
}

export function ExerciseDetailHeader({
  name,
  onBack,
  isFavorite = false,
  onToggleFavorite,
  isFavoritePending = false,
}: ExerciseDetailHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0 rounded-xl"
        aria-label="Back to exercises"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight flex-1">
        {name}
      </h1>

      {onToggleFavorite && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFavorite}
          disabled={isFavoritePending}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="shrink-0 rounded-xl"
        >
          <Heart
            className={cn(
              "h-5 w-5 transition-colors",
              isFavorite
                ? "fill-rose-500 text-rose-500"
                : "text-muted-foreground hover:text-rose-500",
            )}
          />
        </Button>
      )}
    </div>
  );
}
