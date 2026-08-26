import type { ReactNode } from "react";

import { Wordmark } from "@/components/Brand";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Mobile-first staff shell, used one-handed on a shared tablet in a bright
 * kitchen. Single column, large tap targets, minimal chrome.
 *
 * The tablet is shared, so the current actor is always on screen: whoever
 * picks it up next must be able to see, at a glance, who the app thinks they
 * are.
 */
export function FloorShell({ children }: { children: ReactNode }) {
  const { me, signOut } = useAuth();
  const outlet = me?.outlets.find((o) => o.is_primary) ?? me?.outlets[0];

  return (
    <div className="floor-shell flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-akira-ink/10 bg-white px-4 py-3">
        <div>
          <Wordmark compact />
          <p className="mt-0.5 text-[13px] font-medium text-akira-ink/70">
            {outlet?.name ?? "No outlet assigned"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold">{me?.full_name}</p>
          <button
            onClick={() => void signOut()}
            className="min-h-[48px] text-xs font-semibold text-akira-blue"
          >
            Hand over
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-[#faf9f8]">{children}</div>
    </div>
  );
}
