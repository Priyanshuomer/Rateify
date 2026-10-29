import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { refreshSession, tokenStore } from "@/api/client";
import { authApi } from "@/api/endpoints";
import type { Address, ProfileBundle, ProfileCompletion, PublicUser } from "@/types/api";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthState {
  status: Status;
  user: PublicUser | null;
  /** primary address */
  address: Address | null;
  /** every saved address */
  addresses: Address[];
  completion: ProfileCompletion | null;
  /** Store tokens, then load /auth/me */
  startSession: (accessToken: string, refreshToken: string) => Promise<ProfileBundle>;
  setBundle: (b: Partial<ProfileBundle>) => void;
  logout: () => Promise<void>;
  clearLocal: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

let bootPromise: Promise<ProfileBundle | null> | null = null;
function bootOnce() {
  if (!bootPromise) {
    bootPromise = (async () => {
      if (!tokenStore.getRefresh()) return null;
      try {
        await refreshSession();
        return await authApi.me();
      } catch {
        tokenStore.clear();
        return null;
      }
    })();
  }
  return bootPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);

  const apply = useCallback((b: Partial<ProfileBundle>) => {
    if (b.user) setUser(b.user);
    if ("address" in b) setAddress(b.address ?? null);
    if (b.addresses) setAddresses(b.addresses);
    if (b.profileCompletion) setCompletion(b.profileCompletion);
  }, []);

  // Wipes everything tied to the previous session (also used for forced logouts from the API client)
  const clearLocal = useCallback(() => {
    bootPromise = null;
    setUser(null);
    setAddress(null);
    setAddresses([]);
    setCompletion(null);
    setStatus("anonymous");
    qc.clear();
  }, [qc]);

  useEffect(() => {
    let alive = true;
    bootOnce().then((b) => {
      if (!alive) return;
      if (b) {
        apply(b);
        setStatus("authenticated");
      } else setStatus("anonymous");
    });
    const off = tokenStore.onCleared(() => clearLocal());
    return () => {
      alive = false;
      off();
    };
  }, [apply, clearLocal]);

  const startSession = useCallback(
    async (a: string, r: string) => {
      tokenStore.setTokens(a, r);
      bootPromise = null; // a stale boot result must never override a fresh login
      const b = await authApi.me();
      apply(b);
      setStatus("authenticated");
      return b;
    },
    [apply],
  );

  const logout = useCallback(async () => {
    const rt = tokenStore.getRefresh();
    try {
      await authApi.logout(rt);
    } catch {
      /* ignore: we are leaving anyway */
    }
    tokenStore.clear();
    clearLocal();
  }, [clearLocal]);

  const value = useMemo(
    () => ({ status, user, address, addresses, completion, startSession, setBundle: apply, logout, clearLocal }),
    [status, user, address, addresses, completion, startSession, apply, logout, clearLocal],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}