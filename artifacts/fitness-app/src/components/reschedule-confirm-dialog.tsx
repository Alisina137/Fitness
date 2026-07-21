import React from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export interface RescheduleConfirmDialogProps {
  open: boolean;
  workoutName: string;
  newDate: string; // "YYYY-MM-DD"
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RescheduleConfirmDialog({
  open,
  workoutName,
  newDate,
  isPending,
  onConfirm,
  onCancel,
}: RescheduleConfirmDialogProps) {
  const formattedDate = newDate
    ? format(parseISO(newDate), "MMMM d")
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Move Workout
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Move{" "}
          <span className="font-semibold text-foreground">{workoutName}</span>{" "}
          to{" "}
          <span className="font-semibold text-foreground">{formattedDate}</span>?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? "Moving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
