// Shared API client used across pages and components to talk to the `/api`
// backend. Centralizes the auth-token lookup, base-path handling, header
// construction, and error shaping that were previously duplicated in every
// caller.

const API_BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

/**
 * Reads the bearer token persisted by the Zustand auth store in localStorage.
 * Returns null when no token is stored or the value is malformed.
 */
export function getAuthToken(): string | null {
  try {
    return JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.token ?? null;
  } catch {
    return null;
  }
}

/** Builds request headers, attaching the bearer token when available. */
export function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/**
 * Fetches JSON from the `/api` backend. Prefixes the base path, attaches auth
 * headers, and throws an Error carrying the server-provided message on non-2xx
 * responses.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: authHeaders(options?.headers),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
