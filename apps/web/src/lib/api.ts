"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Access token stored in-memory only (not sessionStorage) to reduce XSS attack surface
let accessToken: string | null = null;

export function setTokens(access: string, _refresh?: string) {
  accessToken = access;
  if (typeof window !== "undefined") {
    // Set a flag for Next.js middleware route protection.
    // SameSite=Lax is required so the cookie survives cross-site redirects
    // (e.g., returning from Stripe Checkout).
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `aura_logged_in=true; path=/; max-age=86400; SameSite=Lax${secure}`;
  }
}

export function getTokens(): { accessToken: string | null } {
  return { accessToken };
}

export function hasLoginCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("aura_logged_in=true");
}

export { refreshAccessToken };

export function clearTokens() {
  accessToken = null;
  if (typeof window !== "undefined") {
    document.cookie = "aura_logged_in=; path=/; max-age=0";
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // Deduplicate concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // Refresh token is sent automatically via httpOnly cookie
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (!res.ok) {
        clearTokens();
        return false;
      }

      const data = await res.json();
      setTokens(data.data.accessToken);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: Record<string, unknown>;
}> {
  const { accessToken: token } = getTokens();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type when there is an actual body to send
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    let res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // Auto-refresh on 401 (single attempt only)
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const newTokens = getTokens();
        headers["Authorization"] = `Bearer ${newTokens.accessToken}`;
        res = await fetch(`${API_URL}${path}`, {
          ...options,
          headers,
          credentials: "include",
        });
      } else {
        // Refresh failed — redirect to login
        if (typeof window !== "undefined" && !path.includes("/auth/")) {
          window.location.href = "/login";
        }
        return { success: false, error: { code: "UNAUTHORIZED", message: "Session expired" } };
      }
    }

    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return { success: true };
    }

    const json = await res.json();
    return json;
  } catch {
    return { success: false, error: { code: "NETWORK_ERROR", message: "Network request failed" } };
  }
}
