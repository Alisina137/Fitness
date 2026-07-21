import React, { useState, useEffect } from "react";
import {
  useListWorkouts,
  useUpdateWorkoutSchedule,
  getListWorkoutScheduleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Repeat } from "lucide-react";

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  weekdays: "Weekdays (Mon–Fri)",
  monthly: "Monthly",
};

export interface EditableScheduledEntry {
  id: number;
  workoutId: number;
  workoutName: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime?: string | null;
  notes?: string | null;
  isRecurring?: boolean;
  recurrenceType?: string | null;
  recurrenceEndDate?: string | null;
}

interface EditScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: EditableScheduledEntry | null;
}

export function EditScheduleDialog({
  open,
  onOpenChange,
  entry,
}: EditScheduleDialogProps) {
  const queryClient = useQueryClient();
  const { data: workouts, isLoading: loadingWorkouts } = useListWorkouts({ status: "active" });
  const updateSchedule = useUpdateWorkoutSchedule();

  const [workoutId, setWorkoutId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill when entry changes or dialog opens
  useEffect(() => {
    if (open && entry) {
      setWorkoutId(String(entry.workoutId));
      setScheduledDate(entry.scheduledDate);
      setScheduledTime(entry.scheduledTime ?? "");
      setNotes(entry.notes ?? "");
      setErrors({});
    }
  }, [open, entry]);

  const isRecurring = !!entry?.isRecurring;
  const recurrenceLabel = entry?.recurrenceType
    ? RECURRENCE_LABELS[entry.recurrenceType] ?? entry.recurrenceType
    : null;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!workoutId) errs.workoutId = "Please select a workout.";
    if (!scheduledDate) {
      errs.scheduledDate = "Please select a date.";
    } else if (isNaN(Date.parse(scheduledDate))) {
      errs.scheduledDate = "Invalid date.";
    }
    if (scheduledTime && !/^\d{2}:\d{2}$/.test(scheduledTime)) {
      errs.scheduledTime = "Use HH:mm format (e.g. 08:00).";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!entry || !validate()) return;

    try {
      await updateSchedule.mutateAsync({
        id: entry.id,
        data: {
          workoutId: parseInt(workoutId, 10),
          scheduledDate,
          scheduledTime: scheduledTime || null,
          notes: notes.trim() || null,
        },
      });

      queryClient.invalidateQueries({ queryKey: getListWorkoutScheduleQueryKey() });
      onOpenChange(false);
    } catch (err: any) {
      const serverIssues: { field: string; message: string }[] = err?.issues ?? [];
      if (serverIssues.length > 0) {
        const errs: Record<string, string> = {};
        serverIssues.forEach((i) => { errs[i.field] = i.message; });
        setErrors(errs);
      } else {
        setErrors({ form: err?.error ?? "Failed to update. Please try again." });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Scheduled Workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {errors.form && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {errors.form}
            </p>
          )}

          {/* Recurring badge */}
          {isRecurring && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
              <Repeat className="h-4 w-4 shrink-0 text-primary" />
              <div className="text-sm">
                <span className="font-medium text-primary">Recurring workout</span>
                {recurrenceLabel && (
                  <span className="text-muted-foreground"> · {recurrenceLabel}</span>
                )}
                {entry?.recurrenceEndDate && (
                  <span className="text-muted-foreground"> · ends {entry.recurrenceEndDate}</span>
                )}
              </div>
            </div>
          )}

          {/* Workout selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Workout *</label>
            {loadingWorkouts ? (
              <div className="h-10 rounded-lg bg-secondary animate-pulse" />
            ) : (
              <select
                value={workoutId}
                onChange={(e) => {
                  setWorkoutId(e.target.value);
                  setErrors((prev) => ({ ...prev, workoutId: "" }));
                }}
                className={cn(
                  "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                  errors.workoutId ? "border-destructive" : "border-border",
                )}
              >
                <option value="">Select a workout…</option>
                {(workouts ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
            {errors.workoutId && (
              <p className="text-xs text-destructive">{errors.workoutId}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Date *</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                setErrors((prev) => ({ ...prev, scheduledDate: "" }));
              }}
              className={cn(
                "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                errors.scheduledDate ? "border-destructive" : "border-border",
              )}
            />
            {errors.scheduledDate && (
              <p className="text-xs text-destructive">{errors.scheduledDate}</p>
            )}
          </div>

          {/* Time (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Time <span className="font-normal">(optional)</span>
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => {
                setScheduledTime(e.target.value);
                setErrors((prev) => ({ ...prev, scheduledTime: "" }));
              }}
              className={cn(
                "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                errors.scheduledTime ? "border-destructive" : "border-border",
              )}
            />
            {errors.scheduledTime && (
              <p className="text-xs text-destructive">{errors.scheduledTime}</p>
            )}
          </div>

          {/* Notes (optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              Notes <span className="font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for this session…"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateSchedule.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateSchedule.isPending}>
            {updateSchedule.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
