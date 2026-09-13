import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError, api, setActor } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  insideOrganisation,
  readOpenedOrganisation,
  writeOpenedOrganisation,
  type OpenedOrganisation,
} from "./platformOrganisation";
import { needsSecondFactor, type Me } from "./types";

export type AuthStatus =
  | "loading"
  | "signed-out"
  /** Signed in, but no active profile — an admin has to activate the account. */
  | "pending-activation"
  /** Signed in with a password; this login must add its second factor (D33). */
  | "mfa-required"
  | "ready";

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  /**
   * Who the screens should treat as signed in. The same as `identity`, except
   * for a platform admin that has opened an organisation: then it is that
   * organisation's owner (D35), because that is what the API treats it as.
   */
  me: Me | null;
  /** Who actually signed in, whatever organisation is open. */
  identity: Me | null;
  /** The organisation the platform admin has opened, if any. */
  platformOrganisation: OpenedOrganisation | null;
  enterOrganisation: (organisation: OpenedOrganisation) => void;
  leaveOrganisation: () => void;
  /** Why the profile could not be loaded, when status is pending-activation. */
  pendingReason: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [identity, setIdentity] = useState<Me | null>(null);
  const [opened, setOpened] = useState<OpenedOrganisation | null>(() => readOpenedOrganisation());
  const [pendingReason, setPendingReason] = useState<string | null>(null);

  const forgetOpened = useCallback(() => {
    writeOpenedOrganisation(null);
    setOpened(null);
  }, []);

  const loadProfile = useCallback(
    async (current: Session | null) => {
      if (!current) {
        setIdentity(null);
        setPendingReason(null);
        setStatus("signed-out");
        return;
      }
      try {
        const profile = await api.get<Me>("/users/me");
        setIdentity(profile);
        // An opened organisation belongs to the platform login that opened it.
        // Anyone else signing in on this browser starts outside, always.
        if (!profile.is_platform_admin) forgetOpened();
        setPendingReason(null);
        // /users/me is the one call the API answers before the second factor;
        // everything else would come back as an mfa-required problem.
        setStatus(needsSecondFactor(profile) ? "mfa-required" : "ready");
      } catch (error) {
        setIdentity(null);
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
        if (error instanceof ApiError && error.isMfaRequired) {
          setStatus("mfa-required");
          return;
        }
        setPendingReason(error instanceof Error ? error.message : "Could not load your profile.");
        setStatus("pending-activation");
      }
    },
    [forgetOpened],
  );

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
      // The tablet is shared. Whatever the previous person's queries cached
      // must never be shown to the next person, in either direction - a
      // manager's outlet list surviving into a staff session is a data leak.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.clear();
      }
      if (event === "SIGNED_OUT") forgetOpened();
      setStatus("loading");
      void loadProfile(next);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, queryClient, forgetOpened]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    setIdentity(null);
    setPendingReason(null);
    setStatus("signed-out");
    forgetOpened();
    // Drop the PIN-minted actor with the session. Without this the token sat
    // in sessionStorage through a device sign-out, and the next person to sign
    // the shared tablet in resumed as the PREVIOUS staff member, no PIN asked
    // -- found by the P10 shakedown, and exactly what D3 forbids.
    setActor(null);
    // Clear the path too. On a shared tablet the next person must not inherit
    // where the last one happened to be.
    window.history.replaceState({}, "", "/");
  }, [queryClient, forgetOpened]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  // Every cached answer belongs to the view it was fetched in. Crossing into or
  // out of a customer must never show one organisation's data in another's
  // screen, or the platform's totals inside a customer.
  const enterOrganisation = useCallback(
    (organisation: OpenedOrganisation) => {
      writeOpenedOrganisation(organisation);
      queryClient.clear();
      setOpened(organisation);
    },
    [queryClient],
  );

  const leaveOrganisation = useCallback(() => {
    forgetOpened();
    queryClient.clear();
  }, [forgetOpened, queryClient]);

  const me = useMemo(
    () =>
      identity && opened && identity.is_platform_admin && status === "ready"
        ? insideOrganisation(identity, opened)
        : identity,
    [identity, opened, status],
  );
  const platformOrganisation = identity?.is_platform_admin ? opened : null;

  const value = useMemo(
    () => ({
      status,
      session,
      me,
      identity,
      platformOrganisation,
      enterOrganisation,
      leaveOrganisation,
      pendingReason,
      signIn,
      signOut,
      refresh,
    }),
    [
      status,
      session,
      me,
      identity,
      platformOrganisation,
      enterOrganisation,
      leaveOrganisation,
      pendingReason,
      signIn,
      signOut,
      refresh,
    ],
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
