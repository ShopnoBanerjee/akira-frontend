import type { ReactNode } from "react";

import { Wordmark } from "@/components/Brand";
import { navigate } from "@/app/navigate";
import { useAuth } from "@/features/auth/AuthProvider";

/** The vendor's console (D35): above every organisation, belonging to none. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const { identity, signOut } = useAuth();
  return (
    <div className="flex h-full flex-col bg-[#faf9f8]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-akira-ink/10 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Wordmark compact />
          <span className="rounded bg-akira-ink px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white">
            Platform
          </span>
          <nav>
            <a
              href="/platform"
              onClick={(e) => {
                e.preventDefault();
                navigate("/platform");
              }}
              className="min-h-[32px] text-sm font-semibold text-akira-ink hover:underline"
            >
              Organisations
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-akira-ink/60">{identity?.full_name}</span>
          <button
            onClick={() => void signOut()}
            className="min-h-[32px] text-xs font-semibold text-akira-blue hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
