import React, { useState } from "react";
import { useListWorkouts, useCreateWorkoutSchedule, getListWorkoutScheduleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the date field when opened from a calendar day click */
  defaultDate?: Date;
}

export function ScheduleWorkoutDialog({
  open,
  onOpenChange,
  defaultDate,
}: ScheduleWorkoutDialogProps) {
  const queryClient = useQueryClient();
  const { data: workouts, isLoading: loadingWorkouts } = useListWorkouts({ status: "active" });

  const [workoutId, setWorkoutId] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>(
    defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
  );
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createSchedule = useCreateWorkoutSchedule();

  // Keep date in sync when defaultDate changes (dialog re-opened on a new day)
  React.useEffect(() => {
    if (open) {
      setScheduledDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
      setWorkoutId("");
      setScheduledTime("");
      setNotes("");
      setErrors({});
    }
  }, [open, defaultDate]);

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
    if (!validate()) return;

    try {
      await createSchedule.mutateAsync({
        data: {
          workoutId: parseInt(workoutId, 10),
          scheduledDate,
          scheduledTime: scheduledTime || null,
          notes: notes.trim() || null,
        },
      });

      // Invalidate the list so the calendar refreshes
      queryClient.invalidateQueries({ queryKey: getListWorkoutScheduleQueryKey() });
      onOpenChange(false);
    } catch (err: any) {
      const serverIssues: { field: string; message: string }[] = err?.issues ?? [];
      if (serverIssues.length > 0) {
        const errs: Record<string, string> = {};
        serverIssues.forEach((i) => { errs[i.field] = i.message; });
        setErrors(errs);
      } else {
        setErrors({ form: err?.error ?? "Failed to schedule workout. Please try again." });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a Workout</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Global error */}
          {errors.form && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {errors.form}
            </p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createSchedule.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createSchedule.isPending}>
            {createSchedule.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
