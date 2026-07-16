import React from "react";
import { useAuthStore } from "../store/auth";
import { Redirect } from "wouter";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Redirect to="/login" />;
  }

  if (user && !user.onboardingCompleted && window.location.pathname !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  return <>{children}</>;
}
