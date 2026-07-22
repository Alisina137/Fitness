import React, { useState } from "react";
import {
  useListUserWorkoutTemplates,
  useCreateWorkoutTemplate,
  useListWorkouts,
  useDeleteWorkoutTemplate,
  useDuplicateWorkoutTemplate,
  useToggleWorkoutTemplateFavorite,
} from "@workspace/api-client-react";
import { LayoutTemplate, Plus, Dumbbell, CalendarDays, Pencil, Trash2, Copy, Star, Search, X, SlidersHorizontal } from "lucide-react";
import { EditTemplateDialog, TEMPLATE_CATEGORIES } from "@/components/edit-template-dialog";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Strength:     "bg-red-500/15 text-red-400 border-red-500/20",
  Hypertrophy:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Fat Loss":   "bg-green-500/15 text-green-400 border-green-500/20",
  Cardio:       "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Mobility:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  HIIT:         "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Powerlifting: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  Functional:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Recovery:     "bg-teal-500/15 text-teal-400 border-teal-500/20",
  Custom:       "bg-muted text-muted-foreground border-border",
};

function categoryBadgeClass(category: string) {
  return CATEGORY_COLORS[category] ?? "bg-muted text-muted-foreground border-border";
}

// ─── Schema / types ───────────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(120),
  workoutId: z.coerce.number().int().positive("Select a workout"),
  category: z.enum(TEMPLATE_CATEGORIES).default("Strength"),
});

type CreateTemplateForm = z.infer<typeof createTemplateSchema>;

type Template = {
  id: number;
  name: string;
  workoutName: string;
  category: string;
  isFavorite: boolean;
  createdAt: string;
};

