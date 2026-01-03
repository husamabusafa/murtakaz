"use client";

import { createContext, useContext } from "react";
import { authClient } from "@/lib/auth-client";

type AuthContextValue = {
  user: typeof authClient.$Infer.Session.user | null;
  session: typeof authClient.$Infer.Session.session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();

  const refresh = async () => {
    // Better Auth client handles refresh automatically or we can force refetch if needed
    // Typically just re-mounting or invalidating works, but useSession handles subscriptions
    // For now, we can leave this as a no-op or implement specific logic if required
  };

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  const value: AuthContextValue = {
    user: data?.user ?? null,
    session: data?.session ?? null,
    loading: isPending,
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

