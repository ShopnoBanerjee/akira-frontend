import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import { ApiError, api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Me } from "./types";

export type AuthStatus =
  | "loading"
  | "signed-out"
  /** Signed in, but no active profile — an admin has to activate the account. */
  | "pending-activation"
  | "ready";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  me: Me | null;
  /** Why the profile could not be loaded, when status is pending-activation. */
  pendingReason: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [pendingReason, setPendingReason] = useState<string | null>(null);

  const loadProfile = useCallback(async (current: Session | null) => {
    if (!current) {
      setMe(null);
      setPendingReason(null);
      setStatus("signed-out");
      return;
    }
    try {
      const profile = await api.get<Me>("/users/me");
      setMe(profile);
      setPendingReason(null);
      setStatus("ready");
    } catch (error) {
      setMe(null);
      if (error instanceof ApiError && error.isPendingActivation) {
        // A real state, not a failure: the account exists and is waiting.
        setPendingReason(error.problem.detail);
        setStatus("pending-activation");
        return;
      }
      if (error instanceof ApiError && error.isUnauthenticated) {
        setStatus("signed-out");
        return;
      }
      setPendingReason(error instanceof Error ? error.message : "Could not load your profile.");
      setStatus("pending-activation");
    }
  }, []);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadProfile(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      // TOKEN_REFRESHED fires often and changes nothing about who this is.
      if (event === "TOKEN_REFRESHED") return;
      setStatus("loading");
      void loadProfile(next);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMe(null);
    setPendingReason(null);
    setStatus("signed-out");
    // Clear the path too. On a shared tablet the next person must not inherit
    // where the last one happened to be.
    window.history.replaceState({}, "", "/");
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  const value = useMemo(
    () => ({ status, session, me, pendingReason, signIn, signOut, refresh }),
    [status, session, me, pendingReason, signIn, signOut, refresh],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return context;
}
