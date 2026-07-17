import React, { useState, useMemo } from "react";
import { Target, Plus, Edit2, Trash2, CheckCircle, PauseCircle, Star, Filter, Trophy, Dumbbell, TrendingUp, Zap, Heart, BarChart3, ListChecks, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalCategory = "weight_loss" | "weight_gain" | "muscle_gain" | "strength" | "endurance" | "body_fat" | "workout_consistency" | "custom";
type GoalStatus = "active" | "completed" | "paused" | "cancelled";
type GoalPriority = "high" | "medium" | "low";

type Goal = {
  id: number;
  title: string;
  description?: string | null;
  category: GoalCategory;
  targetValue?: number | null;
  currentValue?: number | null;
  unit?: string | null;
  startDate: string;
  targetDate?: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; icon: React.ElementType; color: string }> = {
  weight_loss:          { label: "Weight Loss",         icon: TrendingUp,  color: "text-orange-400" },
  weight_gain:          { label: "Weight Gain",         icon: TrendingUp,  color: "text-blue-400" },
  muscle_gain:          { label: "Muscle Gain",         icon: Dumbbell,    color: "text-violet-400" },
  strength:             { label: "Strength",            icon: Trophy,      color: "text-yellow-400" },
  endurance:            { label: "Endurance",           icon: Heart,       color: "text-red-400" },
  body_fat:             { label: "Body Fat %",          icon: BarChart3,   color: "text-pink-400" },
  workout_consistency:  { label: "Consistency",         icon: ListChecks,  color: "text-lime-400" },
  custom:               { label: "Custom",              icon: Target,      color: "text-primary" },
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Active",    color: "text-lime-400",   bg: "bg-lime-500/10 border-lime-500/25" },
  completed: { label: "Completed", color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/25" },
  paused:    { label: "Paused",    color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/25" },
  cancelled: { label: "Cancelled", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/25" },
};

const PRIORITY_CONFIG: Record<GoalPriority, { label: string; dot: string }> = {
  high:   { label: "High",   dot: "bg-red-400" },
  medium: { label: "Medium", dot: "bg-yellow-400" },
  low:    { label: "Low",    dot: "bg-green-400" },
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = (() => {
    try { return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token; } catch { return null; }
  })();
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...opts,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "Request failed"); }
  return res.json();
}

function useGoals() {
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Goal[]>("/goals");
      setGoals(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  return { goals, loading, error, reload: load, setGoals };
}

// ─── Blank form ───────────────────────────────────────────────────────────────

type GoalForm = {
  title: string;
  description: string;
  category: GoalCategory;
  targetValue: string;
  currentValue: string;
  unit: string;
  startDate: string;
  targetDate: string;
  priority: GoalPriority;
  isPrimary: boolean;
};

const BLANK_FORM: GoalForm = {
  title: "",
  description: "",
  category: "strength",
  targetValue: "",
  currentValue: "",
  unit: "",
  startDate: new Date().toISOString().split("T")[0],
  targetDate: "",
  priority: "medium",
  isPrimary: false,
};

// ─── GoalModal ────────────────────────────────────────────────────────────────

function GoalModal({ goal, onClose, onSave }: { goal?: Goal; onClose: () => void; onSave: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<GoalForm>(
    goal
      ? {
          title: goal.title,
          description: goal.description ?? "",
          category: goal.category,
          targetValue: goal.targetValue?.toString() ?? "",
          currentValue: goal.currentValue?.toString() ?? "",
          unit: goal.unit ?? "",
          startDate: goal.startDate.split("T")[0],
          targetDate: goal.targetDate?.split("T")[0] ?? "",
          priority: goal.priority,
          isPrimary: goal.isPrimary,
        }
      : BLANK_FORM,
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof GoalForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (form.targetDate && form.startDate && new Date(form.targetDate) <= new Date(form.startDate)) {
      toast({ title: "Target date must be after start date", variant: "destructive" }); return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        targetValue: form.targetValue ? Number(form.targetValue) : undefined,
        currentValue: form.currentValue ? Number(form.currentValue) : undefined,
        unit: form.unit.trim() || undefined,
        startDate: new Date(form.startDate).toISOString(),
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
        priority: form.priority,
        isPrimary: form.isPrimary,
        status: "active",
      };

      if (goal) {
        await apiFetch(`/goals/${goal.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Goal updated" });
      } else {
        await apiFetch("/goals", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Goal created 🎯" });
      }
      onSave();
      onClose();
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="font-bold text-lg">{goal ? "Edit Goal" : "New Goal"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Bench press 100kg" required />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="What does achieving this goal mean to you?" />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {(Object.entries(CATEGORY_CONFIG) as [GoalCategory, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {/* Target value + unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Value</label>
              <input type="number" min="0" step="any" value={form.targetValue} onChange={(e) => set("targetValue", e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 100" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit</label>
              <input value={form.unit} onChange={(e) => set("unit", e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="kg, %, reps…" />
            </div>
          </div>

          {/* Current value */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current Value <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input type="number" min="0" step="any" value={form.currentValue} onChange={(e) => set("currentValue", e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Where are you starting from?" />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Date</label>
              <input type="date" value={form.targetDate} onChange={(e) => set("targetDate", e.target.value)}
                min={form.startDate}
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Priority</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as GoalPriority[]).map((p) => (
                <button type="button" key={p} onClick={() => set("priority", p)}
                  className={cn("flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors capitalize",
                    form.priority === p ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground")}>
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={cn("h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
              form.isPrimary ? "bg-primary border-primary" : "border-border")}
              onClick={() => set("isPrimary", !form.isPrimary)}>
              {form.isPrimary && <CheckCircle className="h-3.5 w-3.5 text-black" />}
            </div>
            <div>
              <span className="text-sm font-medium">Set as primary goal</span>
              <p className="text-xs text-muted-foreground">Used by AI Coach and workout generator</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : goal ? "Save Changes" : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete, onStatusChange }: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (s: GoalStatus) => void;
}) {
  const cat = CATEGORY_CONFIG[goal.category];
  const status = STATUS_CONFIG[goal.status];
  const pri = PRIORITY_CONFIG[goal.priority];
  const Icon = cat.icon;

  const progressPct = goal.targetValue && goal.currentValue
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : null;

  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:border-primary/30 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn("h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0")}>
          <Icon className={cn("h-5 w-5", cat.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold truncate">{goal.title}</h3>
            {goal.isPrimary && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 rounded-full px-2 py-0.5">
                <Star className="h-2.5 w-2.5" /> Primary
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("text-[10px] font-bold border rounded-full px-2 py-0.5", status.bg, status.color)}>{status.label}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", pri.dot)} />{pri.label} priority
            </span>
            <span className="text-[10px] text-muted-foreground">{cat.label}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
      )}

      {/* Progress */}
      {goal.targetValue && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Progress</span>
            <span>
              {goal.currentValue ?? 0} / {goal.targetValue} {goal.unit}
              {progressPct !== null && <span className="text-primary ml-1">({progressPct}%)</span>}
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct ?? 0}%` }} />
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Started {format(new Date(goal.startDate), "MMM d, yyyy")}</span>
        {daysLeft !== null && (
          <span className={cn(daysLeft < 0 ? "text-red-400" : daysLeft < 14 ? "text-yellow-400" : "text-muted-foreground")}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
        {goal.status === "active" && (
          <>
            <button onClick={() => onStatusChange("completed")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-lime-400 hover:bg-lime-500/10 transition-colors">
              <CheckCircle className="h-3.5 w-3.5" /> Complete
            </button>
            <button onClick={() => onStatusChange("paused")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors">
              <PauseCircle className="h-3.5 w-3.5" /> Pause
            </button>
          </>
        )}
        {goal.status === "paused" && (
          <button onClick={() => onStatusChange("active")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-lime-400 hover:bg-lime-500/10 transition-colors">
            <Zap className="h-3.5 w-3.5" /> Resume
          </button>
        )}
        <button onClick={onDelete}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── GoalsPage ────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { goals, loading, error, reload } = useGoals();
  const { toast } = useToast();

  const [filterStatus, setFilterStatus] = useState<GoalStatus | "all">("all");
  const [filterCategory, setFilterCategory] = useState<GoalCategory | "all">("all");
  const [filterPriority, setFilterPriority] = useState<GoalPriority | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | undefined>(undefined);

  const filtered = useMemo(() => {
    return goals.filter((g) => {
      if (filterStatus !== "all" && g.status !== filterStatus) return false;
      if (filterCategory !== "all" && g.category !== filterCategory) return false;
      if (filterPriority !== "all" && g.priority !== filterPriority) return false;
      return true;
    });
  }, [goals, filterStatus, filterCategory, filterPriority]);

  const counts = useMemo(() => ({
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    paused: goals.filter((g) => g.status === "paused").length,
  }), [goals]);

  const openCreate = () => { setEditGoal(undefined); setModalOpen(true); };
  const openEdit = (g: Goal) => { setEditGoal(g); setModalOpen(true); };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this goal? This cannot be undone.")) return;
    try {
      await apiFetch(`/goals/${id}`, { method: "DELETE" });
      toast({ title: "Goal deleted" });
      reload();
    } catch {
      toast({ title: "Failed to delete goal", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: GoalStatus) => {
    try {
      await apiFetch(`/goals/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
      toast({ title: status === "completed" ? "Goal completed 🎉" : status === "paused" ? "Goal paused" : "Goal resumed" });
      reload();
    } catch {
      toast({ title: "Failed to update goal", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground mt-1">Set targets, track progress, stay focused.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Add Goal
        </button>
      </div>

      {/* Stats row */}
      {!loading && goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active", count: counts.active, color: "text-lime-400" },
            { label: "Completed", count: counts.completed, color: "text-blue-400" },
            { label: "Paused", count: counts.paused, color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
              <div className={cn("text-2xl font-black", s.color)}>{s.count}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Status */}
        <div className="flex gap-1">
          {(["all", "active", "completed", "paused"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors border",
                filterStatus === s ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-transparent text-muted-foreground hover:text-foreground")}>
              {s}
            </button>
          ))}
        </div>

        {/* Category */}
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as GoalCategory | "all")}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50 text-muted-foreground">
          <option value="all">All categories</option>
          {(Object.entries(CATEGORY_CONFIG) as [GoalCategory, { label: string }][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Priority */}
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as GoalPriority | "all")}
          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50 text-muted-foreground">
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 bg-secondary rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-secondary rounded-full" />
              <div className="h-3 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/25 rounded-2xl p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={reload} className="mt-3 text-xs underline text-muted-foreground">Try again</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-3xl p-12 text-center space-y-3">
          <Target className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="font-semibold">{goals.length === 0 ? "No goals yet" : "No goals match your filters"}</p>
          <p className="text-sm text-muted-foreground">
            {goals.length === 0 ? "Create your first fitness goal to get started." : "Try adjusting the filters above."}
          </p>
          {goals.length === 0 && (
            <button onClick={openCreate}
              className="mt-2 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Create Goal
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => openEdit(g)}
              onDelete={() => handleDelete(g.id)}
              onStatusChange={(s) => handleStatusChange(g.id, s)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <GoalModal
          goal={editGoal}
          onClose={() => { setModalOpen(false); setEditGoal(undefined); }}
          onSave={reload}
        />
      )}
    </div>
  );
}
