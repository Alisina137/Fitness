import { create } from "zustand";
import type { User } from "@workspace/api-client-react";

const TOKEN_KEY = "fitcore_token";
const LAST_ACTIVE_KEY = "fitcore_last_active";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

/** Returns true if the user has been active within the last 5 days. */
function isWithinActivityWindow(): boolean {
  const raw = localStorage.getItem(LAST_ACTIVE_KEY);
  if (!raw) return false;
  const lastActive = parseInt(raw, 10);
  return Date.now() - lastActive < FIVE_DAYS_MS;
}

function loadInitialToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  // If a token exists but the user has been inactive for 5+ days, clear it now.
  if (!isWithinActivityWindow()) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    return null;
  }

  return token;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  refreshActivity: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const token = loadInitialToken();

  return {
    user: null,
    token,
    setAuth: (user, token) => {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      set({ user, token });
    },
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LAST_ACTIVE_KEY);
      set({ user: null, token: null });
    },
    refreshActivity: () => {
      // Only bump the timestamp when a token is actually present.
      if (localStorage.getItem(TOKEN_KEY)) {
        localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      }
    },
  };
});
