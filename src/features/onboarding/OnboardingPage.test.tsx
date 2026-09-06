import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useOnboarding = vi.hoisted(() => vi.fn());
vi.mock("./api", () => ({ useOnboarding }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/app/navigate", () => ({ navigate }));

import { OnboardingPage } from "./OnboardingPage";

function step(over: Partial<Record<string, unknown>> = {}) {
  return {
    key: "menu_map",
    title: "Upload an Item Wise report",
    why: "It teaches the system your menu.",
    how: "Petpooja → Reports → Item Wise.",
    required: true,
    done: false,
    count: 0,
    href: "/app/sales",
    ...over,
  };
}

function status(over: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      outlet_id: "o1",
      steps: [
        step(),
        step({
          key: "tablet",
          title: "Register the floor tablet",
          why: "The floor shares one tablet per outlet.",
          how: "Tablets → Register.",
          required: false,
        }),
      ],
      required_done: 0,
      required_total: 1,
      recommended_done: 0,
      recommended_total: 1,
      ready: false,
      ...over,
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  };
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    useOnboarding.mockReset();
    navigate.mockReset();
  });

  it("separates what is essential from what merely helps", () => {
    useOnboarding.mockReturnValue(status());
    render(<OnboardingPage />);

    expect(screen.getByText(/0 of 1 essentials done/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^essential$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /worth doing next/i })).toBeInTheDocument();
  });

  it("names the Petpooja report and the screen, not just the gap", () => {
    // A checklist that only says "missing" moves the problem rather than
    // solving it: the owner has to know which export and where it goes.
    useOnboarding.mockReturnValue(status());
    render(<OnboardingPage />);

    expect(screen.getByText(/Petpooja → Reports → Item Wise/)).toBeInTheDocument();
    expect(screen.getByText(/teaches the system your menu/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /do this/i })).toHaveLength(2);
  });

  it("shows the count behind a tick, so a tick has evidence", () => {
    useOnboarding.mockReturnValue(
      status({ steps: [step({ done: true, count: 128 })], required_done: 1, recommended_total: 0 }),
    );
    render(<OnboardingPage />);

    expect(screen.getByText("128 found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open/i })).toBeInTheDocument();
  });

  it("says so plainly when nothing essential is left", () => {
    useOnboarding.mockReturnValue(
      status({ steps: [step({ done: true })], required_done: 1, ready: true }),
    );
    render(<OnboardingPage />);

    expect(screen.getByText(/everything essential is in place/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });

  it("has a designed loading and error state rather than a blank screen", () => {
    useOnboarding.mockReturnValue({ data: undefined, isPending: true, isError: false });
    const { unmount } = render(<OnboardingPage />);
    expect(screen.queryByText(/essentials done/i)).not.toBeInTheDocument();
    unmount();

    useOnboarding.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: vi.fn(),
    });
    render(<OnboardingPage />);
    expect(screen.getByText(/could not load your setup list/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
