import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler } from "../lib/client";
import { householdStore, tokenStore } from "../lib/token";
import type { AuthResult, User } from "../lib/types";

interface AuthValue {
  user: User | null;
  /** True until we know whether the stored token (if any) is still good. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.set(null);
    householdStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // pick up an existing sign-in when the app opens
  useEffect(() => {
    if (tokenStore.get() === null) return;
    let alive = true;
    api
      .get<{ user: User }>("/api/auth/me")
      .then((r) => alive && setUser(r.user))
      .catch(() => undefined) // a 401 already signed us out; other errors leave us on the sign-in screen
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const accept = useCallback((r: AuthResult) => {
    tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      logout,
      login: async (email, password) => accept(await api.post<AuthResult>("/api/auth/login", { email, password })),
      register: async (name, email, password) =>
        accept(await api.post<AuthResult>("/api/auth/register", { name, email, password })),
    }),
    [user, loading, logout, accept]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
