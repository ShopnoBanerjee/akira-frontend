import type { ReactNode } from "react";

import { Wordmark } from "@/components/Brand";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/features/auth/types";

const NAV = [
  { label: "Dashboard", to: "/app", ready: true },
  { label: "SOP Templates", to: "/app/sop/templates", ready: true },
  { label: "Review Queue", to: "/app/sop/review", ready: true },
  { label: "Exceptions", to: "/app/sop/exceptions", ready: true },
  { label: "Assignments", to: "/app/sop/assignments", ready: true },
  { label: "Reference Photos", to: "/app/sop/reference-photos", ready: true },
  { label: "Outlets", to: "/app/settings/outlets", ready: true },
  { label: "People", to: "/app/settings/users", ready: true },
  { label: "Tablets", to: "/app/settings/devices", ready: true },
  { label: "Inventory", to: "/app/settings/inventory", ready: true },
  { label: "Settings", to: "/app/settings", ready: true },
  { label: "Job Runs", to: "/app/settings/jobs", ready: true },
];

/** Desktop-first management shell. Sidebar, data tables, dashboards. */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, signOut } = useAuth();

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-akira-ink/10 bg-white md:flex">
        <div className="px-5 py-5">
          <Wordmark />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map((item) => (
            <a
              key={item.to}
              href={item.ready ? item.to : undefined}
              aria-disabled={!item.ready}
              onClick={(e) => {
                if (!item.ready) return;
                e.preventDefault();
                window.history.pushState({}, "", item.to);
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
              title={item.ready ? undefined : "Arrives in a later epic"}
              className={
                "flex items-center justify-between rounded-md px-3 py-2 text-sm " +
                (item.ready
                  ? "text-akira-ink hover:bg-akira-ink/5"
                  : "cursor-not-allowed text-akira-ink/30")
              }
            >
              {item.label}
              {!item.ready && <span className="text-[10px] uppercase tracking-wider">soon</span>}
            </a>
          ))}
        </nav>

        <div className="border-t border-akira-ink/10 px-5 py-4">
          <p className="truncate text-sm font-medium">{me?.full_name}</p>
          <p className="text-xs text-akira-ink/50">{me ? ROLE_LABELS[me.global_role] : ""}</p>
          <button
            onClick={() => void signOut()}
            className="mt-2 text-xs font-semibold text-akira-blue hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-akira-ink/10 bg-white px-5 py-3 md:hidden">
          <Wordmark compact />
          <button onClick={() => void signOut()} className="text-xs font-semibold text-akira-blue">
            Sign out
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-[#faf9f8]">{children}</div>
      </div>
    </div>
  );
}
