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

// localStorage key that stores the dismissal token.
// Format: ISO date string of nextReminderDate, or a "never-uploaded:<YYYY-MM-DD>"
// sentinel for users who have never taken a photo.
const STORAGE_KEY = "photo-reminder-dismissed-token";

function getToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Derive a stable dismissal token from the API response.
 *
 * - When nextReminderDate is present, use it directly — dismissal expires
 *   the moment a new reminder period starts.
 * - When nextReminderDate is null (user has never uploaded a photo), use a
 *   "never-uploaded:<today>" sentinel so the card is suppressed for the rest
 *   of the calendar day but reappears the next time they visit.
 */
function deriveDismissalToken(info: ReminderInfo): string {
  if (info.nextReminderDate) return info.nextReminderDate;
  // Sentinel: dismissed for today only
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return `never-uploaded:${today}`;
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch { /* storage unavailable */ }
}

// ─── PhotoReminderDashboardCard ───────────────────────────────────────────────
// Renders a dismissible card when a progress photo reminder is due.
// Dismissal persists across page loads until the next reminder period begins.

export function PhotoReminderDashboardCard() {
  const [info, setInfo] = useState<ReminderInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const authToken = getToken();
    fetch(`${BASE}/api/progress-photos/reminder`, {
      headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ReminderInfo | null) => {
        if (!data?.isDue) {
          setLoaded(true);
          return;
        }

        setInfo(data);

        // Check if this reminder period was already dismissed
        const stored = readStoredToken();
        const current = deriveDismissalToken(data);
        if (stored === current) {
          setDismissed(true);
        }

        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (info) {
      writeStoredToken(deriveDismissalToken(info));
    }
  }

  if (!loaded || !info?.isDue || dismissed) return null;

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
          onClick={handleDismiss}
          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Dismiss reminder"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
