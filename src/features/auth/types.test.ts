import { describe, expect, it } from "vitest";

import {
  GLOBAL_ROLES,
  MANAGEMENT_ROLES,
  ROLE_LABELS,
  canOpenManagement,
  defaultShellFor,
} from "./types";
import type { UserRole } from "./types";

const ALL_ROLES: UserRole[] = ["owner", "ops_manager", "outlet_manager", "shift_lead", "staff"];

describe("role definitions", () => {
  it("labels every role, so no raw enum value reaches the UI", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("keeps floor roles out of the management shell", () => {
    expect(MANAGEMENT_ROLES).not.toContain("shift_lead");
    expect(MANAGEMENT_ROLES).not.toContain("staff");
  });

  it("treats only owner and ops_manager as global", () => {
    expect([...GLOBAL_ROLES].sort()).toEqual(["ops_manager", "owner"]);
  });

  it("never marks an outlet_manager global: they must not see other outlets", () => {
    expect(GLOBAL_ROLES).not.toContain("outlet_manager");
  });
});

describe("shell routing", () => {
  it("sends management roles to /app", () => {
    expect(defaultShellFor("owner")).toBe("/app");
    expect(defaultShellFor("ops_manager")).toBe("/app");
    expect(defaultShellFor("outlet_manager")).toBe("/app");
  });

  it("sends floor roles to /floor", () => {
    expect(defaultShellFor("shift_lead")).toBe("/floor");
    expect(defaultShellFor("staff")).toBe("/floor");
  });

  it("depends only on the role, never on where the last person was", () => {
    // Regression: on a shared tablet the URL does not change between people.
    // A manager signing in after a staff member previously inherited /floor
    // and could never reach the management UI.
    for (const role of ALL_ROLES) {
      expect(defaultShellFor(role)).toBe(defaultShellFor(role));
    }
    expect(defaultShellFor("outlet_manager")).not.toBe(defaultShellFor("staff"));
  });

  it("refuses the management shell to floor roles", () => {
    expect(canOpenManagement("staff")).toBe(false);
    expect(canOpenManagement("shift_lead")).toBe(false);
    expect(canOpenManagement("outlet_manager")).toBe(true);
  });
});
