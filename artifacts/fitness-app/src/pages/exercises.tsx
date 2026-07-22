import React, { useState } from "react";
import { useListExercises } from "@workspace/api-client-react";
import { Search, Dumbbell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExerciseCard, ExerciseCardSkeleton } from "@/components/exercise-card";

const CATEGORIES = ["Strength", "Cardio", "Stretching", "Plyometrics", "Powerlifting"];
const MUSCLES = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Full Body"];

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");

  const { data: exercisesResponse, isLoading } = useListExercises({
    search: search || undefined,
    category: category || undefined,
    muscleGroup: muscle || undefined,
  });
  const exercises = exercisesResponse?.exercises ?? [];

  const isFiltered = search !== "" || category !== "" || muscle !== "";

  function clearFilters() {
    setSearch("");
    setCategory("");
    setMuscle("");
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Movement Library</h1>
        <p className="text-muted-foreground mt-1">Browse and study exercise mechanics.</p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-4 rounded-3xl space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search movements..."
            className="pl-12 bg-background border-border h-12 text-lg rounded-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-4 pt-2">
          <div className="space-y-2 w-full md:w-auto">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={category === "" ? "default" : "outline"}
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setCategory("")}
              >
                All
              </Badge>
              {CATEGORIES.map((c) => (
                <Badge
                  key={c}
                  variant={category === c ? "default" : "outline"}
                  className="cursor-pointer px-4 py-1.5"
                  onClick={() => setCategory(c === category ? "" : c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-border md:pl-4 pt-4 md:pt-0">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">
              Target
            </label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={muscle === "" ? "default" : "outline"}
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setMuscle("")}
              >
                All
              </Badge>
              {MUSCLES.map((m) => (
                <Badge
                  key={m}
                  variant={muscle === m ? "default" : "outline"}
                  className="cursor-pointer px-4 py-1.5"
                  onClick={() => setMuscle(m === muscle ? "" : m)}
                >
                  {m}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <ExerciseCardSkeleton key={i} />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24 bg-card border border-border border-dashed rounded-3xl">
          <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No exercises found.</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search or filters.
          </p>
          {isFiltered && (
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </div>
      )}
    </div>
  );
}
