import React, { useState, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReminderInfo {
  frequency: string;
  lastPhotoDate: string | null;
  nextReminderDate: string | null;
  isDue: boolean;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function getToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token ?? null;
  } catch {
    return null;
  }
}

// ─── PhotoReminderDashboardCard ───────────────────────────────────────────────
// Renders a dismissible card when a progress photo reminder is due.
// Renders nothing when reminder is not due, disabled, or dismissed.

export function PhotoReminderDashboardCard() {
  const [isDue, setIsDue] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const token = getToken();
    fetch(`${BASE}/api/progress-photos/reminder`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ReminderInfo | null) => {
        if (data?.isDue) setIsDue(true);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !isDue || dismissed) return null;

  return (
    <div className="bg-card border border-primary/30 p-5 rounded-3xl relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Subtle glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-lg">
          📸
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-snug">
            Time to take a new progress photo.
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Taking photos consistently helps you see changes over time.
          </p>
          <Link
            href="/progress-photos"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-primary hover:underline"
          >
            <Camera className="h-3.5 w-3.5" />
            Upload a photo
          </Link>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Dismiss reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
