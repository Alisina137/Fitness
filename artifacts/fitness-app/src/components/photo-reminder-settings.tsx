import React, { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Calendar, Camera, CheckCircle2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReminderFrequency = "weekly" | "every2weeks" | "monthly" | "disabled";

interface ReminderInfo {
  frequency: ReminderFrequency;
  lastPhotoDate: string | null;
  nextReminderDate: string | null;
  isDue: boolean;
}

const FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string; sublabel: string }[] = [
  { value: "weekly",     label: "Weekly",       sublabel: "Every 7 days" },
  { value: "every2weeks", label: "Every 2 Weeks", sublabel: "Every 14 days" },
  { value: "monthly",    label: "Monthly",      sublabel: "Every 30 days" },
  { value: "disabled",   label: "Disabled",     sublabel: "No reminders" },
];


// ─── PhotoReminderSettings ────────────────────────────────────────────────────

export function PhotoReminderSettings() {
  const [info, setInfo] = useState<ReminderInfo | null>(null);
  const [selected, setSelected] = useState<ReminderFrequency>("weekly");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ReminderInfo>("/progress-photos/reminder");
      setInfo(data);
      setSelected(data.frequency);
    } catch {
      setError("Could not load reminder settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const data = await apiFetch<ReminderInfo>("/progress-photos/reminder", {
        method: "PUT",
        body: JSON.stringify({ frequency: selected }),
      });
      setInfo(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = info ? selected !== info.frequency : false;

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-card border border-border p-6 rounded-3xl space-y-5 animate-pulse">
        <div className="h-5 bg-secondary rounded w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-secondary rounded-xl" />)}
        </div>
        <div className="h-16 bg-secondary rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-bold">Photo Reminders</h3>
          <p className="text-xs text-muted-foreground">Get reminded to take progress photos on a schedule.</p>
        </div>
      </div>

      {/* Frequency selector */}
      <div>
        <p className="text-sm font-medium mb-3">Reminder frequency</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FREQUENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setSelected(opt.value); setSaved(false); }}
              className={cn(
                "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                selected === opt.value
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >
              <span className="font-semibold text-sm leading-tight">
                {opt.value === "disabled" ? (
                  <span className="flex items-center gap-1.5">
                    <BellOff className="h-3.5 w-3.5" />
                    {opt.label}
                  </span>
                ) : opt.label}
              </span>
              <span className="text-xs opacity-60 mt-0.5">{opt.sublabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info row */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Last photo */}
        <div className="bg-secondary/60 rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Camera className="h-3.5 w-3.5" /> Last Photo
          </div>
          <p className="font-semibold text-sm">
            {info?.lastPhotoDate
              ? format(parseISO(info.lastPhotoDate), "MMM d, yyyy")
              : <span className="text-muted-foreground">No photos yet</span>}
          </p>
        </div>

        {/* Next reminder */}
        <div className="bg-secondary/60 rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Calendar className="h-3.5 w-3.5" /> Next Reminder
          </div>
          <p className="font-semibold text-sm">
            {selected === "disabled" ? (
              <span className="text-muted-foreground">Disabled</span>
            ) : info?.nextReminderDate ? (
              format(parseISO(info.nextReminderDate), "MMM d, yyyy")
            ) : (
              <span className="text-primary">Due now</span>
            )}
          </p>
        </div>

        {/* Status */}
        <div className={cn(
          "rounded-2xl p-4 space-y-1",
          info?.isDue && selected !== "disabled"
            ? "bg-primary/10 border border-primary/20"
            : "bg-secondary/60"
        )}>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Bell className="h-3.5 w-3.5" /> Status
          </div>
          <p className="font-semibold text-sm">
            {selected === "disabled" ? (
              <span className="text-muted-foreground">Off</span>
            ) : info?.isDue ? (
              <span className="text-primary">📸 Due now</span>
            ) : (
              <span className="text-muted-foreground">On schedule</span>
            )}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Save button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-primary animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors",
            isDirty
              ? "bg-primary text-black hover:bg-primary/90"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
