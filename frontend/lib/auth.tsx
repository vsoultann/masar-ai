"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, getToken, setToken } from "@/lib/api";
import type { Lang, TokenResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    fullName: string,
    language: Lang,
  ) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.get<User>("/api/auth/me"));
    } catch {
      // An expired or tampered token is indistinguishable from no token here,
      // and either way the right move is to drop it and show a signed-out UI.
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<TokenResponse>(
      "/api/auth/login",
      { email, password },
      false,
    );
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string, language: Lang) => {
      const response = await api.post<TokenResponse>(
        "/api/auth/register",
        { email, password, full_name: fullName, preferred_language: language },
        false,
      );
      setToken(response.access_token);
      setUser(response.user);
      return response.user;
    },
    [],
  );

  const logout = useCallback(() => {
    void api.post("/api/auth/logout").catch(() => undefined);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, register, logout, refresh }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
