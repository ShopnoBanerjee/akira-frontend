import type { components } from "@/types/api";

/** Generated from the API's OpenAPI schema — never hand-written. */
export type Me = components["schemas"]["MeResponse"];
export type OutletSummary = components["schemas"]["OutletSummary"];
export type UserRole = components["schemas"]["UserRole"];

/** Roles that belong in the /app management shell. */
export const MANAGEMENT_ROLES: readonly UserRole[] = ["owner", "ops_manager", "outlet_manager"];

/** Roles that see every outlet without an explicit membership. */
export const GLOBAL_ROLES: readonly UserRole[] = ["owner", "ops_manager"];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  ops_manager: "Operations Manager",
  outlet_manager: "Outlet Manager",
  shift_lead: "Shift Lead",
  staff: "Staff",
};

/**
 * The shell a role lands in after signing in.
 *
 * Deliberately a pure function of the role, never of the current URL. A shared
 * tablet hands over from one person to the next without navigating, so a
 * manager signing in after a staff member would otherwise inherit /floor and
 * never reach the management UI.
 */
export function defaultShellFor(role: UserRole): "/app" | "/floor" {
  return MANAGEMENT_ROLES.includes(role) ? "/app" : "/floor";
}

/** Whether a role may open the management shell at all. */
export function canOpenManagement(role: UserRole): boolean {
  return MANAGEMENT_ROLES.includes(role);
}
