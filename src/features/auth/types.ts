import type { components } from "@/types/api";

/** Generated from the API's OpenAPI schema — never hand-written. */
export type Me = components["schemas"]["MeResponse"];
export type OutletSummary = components["schemas"]["OutletSummary"];
export type OrganisationSummary = components["schemas"]["OrganisationSummary"];
export type UserRole = components["schemas"]["UserRole"];

/** Roles that belong in the /app management shell. The platform admin may
 * open it too, read-only (D33), but lands in /platform. */
export const MANAGEMENT_ROLES: readonly UserRole[] = [
  "owner",
  "ops_manager",
  "outlet_manager",
  "platform_admin",
];

/** Roles that see every outlet without an explicit membership. */
export const GLOBAL_ROLES: readonly UserRole[] = ["owner", "ops_manager"];

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  ops_manager: "Operations Manager",
  outlet_manager: "Outlet Manager",
  shift_lead: "Shift Lead",
  staff: "Staff",
  platform_admin: "Platform Admin",
};

/**
 * The shell a role lands in after signing in.
 *
 * Deliberately a pure function of the role, never of the current URL. A shared
 * tablet hands over from one person to the next without navigating, so a
 * manager signing in after a staff member would otherwise inherit /floor and
 * never reach the management UI.
 */
export function defaultShellFor(role: UserRole): "/app" | "/floor" | "/platform" {
  if (role === "platform_admin") return "/platform";
  return MANAGEMENT_ROLES.includes(role) ? "/app" : "/floor";
}

/** The session must present a second factor before the app opens (D33). */
export function needsSecondFactor(me: Pick<Me, "mfa_required" | "mfa_verified">): boolean {
  return me.mfa_required && !me.mfa_verified;
}

/** Whether a role may open the management shell at all. */
export function canOpenManagement(role: UserRole): boolean {
  return MANAGEMENT_ROLES.includes(role);
}
