import { useEffect, useRef, useState } from "react";

import { Spinner, Wordmark } from "@/components/Brand";
import { redirect } from "./navigate";
import { useAuth } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { MfaPage } from "@/features/auth/MfaPage";
import { OnboardingPage } from "@/features/onboarding/OnboardingPage";
import { OrganisationPage } from "@/features/platform/OrganisationPage";
import { PlatformDashboard } from "@/features/platform/PlatformDashboard";
import { PlatformShell } from "@/features/platform/PlatformShell";
import { ROLE_LABELS, canOpenManagement, defaultShellFor } from "@/features/auth/types";
import { DevicesPage } from "@/features/admin/devices/DevicesPage";
import { InventoryPage } from "@/features/admin/inventory/InventoryPage";
import { RecipesPage } from "@/features/admin/inventory/RecipesPage";
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
import { FloorTrainingGate, ManagementTrainingGate } from "@/features/training/TrainingGate";
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

/** The management page for a /app path. Shared by an organisation's own
 * managers and by the platform once it has opened that organisation. */
function appPage(pathname: string) {
  const reviewMatch = /^\/app\/sop\/review\/([0-9a-f-]{36})/.exec(pathname);
  const countMatch = /^\/app\/inventory\/counts\/([0-9a-f-]{36})/.exec(pathname);
  const requisitionMatch = /^\/app\/inventory\/requisitions\/([0-9a-f-]{36})/.exec(pathname);
  const builderMatch = /^\/app\/sop\/templates\/([0-9a-f-]{36})/.exec(pathname);
  if (builderMatch?.[1]) return <TemplateBuilderPage templateId={builderMatch[1]} />;
  if (pathname.startsWith("/app/sop/templates")) return <TemplatesPage />;
  if (pathname.startsWith("/app/sop/assignments")) return <AssignmentsPage />;
  if (reviewMatch?.[1]) return <ReviewDetailPage runId={reviewMatch[1]} />;
  if (pathname.startsWith("/app/sop/review")) return <ReviewQueuePage />;
  if (pathname.startsWith("/app/sop/exceptions")) return <ExceptionsPage />;
  if (pathname.startsWith("/app/sop/reference-photos")) return <ReferencePhotosPage />;
  if (pathname.startsWith("/app/sales")) return <SalesPage />;
  if (countMatch?.[1]) return <CountReviewPage countId={countMatch[1]} />;
  if (requisitionMatch?.[1]) return <RequisitionPage requisitionId={requisitionMatch[1]} />;
  if (pathname.startsWith("/app/inventory/counts")) return <StockCountsPage />;
  if (pathname.startsWith("/app/onboarding")) return <OnboardingPage />;
  if (pathname.startsWith("/app/settings/outlets")) return <OutletsPage />;
  if (pathname.startsWith("/app/settings/users")) return <UsersPage />;
  if (pathname.startsWith("/app/settings/devices")) return <DevicesPage />;
  if (pathname.startsWith("/app/settings/recipes")) return <RecipesPage />;
  if (pathname.startsWith("/app/settings/inventory")) return <InventoryPage />;
  if (pathname.startsWith("/app/settings/jobs")) return <JobsPage />;
  if (pathname.startsWith("/app/settings")) return <SettingsPage />;
  return <DashboardPage />;
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
  const { status, me, identity, platformOrganisation, pendingReason } = useAuth();
  const pathname = usePathname();

  // Send each person to the shell built for their role, once per sign-in.
  //
  // Keyed on who signed in rather than on the current path: a shared tablet
  // hands over from one person to the next without the URL changing, so a
  // manager signing in after a staff member would otherwise inherit /floor and
  // never reach the management UI.
  const redirectedFor = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || !identity) {
      if (status === "signed-out") redirectedFor.current = null;
      return;
    }
    if (redirectedFor.current === identity.profile_id) return;
    redirectedFor.current = identity.profile_id;
    // Only redirect from the entry points. Sign-out resets the path to "/",
    // so a tablet handover still routes the next person to their own shell -
    // but someone opening a deep link like /app/settings/inventory keeps it.
    if (pathname === "/" || pathname === "/login") {
      redirect(defaultShellFor(identity.global_role));
    }
  }, [status, identity, pathname]);

  if (status === "loading") {
    return <Spinner label="Loading your account…" />;
  }
  if (status === "signed-out") {
    return <LoginPage />;
  }
  if (status === "pending-activation") {
    return <PendingActivation reason={pendingReason} />;
  }
  if (status === "mfa-required") {
    return <MfaPage />;
  }
  if (!me || !identity) return <Spinner label="Loading…" />;

  if (identity.is_platform_admin) {
    // Inside an organisation it opened, the platform uses that organisation's
    // own screens as its owner (D35). There is no training gate: the tour is
    // for the people who work there, not for the vendor passing through.
    if (platformOrganisation && pathname.startsWith("/app")) {
      return <AppShell>{appPage(pathname)}</AppShell>;
    }
    // Otherwise the platform's own console, wherever it arrived from —
    // including a tab left on /app by the previous person.
    const organisationMatch = /^\/platform\/organisations\/([0-9a-f-]{36})/.exec(pathname);
    return (
      <PlatformShell>
        {organisationMatch?.[1] ? (
          <OrganisationPage organisationId={organisationMatch[1]} />
        ) : (
          <PlatformDashboard />
        )}
      </PlatformShell>
    );
  }
  if (pathname.startsWith("/platform")) return <Forbidden intended={pathname} />;

  if (pathname.startsWith("/app")) {
    // A shift lead or staff member reaching /app gets an explanation, not a
    // silent redirect that looks like the app is broken.
    if (!canOpenManagement(me.global_role)) return <Forbidden intended={pathname} />;
    return (
      <AppShell>
        <ManagementTrainingGate>{appPage(pathname)}</ManagementTrainingGate>
      </AppShell>
    );
  }

  if (pathname.startsWith("/floor")) {
    const runMatch = /^\/floor\/run\/([0-9a-f-]{36})/.exec(pathname);
    return (
      <FloorShell>
        <FloorTrainingGate>
          {runMatch?.[1] ? <RunPage runId={runMatch[1]} /> : <FloorHomePage />}
        </FloorTrainingGate>
      </FloorShell>
    );
  }

  return <Spinner label="Redirecting…" />;
}
