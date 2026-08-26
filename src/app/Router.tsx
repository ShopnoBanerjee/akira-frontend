import { useEffect, useRef, useState } from "react";

import { Spinner, Wordmark } from "@/components/Brand";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { ROLE_LABELS, canOpenManagement, defaultShellFor } from "@/features/auth/types";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { FloorHomePage } from "@/features/floor/FloorHomePage";
import { AppShell } from "./AppShell";
import { FloorShell } from "./FloorShell";

/**
 * Minimal path-based routing.
 *
 * TanStack Router takes over in P3a, when there are enough real routes for its
 * loaders and type-safe params to earn their weight. Introducing it now would
 * mean scaffolding a route tree for three screens.
 */
function usePathname(): string {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return pathname;
}

function navigate(to: string) {
  window.history.replaceState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function PendingActivation({ reason }: { reason: string | null }) {
  const { signOut } = useAuth();
  return (
    <main className="flex min-h-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <Wordmark />
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Waiting for activation</h1>
        <p className="mt-2 text-sm text-akira-ink/60">
          {reason ??
            "Your account exists but has not been activated. An administrator needs to assign your role and outlet."}
        </p>
        <button
          onClick={() => void signOut()}
          className="mt-6 h-11 rounded-md border border-akira-ink/15 px-5 text-sm font-semibold hover:bg-akira-ink/5"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

function Forbidden({ intended }: { intended: string }) {
  const { me } = useAuth();
  return (
    <main className="flex min-h-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-akira-red">403</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight">Not available to your role</h1>
        <p className="mt-2 text-sm text-akira-ink/60">
          {me ? ROLE_LABELS[me.global_role] : "Your role"} cannot open{" "}
          <span className="font-mono">{intended}</span>.
        </p>
        <button
          onClick={() => navigate("/floor")}
          className="mt-6 h-11 rounded-md bg-akira-red px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Go to my checklists
        </button>
      </div>
    </main>
  );
}

export function Router() {
  const { status, me, pendingReason } = useAuth();
  const pathname = usePathname();

  // Send each person to the shell built for their role, once per sign-in.
  //
  // Keyed on who signed in rather than on the current path: a shared tablet
  // hands over from one person to the next without the URL changing, so a
  // manager signing in after a staff member would otherwise inherit /floor and
  // never reach the management UI.
  const redirectedFor = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || !me) {
      if (status === "signed-out") redirectedFor.current = null;
      return;
    }
    if (redirectedFor.current === me.profile_id) return;
    redirectedFor.current = me.profile_id;
    navigate(defaultShellFor(me.global_role));
  }, [status, me]);

  if (status === "loading") {
    return <Spinner label="Loading your account…" />;
  }
  if (status === "signed-out") {
    return <LoginPage />;
  }
  if (status === "pending-activation") {
    return <PendingActivation reason={pendingReason} />;
  }
  if (!me) return <Spinner label="Loading…" />;

  const isManagement = canOpenManagement(me.global_role);

  if (pathname.startsWith("/app")) {
    // A shift lead or staff member reaching /app gets an explanation, not a
    // silent redirect that looks like the app is broken.
    if (!isManagement) return <Forbidden intended={pathname} />;
    return (
      <AppShell>
        <DashboardPage />
      </AppShell>
    );
  }

  if (pathname.startsWith("/floor")) {
    return (
      <FloorShell>
        <FloorHomePage />
      </FloorShell>
    );
  }

  return <Spinner label="Redirecting…" />;
}
