import React, { useState } from "react";
import {
  useListWorkouts,
  useCreateWorkoutSchedule,
  useCreateRecurringWorkoutSchedule,
  getListWorkoutScheduleQueryKey,
} from "@workspace/api-client-react";
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
import { Repeat } from "lucide-react";

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "weekdays", label: "Weekdays (Mon–Fri)" },
  { value: "monthly", label: "Monthly" },
] as const;

type RecurrenceType = (typeof RECURRENCE_OPTIONS)[number]["value"];

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

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("weekly");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const createSchedule = useCreateWorkoutSchedule();
  const createRecurring = useCreateRecurringWorkoutSchedule();

  const isPending = createSchedule.isPending || createRecurring.isPending;

  // Keep date in sync when defaultDate changes (dialog re-opened on a new day)
  React.useEffect(() => {
    if (open) {
      setScheduledDate(defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
      setWorkoutId("");
      setScheduledTime("");
      setNotes("");
      setIsRecurring(false);
      setRecurrenceType("weekly");
      setRecurrenceEndDate("");
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
    if (isRecurring && recurrenceEndDate) {
      if (isNaN(Date.parse(recurrenceEndDate))) {
        errs.recurrenceEndDate = "Invalid end date.";
      } else if (recurrenceEndDate < scheduledDate) {
        errs.recurrenceEndDate = "End date must not be before the start date.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    try {
      if (isRecurring) {
        await createRecurring.mutateAsync({
          data: {
            workoutId: parseInt(workoutId, 10),
            scheduledDate,
            scheduledTime: scheduledTime || null,
            notes: notes.trim() || null,
            recurrenceType,
            recurrenceEndDate: recurrenceEndDate || null,
          },
        });
      } else {
        await createSchedule.mutateAsync({
          data: {
            workoutId: parseInt(workoutId, 10),
            scheduledDate,
            scheduledTime: scheduledTime || null,
            notes: notes.trim() || null,
          },
        });
      }

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
            <label className="text-sm font-medium">
              {isRecurring ? "Start Date *" : "Date *"}
            </label>
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

          {/* Repeat toggle */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
            <button
              type="button"
              onClick={() => setIsRecurring((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Repeat className="h-4 w-4 text-primary" />
                Repeat
              </span>
              {/* Toggle pill */}
              <div
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors",
                  isRecurring ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                    isRecurring ? "translate-x-4" : "translate-x-0",
                  )}
                />
              </div>
            </button>

            {/* Recurrence options — only shown when repeat is on */}
            {isRecurring && (
              <div className="space-y-3 pt-1">
                {/* Frequency */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurrenceType(opt.value)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left",
                          recurrenceType === opt.value
                            ? "bg-primary text-black border-primary"
                            : "bg-background border-border hover:border-primary/40 text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* End date (optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    End Date <span className="normal-case font-normal">(optional, defaults to 90 days)</span>
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    min={scheduledDate}
                    onChange={(e) => {
                      setRecurrenceEndDate(e.target.value);
                      setErrors((prev) => ({ ...prev, recurrenceEndDate: "" }));
                    }}
                    className={cn(
                      "w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary",
                      errors.recurrenceEndDate ? "border-destructive" : "border-border",
                    )}
                  />
                  {errors.recurrenceEndDate && (
                    <p className="text-xs text-destructive">{errors.recurrenceEndDate}</p>
                  )}
                </div>
              </div>
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
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending
              ? "Saving…"
              : isRecurring
                ? "Schedule Recurring"
                : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
