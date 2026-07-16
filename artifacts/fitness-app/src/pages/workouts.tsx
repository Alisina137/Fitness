import React, { useState } from "react";
import { Link } from "wouter";
import { useListWorkouts, useCreateWorkout, useDeleteWorkout } from "@workspace/api-client-react";
import { Plus, Search, Filter, Clock, Activity, Target, Dumbbell, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const createWorkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  category: z.string().min(1, "Category is required"),
  durationMinutes: z.coerce.number().min(5),
});

export default function WorkoutsPage() {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [search, setSearch] = useState("");
  const { data: workouts, isLoading, refetch } = useListWorkouts({ status: filter });
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createWorkout = useCreateWorkout();
  const deleteWorkout = useDeleteWorkout();

  const form = useForm<z.infer<typeof createWorkoutSchema>>({
    resolver: zodResolver(createWorkoutSchema),
    defaultValues: {
      name: "",
      difficulty: "intermediate",
      category: "Strength",
      durationMinutes: 45,
    },
  });

  const onSubmit = (values: z.infer<typeof createWorkoutSchema>) => {
    createWorkout.mutate(
      { data: { ...values, exercises: [] } },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          form.reset();
          refetch();
          toast({ title: "Workout created", description: "You can now add exercises to it." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to create workout" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      deleteWorkout.mutate(
        { id },
        {
          onSuccess: () => {
            refetch();
            toast({ title: "Workout deleted" });
          }
        }
      );
    }
  };

  const filteredWorkouts = workouts?.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    (w.category && w.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocols</h1>
          <p className="text-muted-foreground mt-1">Your saved workout plans and training regimes.</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 text-black font-bold">
              <Plus className="mr-2 h-4 w-4" /> New Protocol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Protocol</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocol Name</FormLabel>
                      <FormControl><Input placeholder="e.g., Push Day Alpha" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Est. Duration (min)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Strength">Strength</SelectItem>
                          <SelectItem value="Hypertrophy">Hypertrophy</SelectItem>
                          <SelectItem value="Endurance">Endurance</SelectItem>
                          <SelectItem value="Mobility">Mobility</SelectItem>
                          <SelectItem value="HIIT">HIIT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-4 flex justify-end">
                  <Button type="submit" disabled={createWorkout.isPending} className="text-black font-bold">
                    Create Plan
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border p-2 rounded-2xl">
        <div className="flex w-full sm:w-auto p-1 bg-secondary rounded-xl">
          {(["all", "active", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search protocols..." 
            className="pl-9 bg-background border-none h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      ) : filteredWorkouts?.length === 0 ? (
        <div className="text-center py-24 bg-card border border-border border-dashed rounded-3xl">
          <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No protocols found</h3>
          <p className="text-muted-foreground">Create a new workout plan to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkouts?.map((workout) => (
            <div key={workout.id} className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="inline-block px-3 py-1 bg-secondary text-secondary-foreground text-xs font-semibold rounded-full">
                    {workout.category || "Uncategorized"}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card">
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDelete(workout.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-xl font-bold mb-2 leading-tight group-hover:text-primary transition-colors">
                  <Link href={`/workouts/${workout.id}`}>{workout.name}</Link>
                </h3>
                
                {workout.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{workout.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 mt-auto pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> {workout.durationMinutes || '--'}m
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground capitalize">
                    <Activity className="h-4 w-4" /> {workout.difficulty || 'Mixed'}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Dumbbell className="h-4 w-4" /> {workout.exercises?.length || 0} moves
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-secondary/50 border-t border-border flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Completed {workout.completionCount || 0} times
                </div>
                <Link href={`/workouts/${workout.id}`}>
                  <Button variant="outline" size="sm" className="font-bold hover:bg-primary hover:text-black hover:border-primary">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