// ─── Save Template Dialog ─────────────────────────────────────────────────────

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
    defaultValues: { name: "", workoutId: undefined, category: "Strength" },
  });

  const onSubmit = (values: CreateTemplateForm) => {
    createTemplate.mutate(
      { data: { name: values.name.trim(), workoutId: values.workoutId, category: values.category } },
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
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
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

// ─── Delete Template Dialog ───────────────────────────────────────────────────

function DeleteTemplateDialog({
  templateId,
  open,
  onOpenChange,
  onDeleted,
}: {
  templateId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const deleteTemplate = useDeleteWorkoutTemplate();

  const handleDelete = () => {
    if (!templateId) return;
    deleteTemplate.mutate(
      { id: templateId },
      {
        onSuccess: () => {
          onOpenChange(false);
          onDeleted();
          toast({ title: "Template deleted" });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to delete template";
          toast({ variant: "destructive", title: "Could not delete template", description: message });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Delete Template?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteTemplate.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTemplate.isPending}
          >
            {deleteTemplate.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  duplicatePending,
  favoritePending,
}: {
  template: Template;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleFavorite: () => void;
  duplicatePending: boolean;
  favoritePending: boolean;
}) {
  return (
    <div className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 transition-colors flex flex-col">
      <div className="p-6 flex-1 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              <LayoutTemplate className="h-3.5 w-3.5" /> Template
            </div>
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border",
                categoryBadgeClass(template.category),
              )}
            >
              {template.category}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Star always visible */}
            <button
              onClick={onToggleFavorite}
              disabled={favoritePending}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
              title={template.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`h-4 w-4 transition-colors ${
                  template.isFavorite
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground hover:text-yellow-400"
                }`}
              />
            </button>
            {/* Edit / Duplicate / Delete — appear on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Edit template"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDuplicate}
                disabled={duplicatePending}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                title="Duplicate template"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete template"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
          {template.name}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Dumbbell className="h-4 w-4" /> {template.workoutName}
        </div>
      </div>
      <div className="p-4 bg-secondary/50 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Created {format(new Date(template.createdAt), "MMM d, yyyy")}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            disabled={duplicatePending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary disabled:opacity-50"
          >
            <Copy className="h-3 w-3" /> Duplicate
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Filter Chips ────────────────────────────────────────────────────

function CategoryFilter({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (cat: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={cn(
          "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
          selected === null
            ? "bg-primary text-black border-primary"
            : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
        )}
      >
        All Categories
      </button>
      {TEMPLATE_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            selected === cat
              ? cn("border", categoryBadgeClass(cat), "opacity-100")
              : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ─── Sort & Quick-filter helpers ─────────────────────────────────────────────

type SortOrder = "newest" | "oldest" | "az" | "za";
type QuickFilter = "all" | "favorites" | "recent";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "az",     label: "A → Z" },
  { value: "za",     label: "Z → A" },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function sortTemplates(list: Template[], order: SortOrder): Template[] {
  return [...list].sort((a, b) => {
    switch (order) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "az":
        return a.name.localeCompare(b.name);
      case "za":
        return b.name.localeCompare(a.name);
      default: // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
}

// ─── Quick Filter Chips ───────────────────────────────────────────────────────

function QuickFilters({
  selected,
  onChange,
}: {
  selected: QuickFilter;
  onChange: (f: QuickFilter) => void;
}) {
  const options: { value: QuickFilter; label: string }[] = [
    { value: "all",       label: "All" },
    { value: "favorites", label: "Favorites" },
    { value: "recent",    label: "Recently Created" },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            selected === value
              ? "bg-primary text-black border-primary"
              : "bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkoutTemplatesPage() {
  const { data: templates, isLoading, refetch } = useListUserWorkoutTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id: number; name: string; category: string } | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const { toast } = useToast();

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSortOrder("newest");
    setQuickFilter("all");
  };

  const duplicateTemplate = useDuplicateWorkoutTemplate();
  const toggleFavorite = useToggleWorkoutTemplateFavorite();

  const handleDuplicate = (templateId: number) => {
    duplicateTemplate.mutate(
      { id: templateId },
      {
        onSuccess: () => {
          refetch();
          toast({ title: "Template duplicated", description: "A copy has been added to your library." });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to duplicate template";
          toast({ variant: "destructive", title: "Could not duplicate template", description: message });
        },
      },
    );
  };

  const handleToggleFavorite = (templateId: number, currentlyFavorite: boolean) => {
    toggleFavorite.mutate(
      { id: templateId },
      {
        onSuccess: () => {
          refetch();
          toast({
            title: currentlyFavorite ? "Removed from favorites" : "Added to favorites",
          });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to update favorite";
          toast({ variant: "destructive", title: "Could not update favorite", description: message });
        },
      },
    );
  };

  const allTemplates = (templates ?? []) as Template[];
  const hasTemplates = allTemplates.length > 0;

  // Apply all filters, then sort
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const now = Date.now();

  const filteredTemplates = sortTemplates(
    allTemplates.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (quickFilter === "favorites" && !t.isFavorite) return false;
      if (quickFilter === "recent" && now - new Date(t.createdAt).getTime() > SEVEN_DAYS_MS) return false;
      if (normalizedQuery) {
        return (
          t.name.toLowerCase().includes(normalizedQuery) ||
          t.workoutName.toLowerCase().includes(normalizedQuery) ||
          t.category.toLowerCase().includes(normalizedQuery)
        );
      }
      return true;
    }),
    sortOrder,
  );

  // Favorites / others split only makes sense in the default "all" view
  const showSplit = quickFilter === "all";
  const favorites = showSplit ? filteredTemplates.filter((t) => t.isFavorite) : [];
  const others = showSplit ? filteredTemplates.filter((t) => !t.isFavorite) : filteredTemplates;
  const hasFavorites = favorites.length > 0;

  const isFiltersActive =
    normalizedQuery !== "" ||
    selectedCategory !== null ||
    sortOrder !== "newest" ||
    quickFilter !== "all";

  const cardProps = (template: Template) => ({
    template,
    onEdit: () => setEditingTemplate({ id: template.id, name: template.name, category: template.category }),
    onDelete: () => setDeletingTemplateId(template.id),
    onDuplicate: () => handleDuplicate(template.id),
    onToggleFavorite: () => handleToggleFavorite(template.id, template.isFavorite),
    duplicatePending: duplicateTemplate.isPending,
    favoritePending: toggleFavorite.isPending,
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
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
        <div className="space-y-6">
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-3xl" />
            ))}
          </div>
        </div>
      ) : !hasTemplates ? (
        /* Global empty state — no templates at all */
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
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 bg-card border-border rounded-xl h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick filters + Sort + Clear Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <QuickFilters selected={quickFilter} onChange={setQuickFilter} />
            <div className="flex items-center gap-2 shrink-0">
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger className="w-[160px] bg-card border-border rounded-xl h-9 text-sm">
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFiltersActive && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 text-sm rounded-xl">
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Category filter chips */}
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

          {filteredTemplates.length === 0 ? (
            /* Filtered empty state */
            <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl">
              <LayoutTemplate className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-4">No templates found.</p>
              {isFiltersActive && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {/* Favorites section — only shown in default "all" view */}
              {hasFavorites && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <h2 className="text-lg font-semibold">Favorites</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((template) => (
                      <TemplateCard key={template.id} {...cardProps(template)} />
                    ))}
                  </div>
                </section>
              )}

              {/* All / remaining templates */}
              {others.length > 0 && (
                <section className="space-y-4">
                  {hasFavorites && (
                    <h2 className="text-lg font-semibold text-muted-foreground">All Templates</h2>
                  )}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {others.map((template) => (
                      <TemplateCard key={template.id} {...cardProps(template)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      <SaveTemplateDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSaved={() => refetch()} />

      {editingTemplate && (
        <EditTemplateDialog
          open={!!editingTemplate}
          onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
          templateId={editingTemplate.id}
          currentName={editingTemplate.name}
          currentCategory={editingTemplate.category}
        />
      )}

      <DeleteTemplateDialog
        templateId={deletingTemplateId}
        open={deletingTemplateId !== null}
        onOpenChange={(open) => { if (!open) setDeletingTemplateId(null); }}
        onDeleted={() => refetch()}
      />
    </div>
  );
}
