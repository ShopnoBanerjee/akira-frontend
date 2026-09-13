import { PLATFORM_ORGANISATION_KEY } from "@/lib/api";
import type { Me } from "./types";

/** What the web app remembers about the organisation the platform opened (D35). */
export interface OpenedOrganisation {
  id: string;
  name: string;
  slug: string;
  onboarded: boolean;
}

export function readOpenedOrganisation(): OpenedOrganisation | null {
  try {
    const raw = sessionStorage.getItem(PLATFORM_ORGANISATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenedOrganisation>;
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string") return null;
    return {
      id: parsed.id,
      name: parsed.name,
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      onboarded: Boolean(parsed.onboarded),
    };
  } catch {
    return null;
  }
}

export function writeOpenedOrganisation(organisation: OpenedOrganisation | null): void {
  try {
    if (organisation) {
      sessionStorage.setItem(PLATFORM_ORGANISATION_KEY, JSON.stringify(organisation));
    } else {
      sessionStorage.removeItem(PLATFORM_ORGANISATION_KEY);
    }
  } catch {
    // Storage unavailable (private mode); the state still lives in memory.
  }
}

/**
 * The platform admin as an organisation's screens should see it once it has
 * opened that organisation: its owner.
 *
 * The API makes exactly the same move for every request carrying
 * X-Organisation, so the screens and the server agree about what may be done.
 * Nothing here grants anything the API would refuse — it only stops the
 * screens hiding controls the platform is in fact allowed to use.
 */
export function insideOrganisation(identity: Me, organisation: OpenedOrganisation): Me {
  return {
    ...identity,
    global_role: "owner",
    is_management: true,
    is_global: true,
    is_platform_admin: false,
    can_restart_training: true,
    // An owner reaches every outlet without memberships; the pickers fall back
    // to the organisation's own outlet list, which the API scopes.
    outlets: [],
    organisation: {
      organisation_id: organisation.id,
      slug: organisation.slug,
      name: organisation.name,
      onboarded: organisation.onboarded,
    },
  };
}
