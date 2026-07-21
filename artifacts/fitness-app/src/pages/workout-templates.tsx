import React, { useState } from "react";
import {
  useListUserWorkoutTemplates,
  useCreateWorkoutTemplate,
  useListWorkouts,
} from "@workspace/api-client-react";
import { LayoutTemplate, Plus, Dumbbell, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(120),
  workoutId: z.coerce.number().int().positive("Select a workout"),
});

type CreateTemplateForm = z.infer<typeof createTemplateSchema>;

function SaveTemplateDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: workouts, isLoading: workoutsLoading } = useListWorkouts({ status: "all" });
  const createTemplate = useCreateWorkoutTemplate();

  const form = useForm<CreateTemplateForm>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: { name: "", workoutId: undefined },
  });

  const onSubmit = (values: CreateTemplateForm) => {
    createTemplate.mutate(
      { data: { name: values.name.trim(), workoutId: values.workoutId } },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          onSaved();
          toast({ title: "Template saved", description: "You can reuse this workout anytime." });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to save template";
          toast({ variant: "destructive", title: "Could not save template", description: message });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save an existing workout as a reusable template.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., My Push Day" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workoutId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workout</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ? String(field.value) : undefined}
                    disabled={workoutsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={workoutsLoading ? "Loading workouts…" : "Select a workout"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workouts?.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={createTemplate.isPending} className="text-black font-bold">
                {createTemplate.isPending ? "Saving…" : "Save Template"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkoutTemplatesPage() {
  const { data: templates, isLoading, refetch } = useListUserWorkoutTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const hasTemplates = (templates?.length ?? 0) > 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">Reusable workouts you've saved as templates.</p>
        </div>
        {hasTemplates && (
          <Button className="shrink-0 text-black font-bold" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : !hasTemplates ? (
        <div className="text-center py-24 bg-card border border-border border-dashed rounded-3xl">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No workout templates yet.</h3>
          <p className="text-muted-foreground mb-6">
            Save any workout as a template to quickly reuse it later.
          </p>
          <Button className="text-black font-bold" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map((template) => (
            <div
              key={template.id}
              className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col"
            >
              <div className="p-6 flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  <LayoutTemplate className="h-3.5 w-3.5" /> Template
                </div>
                <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {template.name}
                </h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Dumbbell className="h-4 w-4" /> {template.workoutName}
                </div>
              </div>
              <div className="p-4 bg-secondary/50 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Created {format(new Date(template.createdAt), "MMM d, yyyy")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SaveTemplateDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}
