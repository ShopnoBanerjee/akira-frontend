import { useEffect, useState, type ReactNode } from "react";

import { Wordmark } from "@/components/Brand";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/features/auth/types";
import { TOUR_RERUN_EVENT } from "@/features/training/TrainingGate";
import { TOUR_NAV_EVENT } from "@/features/training/TourOverlay";
import { cn } from "@/lib/utils";
import { navigate } from "./navigate";

const NAV = [
  { label: "Dashboard", to: "/app", tour: "nav-dashboard" },
  { label: "Getting started", to: "/app/onboarding", tour: "nav-onboarding" },
  { label: "SOP Templates", to: "/app/sop/templates", tour: "nav-sop-templates" },
  { label: "Review Queue", to: "/app/sop/review", tour: "nav-review" },
  { label: "Exceptions", to: "/app/sop/exceptions", tour: "nav-exceptions" },
  { label: "Sales", to: "/app/sales", tour: "nav-sales" },
  { label: "Stock Counts", to: "/app/inventory/counts", tour: "nav-stock-counts" },
  { label: "Assignments", to: "/app/sop/assignments", tour: "nav-assignments" },
  { label: "Reference Photos", to: "/app/sop/reference-photos", tour: "nav-reference-photos" },
  { label: "Outlets", to: "/app/settings/outlets", tour: "nav-outlets" },
  { label: "People", to: "/app/settings/users", tour: "nav-people" },
  { label: "Tablets", to: "/app/settings/devices", tour: "nav-tablets" },
  { label: "Inventory", to: "/app/settings/inventory", tour: "nav-inventory" },
  { label: "Recipes", to: "/app/settings/recipes", tour: "nav-recipes" },
  { label: "Settings", to: "/app/settings", tour: "nav-settings" },
  { label: "Job Runs", to: "/app/settings/jobs", tour: "nav-job-runs" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = window.location.pathname;
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active = item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
        return (
          <a
            key={item.to}
            href={item.to}
            data-tour={item.tour}
            aria-current={active ? "page" : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(item.to);
              onNavigate?.();
            }}
            className={cn(
              "flex min-h-[40px] items-center rounded-md px-3 py-2 text-sm text-akira-ink hover:bg-akira-ink/5",
              active && "bg-akira-ink/6 font-semibold",
            )}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}

function Footer({ onNavigate }: { onNavigate?: () => void }) {
  const { me, signOut } = useAuth();
  return (
    <div className="border-t border-akira-ink/10 px-5 py-4">
      <p className="truncate text-sm font-medium">{me?.full_name}</p>
      <p className="text-xs text-akira-ink/50">
        {me ? ROLE_LABELS[me.global_role] : ""}
        {me?.organisation ? ` · ${me.organisation.name}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <button
          data-tour="signout"
          onClick={() => void signOut()}
          className="min-h-[32px] text-xs font-semibold text-akira-blue hover:underline"
        >
          Sign out
        </button>
        <button
          onClick={() => {
            onNavigate?.();
            window.dispatchEvent(new Event(TOUR_RERUN_EVENT));
          }}
          className="min-h-[32px] text-xs font-semibold text-akira-ink/50 hover:text-akira-ink"
        >
          Show me around
        </button>
      </div>
    </div>
  );
}

/**
 * Management shell. A sidebar from the md breakpoint up; below it, a menu
 * button and a drawer, because managers reach this from phones and tablets
 * too (D31). The training tour opens the drawer itself when it needs to
 * point at a menu entry.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onTour = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      setMenuOpen(Boolean(detail?.open));
    };
    window.addEventListener(TOUR_NAV_EVENT, onTour);
    return () => window.removeEventListener(TOUR_NAV_EVENT, onTour);
  }, []);

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-akira-ink/10 bg-white md:flex">
        <div className="px-5 py-5">
          <Wordmark />
        </div>
        <NavLinks />
        <Footer />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-akira-ink/10 bg-white px-4 py-2.5 md:hidden">
          <button
            data-tour="menu"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-akira-ink hover:bg-akira-ink/5"
          >
            <span aria-hidden="true" className="flex flex-col gap-[5px]">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
          <Wordmark compact />
          <button
            onClick={() => void signOut()}
            className="min-h-[44px] px-2 text-xs font-semibold text-akira-blue"
          >
            Sign out
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-[#faf9f8]">{children}</div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-label="Menu">
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-akira-ink/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Wordmark />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="min-h-[44px] min-w-[44px] rounded-md text-akira-ink/60 hover:bg-akira-ink/5"
              >
                ✕
              </button>
            </div>
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <Footer onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
