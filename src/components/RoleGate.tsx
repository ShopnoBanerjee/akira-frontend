import type { ReactNode } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import type { UserRole } from "@/features/auth/types";

/** True when the signed-in user holds one of these global roles. */
export function useHasRole(...roles: UserRole[]): boolean {
  const { me } = useAuth();
  return me != null && roles.includes(me.global_role);
}

/** True when the user can see the given outlet. */
export function useCanAccessOutlet(outletId: string | null | undefined): boolean {
  const { me } = useAuth();
  if (!me || !outletId) return false;
  if (me.is_global) return true;
  return me.outlets.some((o) => o.outlet_id === outletId);
}

interface RoleGateProps {
  roles: UserRole[];
  children: ReactNode;
  /**
   * Rendered instead of the children when the role does not match. Prefer
   * showing a disabled control with an explanation over hiding it entirely —
   * permission rules people cannot see are permission rules they will fight.
   */
  fallback?: ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const allowed = useHasRole(...roles);
  return <>{allowed ? children : fallback}</>;
}
