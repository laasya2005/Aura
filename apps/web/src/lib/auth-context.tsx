"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  apiFetch,
  setTokens,
  clearTokens,
  getTokens,
  hasLoginCookie,
  refreshAccessToken,
} from "./api";

interface User {
  id: string;
  plan: string;
  isNew: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    let { accessToken } = getTokens();

    // On page refresh, in-memory token is lost. If the login cookie exists,
    // try to get a new access token using the httpOnly refresh cookie.
    if (!accessToken && hasLoginCookie()) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearTokens();
        setUser(null);
        setLoading(false);
        return;
      }
      accessToken = getTokens().accessToken;
    }

    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch<User>("/users/me");
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        clearTokens();
        setUser(null);
      }
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (accessToken: string, _refreshToken: string, userData: User) => {
    // Refresh token is now stored in httpOnly cookie by the server
    setTokens(accessToken);
    // Fetch full profile (firstName, etc.) before setting user
    const res = await apiFetch<User>("/users/me");
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      setUser(userData);
    }
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Server will clear the httpOnly refresh token cookie
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors during logout
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
