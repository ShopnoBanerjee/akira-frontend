import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ useOrganisation: vi.fn(), useUpdateOrganisation: vi.fn() }));
vi.mock("./api", () => hooks);

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/app/navigate", () => ({ navigate }));

const enterOrganisation = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => ({ enterOrganisation }) }));

import { OrganisationPage } from "./OrganisationPage";

const ID = "11111111-1111-4111-8111-111111111111";

const DETAIL = {
  organisation_id: ID,
  slug: "sakura",
  name: "Sakura Kitchens",
  is_active: true,
  onboarded_at: null,
  created_at: "2026-09-10T00:00:00Z",
  owners: 1,
  usage: {
    outlets: { used: 3, allowed: 10 },
    people: { used: 12, allowed: 100 },
    tablets: { used: 2, allowed: 10 },
    checklist_templates: 5,
    active_assignments: 4,
    runs_30d: 60,
    runs_approved_30d: 50,
    runs_missed_30d: 2,
    uploads_30d: 4,
    last_upload_at: null,
    bills_30d: 300,
    net_sales_30d_paise: 90_000_00,
    last_activity_at: null,
  },
  people_by_role: { owner: 1, staff: 11 },
  outlets: [
    {
      outlet_id: "o-1",
      code: "SAK-01",
      name: "Sakura Park Street",
      city: "Kolkata",
      is_active: true,
      tablets: 1,
      active_assignments: 4,
      runs_30d: 60,
      bills_30d: 300,
      net_sales_30d_paise: 90_000_00,
      last_upload_at: null,
      onboarding_done: 5,
      onboarding_total: 7,
    },
  ],
  owner_logins: [
    {
      profile_id: "p-9",
      full_name: "Mei Owner",
      email: "mei@example.com",
      is_active: true,
      last_seen_at: null,
    },
  ],
  recent_activity: [],
};

function mockUpdate() {
  const mutate = vi.fn();
  hooks.useUpdateOrganisation.mockReturnValue({ mutate, isPending: false });
  return mutate;
}

function panel(title: RegExp): HTMLElement {
  return screen.getByRole("heading", { name: title }).closest("section")!;
}

describe("OrganisationPage", () => {
  beforeEach(() => {
    navigate.mockReset();
    enterOrganisation.mockReset();
    hooks.useOrganisation.mockReturnValue({ isPending: false, isError: false, data: DETAIL });
  });

  it("shows usage against allowance, checklists and sales", () => {
    mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    expect(screen.getByRole("heading", { name: "Sakura Kitchens" })).toBeInTheDocument();
    expect(screen.getByText(/4 assigned to outlets/)).toBeInTheDocument();
    expect(screen.getByText(/50 approved · 2 missed/)).toBeInTheDocument();
    expect(screen.getByText("5 of 7 essentials")).toBeInTheDocument();
    expect(screen.getByText("mei@example.com")).toBeInTheDocument();
  });

  it("saves only the details that changed", () => {
    const mutate = mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    const details = panel(/^details$/i);
    fireEvent.change(within(details).getByLabelText(/^name$/i), {
      target: { value: "Sakura Group" },
    });
    fireEvent.click(within(details).getByRole("button", { name: /save details/i }));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ name: "Sakura Group" });
  });

  it("says what suspending does before it is saved", () => {
    const mutate = mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    const details = panel(/^details$/i);
    fireEvent.click(within(details).getByRole("checkbox", { name: /active/i }));
    expect(within(details).getByText(/every one of sakura kitchens's logins/i)).toBeInTheDocument();
    fireEvent.click(within(details).getByRole("button", { name: /save and suspend/i }));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ is_active: false });
  });

  it("warns that onboarding turns on the second factor for owners", () => {
    const mutate = mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    const details = panel(/^details$/i);
    fireEvent.click(within(details).getByRole("checkbox", { name: /onboarded/i }));
    expect(within(details).getByText(/asked for an authenticator app/i)).toBeInTheDocument();
    fireEvent.click(within(details).getByRole("button", { name: /save details/i }));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ onboarded: true });
  });

  it("will not offer an allowance below what is already in use", () => {
    const mutate = mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    const allowances = panel(/^allowances$/i);
    fireEvent.change(within(allowances).getByLabelText(/outlets \(3 in use\)/i), {
      target: { value: "2" },
    });
    expect(
      within(allowances).getByText(/3 already in use, so not below that/i),
    ).toBeInTheDocument();
    expect(within(allowances).getByRole("button", { name: /save allowances/i })).toBeDisabled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("saves a raised allowance", () => {
    const mutate = mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    const allowances = panel(/^allowances$/i);
    fireEvent.change(within(allowances).getByLabelText(/tablets \(2 in use\)/i), {
      target: { value: "25" },
    });
    fireEvent.click(within(allowances).getByRole("button", { name: /save allowances/i }));
    expect(mutate.mock.calls[0]?.[0]).toEqual({ max_devices: 25 });
  });

  it("opens the organisation to work inside it as its owner", () => {
    mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    fireEvent.click(screen.getByRole("button", { name: /open organisation/i }));
    expect(enterOrganisation).toHaveBeenCalledWith({
      id: ID,
      name: "Sakura Kitchens",
      slug: "sakura",
      onboarded: false,
    });
    expect(navigate).toHaveBeenCalledWith("/app");
  });

  it("continues an outlet's onboarding from inside", () => {
    mockUpdate();
    render(<OrganisationPage organisationId={ID} />);
    fireEvent.click(screen.getByRole("button", { name: /continue onboarding/i }));
    expect(enterOrganisation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/app/onboarding");
  });

  it("has a designed error state", () => {
    mockUpdate();
    hooks.useOrganisation.mockReturnValue({
      isPending: false,
      isError: true,
      data: undefined,
      refetch: vi.fn(),
    });
    render(<OrganisationPage organisationId={ID} />);
    expect(screen.getByText(/could not load this organisation/i)).toBeInTheDocument();
  });
});
