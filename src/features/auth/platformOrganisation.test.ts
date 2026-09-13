import { afterEach, describe, expect, it } from "vitest";

import {
  insideOrganisation,
  readOpenedOrganisation,
  writeOpenedOrganisation,
} from "./platformOrganisation";
import type { Me } from "./types";

const PLATFORM: Me = {
  profile_id: "p-1",
  full_name: "AKIRA Platform",
  email: "platform@example.com",
  phone: null,
  employee_code: null,
  global_role: "platform_admin",
  is_active: true,
  is_management: false,
  is_global: false,
  is_platform_admin: true,
  organisation: null,
  mfa_required: true,
  mfa_verified: true,
  has_pin: false,
  can_restart_training: false,
  outlets: [],
  device: null,
};

const OPENED = { id: "org-1", name: "Sakura Kitchens", slug: "sakura", onboarded: true };

describe("the platform inside an organisation", () => {
  afterEach(() => sessionStorage.clear());

  it("is that organisation's owner to the screens, as it is to the API", () => {
    const me = insideOrganisation(PLATFORM, OPENED);
    expect(me.global_role).toBe("owner");
    expect(me.is_global).toBe(true);
    expect(me.is_management).toBe(true);
    // Not the platform any more: nothing inside may treat it as unfiltered.
    expect(me.is_platform_admin).toBe(false);
    expect(me.organisation).toEqual({
      organisation_id: "org-1",
      slug: "sakura",
      name: "Sakura Kitchens",
      onboarded: true,
    });
  });

  it("keeps who actually signed in", () => {
    const me = insideOrganisation(PLATFORM, OPENED);
    expect(me.profile_id).toBe("p-1");
    expect(me.full_name).toBe("AKIRA Platform");
    expect(me.mfa_required).toBe(true);
  });

  it("remembers the opened organisation for the tab, and forgets it on request", () => {
    expect(readOpenedOrganisation()).toBeNull();
    writeOpenedOrganisation(OPENED);
    expect(readOpenedOrganisation()).toEqual(OPENED);
    writeOpenedOrganisation(null);
    expect(readOpenedOrganisation()).toBeNull();
  });

  it("ignores a stored value that is not an organisation", () => {
    sessionStorage.setItem("akira.platformOrganisation", JSON.stringify({ name: "no id" }));
    expect(readOpenedOrganisation()).toBeNull();
  });
});
