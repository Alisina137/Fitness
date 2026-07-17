import { create } from "zustand";
import type { User } from "@workspace/api-client-react";

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const token = localStorage.getItem("fitcore_token");
  
  return {
    user: null,
    token: token,
    setAuth: (user, token) => {
      localStorage.setItem("fitcore_token", token);
      set({ user, token });
    },
    logout: () => {
      localStorage.removeItem("fitcore_token");
      set({ user: null, token: null });
    },
  };
});
