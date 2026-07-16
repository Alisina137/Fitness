import React, { useState } from "react";
import { useListNutritionEntries, useGetNutritionSummary, useCreateNutritionEntry, useDeleteNutritionEntry } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Plus, Flame, Search, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const entrySchema = z.object({
  name: z.string().min(2, "Name required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.coerce.number().min(1, "Required"),
  protein: z.coerce.number().optional(),
  carbs: z.coerce.number().optional(),
  fat: z.coerce.number().optional(),
});

export default function NutritionPage() {
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useGetNutritionSummary({ date });
  const { data: entries, isLoading: loadingEntries, refetch: refetchEntries } = useListNutritionEntries({ date });
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();
  
  const createEntry = useCreateNutritionEntry();
  const deleteEntry = useDeleteNutritionEntry();

  const form = useForm<z.infer<typeof entrySchema>>({
    resolver: zodResolver(entrySchema),
    defaultValues: { name: "", mealType: "lunch", calories: 0, protein: 0, carbs: 0, fat: 0 },
  });

  const onSubmit = (values: z.infer<typeof entrySchema>) => {
    createEntry.mutate({ data: values }, {
      onSuccess: () => {
        setIsAddOpen(false);
        form.reset();
        refetchSummary();
        refetchEntries();
        toast({ title: "Logged successfully" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteEntry.mutate({ id }, {
      onSuccess: () => {
        refetchSummary();
        refetchEntries();
      }
    });
  };

  // Group entries by meal
  const meals = ["breakfast", "lunch", "dinner", "snack"] as const;
  const groupedEntries = entries?.reduce((acc, entry) => {
    if (!acc[entry.mealType]) acc[entry.mealType] = [];
    acc[entry.mealType].push(entry);
    return acc;
  }, {} as Record<string, typeof entries>) || {};

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nutrition Log</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="text-black font-bold shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Quick Log
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Log Fuel</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Food / Meal</FormLabel>
                      <FormControl><Input placeholder="e.g. Chicken & Rice" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                            <SelectItem value="snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="calories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calories</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="pt-2 border-t border-border mt-2">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-2">Macros (Optional)</span>
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="protein"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-primary">Protein (g)</FormLabel>
                          <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="carbs"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-blue-400">Carbs (g)</FormLabel>
                          <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-yellow-500">Fat (g)</FormLabel>
                          <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" className="w-full text-black font-bold" disabled={createEntry.isPending}>
                    Save Entry
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Dashboard Panel */}
      <div className="bg-card border border-border rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl shadow-background/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        
        {loadingSummary ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-center relative z-10">
            {/* Calories Dial (Simulated) */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* SVG Ring background */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" 
                    className="text-primary transition-all duration-1000 ease-out"
                    strokeDasharray={`${Math.PI * 2 * 45}`}
                    strokeDashoffset={`${Math.PI * 2 * 45 * (1 - Math.min(1, (summary?.totalCalories || 0) / (summary?.calorieGoal || 2500)))}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <Flame className="h-6 w-6 text-primary mb-1 opacity-80" />
                  <span className="text-4xl font-extrabold font-mono leading-none">{summary?.totalCalories || 0}</span>
                  <span className="text-sm text-muted-foreground font-bold mt-1">/ {summary?.calorieGoal || 2500}</span>
                </div>
              </div>
              <div className="mt-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Calories Consumed</div>
            </div>

            {/* Macro Bars */}
            <div className="space-y-6">
              {[
                { label: "Protein", val: summary?.totalProtein || 0, target: 180, color: "bg-primary", text: "text-primary" },
                { label: "Carbs", val: summary?.totalCarbs || 0, target: 250, color: "bg-blue-500", text: "text-blue-400" },
                { label: "Fat", val: summary?.totalFat || 0, target: 80, color: "bg-yellow-500", text: "text-yellow-500" },
              ].map(macro => (
                <div key={macro.label}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold uppercase tracking-wider">{macro.label}</span>
                    <div className="text-right">
                      <span className={`font-mono font-bold ${macro.text}`}>{macro.val}g</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {macro.target}g</span>
                    </div>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${macro.color} transition-all duration-1000`} 
                      style={{ width: `${Math.min(100, (macro.val / macro.target) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meals List */}
      <div className="space-y-6 pt-4">
        {loadingEntries ? (
          [1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          meals.map(meal => (
            <div key={meal} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-secondary/50 px-6 py-3 border-b border-border flex justify-between items-center">
                <h3 className="font-bold capitalize">{meal}</h3>
                <span className="text-sm font-mono font-medium">
                  {groupedEntries[meal]?.reduce((sum, item) => sum + item.calories, 0) || 0} kcal
                </span>
              </div>
              
              <div className="p-2">
                {groupedEntries[meal]?.length ? (
                  <div className="space-y-1">
                    {groupedEntries[meal].map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 rounded-xl transition-colors group">
                        <div>
                          <div className="font-medium">{entry.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                            {entry.protein != null && <span>P: {entry.protein}g</span>}
                            {entry.carbs != null && <span>C: {entry.carbs}g</span>}
                            {entry.fat != null && <span>F: {entry.fat}g</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-bold text-lg">{entry.calories}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No entries logged for {meal} yet.
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
