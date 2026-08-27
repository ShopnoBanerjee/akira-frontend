import { useEffect, useRef, useState } from "react";

import { Spinner, Wordmark } from "@/components/Brand";
import { redirect } from "./navigate";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { ROLE_LABELS, canOpenManagement, defaultShellFor } from "@/features/auth/types";
import { DevicesPage } from "@/features/admin/devices/DevicesPage";
import { InventoryPage } from "@/features/admin/inventory/InventoryPage";
import { CountReviewPage } from "@/features/inventory/counts/CountReviewPage";
import { RequisitionPage } from "@/features/inventory/counts/RequisitionPage";
import { StockCountsPage } from "@/features/inventory/counts/StockCountsPage";
import { JobsPage } from "@/features/admin/jobs/JobsPage";
import { SettingsPage } from "@/features/admin/settings/SettingsPage";
import { OutletsPage } from "@/features/admin/outlets/OutletsPage";
import { UsersPage } from "@/features/admin/users/UsersPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { AssignmentsPage } from "@/features/sop/templates/AssignmentsPage";
import { TemplateBuilderPage } from "@/features/sop/templates/TemplateBuilderPage";
import { TemplatesPage } from "@/features/sop/templates/TemplatesPage";
import { ExceptionsPage } from "@/features/sop/review/ExceptionsPage";
import { ReviewDetailPage } from "@/features/sop/review/ReviewDetailPage";
import { ReviewQueuePage } from "@/features/sop/review/ReviewQueuePage";
import { ReferencePhotosPage } from "@/features/sop/reference/ReferencePhotosPage";
import { SalesPage } from "@/features/sales/SalesPage";
import { FloorHomePage } from "@/features/floor/FloorHomePage";
import { RunPage } from "@/features/floor/RunPage";
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
          onClick={() => redirect("/floor")}
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
    // Only redirect from the entry points. Sign-out resets the path to "/",
    // so a tablet handover still routes the next person to their own shell -
    // but someone opening a deep link like /app/settings/inventory keeps it.
    if (pathname === "/" || pathname === "/login") {
      redirect(defaultShellFor(me.global_role));
    }
  }, [status, me, pathname]);

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
    let page = <DashboardPage />;
    const reviewMatch = /^\/app\/sop\/review\/([0-9a-f-]{36})/.exec(pathname);
    const countMatch = /^\/app\/inventory\/counts\/([0-9a-f-]{36})/.exec(pathname);
    const requisitionMatch = /^\/app\/inventory\/requisitions\/([0-9a-f-]{36})/.exec(pathname);
    const builderMatch = /^\/app\/sop\/templates\/([0-9a-f-]{36})/.exec(pathname);
    if (builderMatch?.[1]) page = <TemplateBuilderPage templateId={builderMatch[1]} />;
    else if (pathname.startsWith("/app/sop/templates")) page = <TemplatesPage />;
    else if (pathname.startsWith("/app/sop/assignments")) page = <AssignmentsPage />;
    else if (reviewMatch?.[1]) page = <ReviewDetailPage runId={reviewMatch[1]} />;
    else if (pathname.startsWith("/app/sop/review")) page = <ReviewQueuePage />;
    else if (pathname.startsWith("/app/sop/exceptions")) page = <ExceptionsPage />;
    else if (pathname.startsWith("/app/sop/reference-photos")) page = <ReferencePhotosPage />;
    else if (pathname.startsWith("/app/sales")) page = <SalesPage />;
    else if (countMatch?.[1]) page = <CountReviewPage countId={countMatch[1]} />;
    else if (requisitionMatch?.[1]) page = <RequisitionPage requisitionId={requisitionMatch[1]} />;
    else if (pathname.startsWith("/app/inventory/counts")) page = <StockCountsPage />;
    else if (pathname.startsWith("/app/settings/outlets")) page = <OutletsPage />;
    else if (pathname.startsWith("/app/settings/users")) page = <UsersPage />;
    else if (pathname.startsWith("/app/settings/devices")) page = <DevicesPage />;
    else if (pathname.startsWith("/app/settings/inventory")) page = <InventoryPage />;
    else if (pathname.startsWith("/app/settings/jobs")) page = <JobsPage />;
    else if (pathname.startsWith("/app/settings")) page = <SettingsPage />;
    return <AppShell>{page}</AppShell>;
  }

  if (pathname.startsWith("/floor")) {
    const runMatch = /^\/floor\/run\/([0-9a-f-]{36})/.exec(pathname);
    return (
      <FloorShell>{runMatch?.[1] ? <RunPage runId={runMatch[1]} /> : <FloorHomePage />}</FloorShell>
    );
  }

  return <Spinner label="Redirecting…" />;
}
