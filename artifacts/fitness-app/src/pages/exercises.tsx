import React, { useState } from "react";
import { useListExercises } from "@workspace/api-client-react";
import { Search, Filter, Play, Info, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["Strength", "Cardio", "Stretching", "Plyometrics", "Powerlifting"];
const MUSCLES = ["Chest", "Back", "Legs", "Arms", "Shoulders", "Core", "Full Body"];

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [muscle, setMuscle] = useState<string>("");

  const { data: exercises, isLoading } = useListExercises({
    search: search || undefined,
    category: category || undefined,
    muscleGroup: muscle || undefined
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
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
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Category</label>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={category === "" ? "default" : "outline"} 
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setCategory("")}
              >All</Badge>
              {CATEGORIES.map(c => (
                <Badge 
                  key={c}
                  variant={category === c ? "default" : "outline"} 
                  className="cursor-pointer px-4 py-1.5"
                  onClick={() => setCategory(c === category ? "" : c)}
                >{c}</Badge>
              ))}
            </div>
          </div>
          
          <div className="space-y-2 w-full md:w-auto border-t md:border-t-0 md:border-l border-border md:pl-4 pt-4 md:pt-0">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Target</label>
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={muscle === "" ? "default" : "outline"} 
                className="cursor-pointer px-4 py-1.5"
                onClick={() => setMuscle("")}
              >All</Badge>
              {MUSCLES.map(m => (
                <Badge 
                  key={m}
                  variant={muscle === m ? "default" : "outline"} 
                  className="cursor-pointer px-4 py-1.5"
                  onClick={() => setMuscle(m === muscle ? "" : m)}
                >{m}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-[280px] rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {exercises?.map((exercise) => (
            <Dialog key={exercise.id}>
              <DialogTrigger asChild>
                <div className="group bg-card border border-border rounded-3xl overflow-hidden cursor-pointer hover:border-primary/50 hover-elevate transition-all flex flex-col h-[280px]">
                  {/* Mock Image Area */}
                  <div className="h-32 bg-secondary relative overflow-hidden flex items-center justify-center">
                    {exercise.imageUrl ? (
                      <img src={exercise.imageUrl} alt={exercise.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] mix-blend-overlay" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                    
                    <div className="absolute bottom-2 left-3 flex gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-background/80 backdrop-blur rounded text-foreground">
                        {exercise.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-bold leading-tight mb-1 group-hover:text-primary transition-colors">{exercise.name}</h3>
                    <p className="text-xs text-muted-foreground mb-4">{exercise.category}</p>
                    
                    <div className="mt-auto flex flex-wrap gap-1">
                      {exercise.muscleGroups?.slice(0,3).map(m => (
                        <span key={m} className="text-[10px] px-2 py-1 bg-secondary rounded-md text-secondary-foreground">{m}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-card border-border p-0 overflow-hidden rounded-3xl">
                <div className="h-48 bg-secondary relative flex items-center justify-center">
                   {exercise.videoUrl ? (
                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors">
                       <Play className="h-12 w-12 text-white" />
                     </div>
                   ) : (
                     <div className="text-muted-foreground flex flex-col items-center">
                       <Info className="h-8 w-8 mb-2 opacity-50" />
                       <span className="text-sm font-medium">No video available</span>
                     </div>
                   )}
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 uppercase text-[10px] tracking-wider">{exercise.difficulty}</Badge>
                      <Badge variant="secondary" className="uppercase text-[10px] tracking-wider">{exercise.category}</Badge>
                    </div>
                    <DialogTitle className="text-2xl font-bold">{exercise.name}</DialogTitle>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Primary Muscles</div>
                      <div className="font-medium text-sm">{exercise.muscleGroups?.join(", ") || "Unknown"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Equipment</div>
                      <div className="font-medium text-sm">{exercise.equipment?.join(", ") || "Bodyweight"}</div>
                    </div>
                  </div>

                  {exercise.instructions && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Execution</div>
                      <p className="text-sm leading-relaxed text-foreground/90">{exercise.instructions}</p>
                    </div>
                  )}

                  {exercise.caloriesPerMinute && (
                    <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                      <Flame className="h-4 w-4" />
                      <span className="font-bold">~{exercise.caloriesPerMinute} kcal/min</span> burn rate
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
