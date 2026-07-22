import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExerciseDetailHeaderProps {
  name: string;
  onBack: () => void;
}

export function ExerciseDetailHeader({ name, onBack }: ExerciseDetailHeaderProps) {
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
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
        {name}
      </h1>
    </div>
  );
}
