import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  usePlatformOverview: vi.fn(),
  useOrganisations: vi.fn(),
  useCreateOrganisation: vi.fn(),
}));
vi.mock("./api", () => hooks);

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/app/navigate", () => ({ navigate }));

import { PlatformDashboard } from "./PlatformDashboard";

function usage(over: Record<string, unknown> = {}) {
  return {
    outlets: { used: 1, allowed: 100000 },
    people: { used: 9, allowed: 100000 },
    tablets: { used: 2, allowed: 10000 },
    checklist_templates: 14,
    active_assignments: 6,
    runs_30d: 120,
    runs_approved_30d: 100,
    runs_missed_30d: 4,
    uploads_30d: 3,
    last_upload_at: null,
    bills_30d: 623,
    net_sales_30d_paise: 125_000_00,
    last_activity_at: null,
    ...over,
  };
}

const ROWS = [
  {
    organisation_id: "11111111-1111-4111-8111-111111111111",
    slug: "akira",
    name: "AKIRA",
    is_active: true,
    onboarded_at: "2026-09-07T03:05:00Z",
    created_at: "2026-09-07T00:00:00Z",
    owners: 1,
    usage: usage(),
  },
  {
    organisation_id: "22222222-2222-4222-8222-222222222222",
    slug: "akira-dev",
    name: "AKIRA (development)",
    is_active: false,
    onboarded_at: null,
    created_at: "2026-09-07T00:00:00Z",
    owners: 1,
    usage: usage({ tablets: { used: 10000, allowed: 10000 } }),
  },
];

describe("PlatformDashboard", () => {
  beforeEach(() => {
    navigate.mockReset();
    hooks.usePlatformOverview.mockReturnValue({
      isPending: false,
      data: {
        organisations: 2,
        organisations_active: 1,
        organisations_onboarded: 1,
        outlets: 3,
        people: 10,
        tablets: 2,
        runs_30d: 240,
        runs_approved_30d: 200,
        bills_30d: 1246,
        net_sales_30d_paise: 250_000_00,
      },
    });
    hooks.useOrganisations.mockReturnValue({ isPending: false, isError: false, data: ROWS });
    hooks.useCreateOrganisation.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("shows the platform's totals", () => {
    render(<PlatformDashboard />);
    const totals = screen.getByRole("region", { name: /platform totals/i });
    expect(within(totals).getByText("Organisations")).toBeInTheDocument();
    expect(within(totals).getByText(/1 active · 1 onboarded/)).toBeInTheDocument();
    expect(within(totals).getByText("240")).toBeInTheDocument();
  });

  it("shows each customer's usage against its allowance", () => {
    render(<PlatformDashboard />);
    const akira = screen.getByRole("link", { name: "AKIRA" }).closest("tr")!;
    expect(within(akira).getAllByText("1,00,000", { exact: false }).length).toBeGreaterThan(0);
    // Indian grouping, never the raw integer the old page printed.
    expect(within(akira).queryByText(/100000/)).not.toBeInTheDocument();
  });

  it("says each status once", () => {
    // Regression: the old page printed "Active Active" — the dot's own label
    // and then the same word again beside it.
    render(<PlatformDashboard />);
    const akira = screen.getByRole("link", { name: "AKIRA" }).closest("tr")!;
    expect(within(akira).getAllByText("Active")).toHaveLength(1);
    expect(within(akira).getByText("Onboarded")).toBeInTheDocument();

    const dev = screen.getByRole("link", { name: "AKIRA (development)" }).closest("tr")!;
    expect(within(dev).getByText("Suspended")).toBeInTheDocument();
    expect(within(dev).getByText("In development")).toBeInTheDocument();
  });

  it("marks an allowance that has been reached", () => {
    render(<PlatformDashboard />);
    const dev = screen.getByRole("link", { name: "AKIRA (development)" }).closest("tr")!;
    const meters = within(dev).getAllByRole("meter");
    const full = meters.find((m) => m.getAttribute("aria-valuenow") === "10000")!;
    expect(full.firstElementChild).toHaveClass("bg-health-red");
  });

  it("opens an organisation from its row", () => {
    render(<PlatformDashboard />);
    fireEvent.click(screen.getByRole("link", { name: "AKIRA" }));
    expect(navigate).toHaveBeenCalledWith(
      "/platform/organisations/11111111-1111-4111-8111-111111111111",
    );
  });

  it("offers to create the first customer when there are none", () => {
    hooks.useOrganisations.mockReturnValue({ isPending: false, isError: false, data: [] });
    render(<PlatformDashboard />);
    expect(screen.getByText(/no organisations yet/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /new organisation/i }).length).toBeGreaterThan(1);
  });
});
