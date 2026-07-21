import React, { useState, useEffect } from "react";
import {
  useGetWorkoutReminderSettings,
  useUpdateWorkoutReminderSettings,
} from "@workspace/api-client-react";
import { Bell, BellOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const REMINDER_OPTIONS = [
  { label: "Off", minutes: 0, enabled: false },
  { label: "15 min", minutes: 15, enabled: true },
  { label: "30 min", minutes: 30, enabled: true },
  { label: "1 hour", minutes: 60, enabled: true },
  { label: "2 hours", minutes: 120, enabled: true },
  { label: "1 day", minutes: 1440, enabled: true },
] as const;

export function ReminderSettingsCard() {
  const { data: settings, isLoading } = useGetWorkoutReminderSettings();
  const updateSettings = useUpdateWorkoutReminderSettings();

  // Local optimistic state
  const [localEnabled, setLocalEnabled] = useState<boolean>(true);
  const [localMinutes, setLocalMinutes] = useState<number>(30);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalEnabled(settings.reminderEnabled);
      setLocalMinutes(settings.reminderMinutesBefore);
    }
  }, [settings]);

  async function handleSelect(option: (typeof REMINDER_OPTIONS)[number]) {
    const newEnabled = option.enabled;
    const newMinutes = option.enabled ? option.minutes : localMinutes;

    setLocalEnabled(newEnabled);
    if (option.enabled) setLocalMinutes(option.minutes);

    try {
      await updateSettings.mutateAsync({
        data: {
          reminderEnabled: newEnabled,
          ...(newEnabled ? { reminderMinutesBefore: option.minutes } : {}),
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Revert on error
      if (settings) {
        setLocalEnabled(settings.reminderEnabled);
        setLocalMinutes(settings.reminderMinutesBefore);
      }
    }
  }

  // Which option is currently active
  function isActive(option: (typeof REMINDER_OPTIONS)[number]) {
    if (!localEnabled && !option.enabled) return true;
    return option.enabled && localEnabled && option.minutes === localMinutes;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {localEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h3 className="font-semibold text-sm">Workout Reminders</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default reminder for new scheduled workouts
            </p>
          </div>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-500 font-medium">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {REMINDER_OPTIONS.map((opt) => (
            <button
              key={`${opt.enabled}-${opt.minutes}`}
              onClick={() => handleSelect(opt)}
              disabled={updateSettings.isPending}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                isActive(opt)
                  ? "bg-primary text-black border-primary"
                  : "bg-background border-border hover:border-primary/40 text-foreground",
                updateSettings.isPending && "opacity-50 cursor-not-allowed",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
