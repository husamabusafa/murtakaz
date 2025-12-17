"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DemoUser } from "@/lib/demo-users";

type AuthContextValue = {
  user: DemoUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/session", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { user?: DemoUser | null } | null;
      setUser(data?.user ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/session/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    window.location.href = "/";
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, loading, refresh, signOut }), [loading, refresh, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

