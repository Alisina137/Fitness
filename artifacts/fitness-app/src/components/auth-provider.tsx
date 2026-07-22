import React, { useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { token, setAuth, logout } = useAuthStore();
  const [, setLocation] = useLocation();

  // Inject auth header into every fetch and bump the activity timestamp on
  // every successful authenticated response (keeps the 5-day window rolling).
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      let headers = init?.headers ? new Headers(init.headers) : new Headers();

      const currentToken = useAuthStore.getState().token;
      if (currentToken) {
        headers.set("Authorization", `Bearer ${currentToken}`);
      }

      const response = await originalFetch(input, { ...init, headers });

      // Any successful response while logged in counts as activity.
      if (response.ok && useAuthStore.getState().token) {
        useAuthStore.getState().refreshActivity();
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    },
  });

  useEffect(() => {
    if (error) {
      logout();
      setLocation("/login");
    } else if (user && token) {
      setAuth(user, token);
    }
  }, [user, error, token, setAuth, logout, setLocation]);

  // Token present but user not loaded yet — show spinner
  if (token && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
