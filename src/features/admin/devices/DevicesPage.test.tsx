import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  useDevices: vi.fn(),
  useOutlets: vi.fn(),
  useCreateTablet: vi.fn(),
  useUpdateDevice: vi.fn(),
  useRevokeDevice: vi.fn(),
}));
vi.mock("../api", () => hooks);

const useHasRole = vi.hoisted(() => vi.fn());
vi.mock("@/components/RoleGate", () => ({ useHasRole }));

import { DevicesPage } from "./DevicesPage";
import type { CreateTablet, TabletCredentials } from "../api";

/** The page shows the action twice (header and empty state); either will do. */
function addTabletButton(): HTMLElement {
  const [first] = screen.getAllByRole("button", { name: /add a tablet/i });
  if (!first) throw new Error("no Add a tablet button");
  return first;
}

type MutateOptions = {
  onSuccess: (c: TabletCredentials) => void;
  onError: (e: Error) => void;
};

const CREDENTIALS = {
  device: {
    id: "d1",
    outlet_id: "o1",
    outlet_code: "AKR-SP01",
    outlet_name: "AKIRA Sapuipara",
    label: "Kitchen pass",
    is_active: true,
    last_seen_at: null,
    created_at: "2026-09-07T10:00:00Z",
  },
  email: "akr-sp01-kitchen-pass-a1b2c3@tablets.akira.test",
  password: "abcde-fghij-klmno-pqrst",
  detail: "This password is shown only now — a tablet has no mailbox.",
};

describe("DevicesPage", () => {
  beforeEach(() => {
    for (const fn of Object.values(hooks)) fn.mockReset();
    useHasRole.mockReset();
    useHasRole.mockReturnValue(true); // owner
    hooks.useDevices.mockReturnValue({ data: [], isPending: false, isError: false });
    hooks.useOutlets.mockReturnValue({
      data: [{ id: "o1", code: "AKR-SP01", name: "AKIRA Sapuipara" }],
    });
    hooks.useUpdateDevice.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooks.useRevokeDevice.mockReturnValue({ mutate: vi.fn(), isPending: false });
    hooks.useCreateTablet.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it("offers the owner a way to add a tablet, from the empty state too", () => {
    render(<DevicesPage />);
    // Registering a tablet used to mean somebody opening the Supabase
    // dashboard; the empty state now names the action instead of the backend.
    expect(screen.getAllByRole("button", { name: /add a tablet/i }).length).toBeGreaterThan(0);
    expect(addTabletButton()).toBeEnabled();
    expect(screen.getByText(/no tablets yet/i)).toBeInTheDocument();
  });

  it("does not offer it to a manager who is not the owner", () => {
    useHasRole.mockReturnValue(false);
    render(<DevicesPage />);
    expect(screen.queryByRole("button", { name: /add a tablet/i })).not.toBeInTheDocument();
  });

  it("shows the credentials once, and will not hide them until acknowledged", async () => {
    const mutate = vi.fn((_body: CreateTablet, opts: MutateOptions) => opts.onSuccess(CREDENTIALS));
    hooks.useCreateTablet.mockReturnValue({ mutate, isPending: false });
    render(<DevicesPage />);

    fireEvent.click(addTabletButton());
    fireEvent.change(screen.getByLabelText(/what to call it/i), {
      target: { value: "Kitchen pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create tablet/i }));

    await waitFor(() => expect(screen.getByText(CREDENTIALS.password)).toBeInTheDocument());
    expect(screen.getByText(CREDENTIALS.email)).toBeInTheDocument();
    expect(mutate.mock.calls[0]?.[0]).toEqual({ outlet_id: "o1", label: "Kitchen pass" });

    // The password cannot be looked up again, so hiding it is deliberate.
    const hide = screen.getByRole("button", { name: /hide these/i });
    expect(hide).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(hide).toBeEnabled();
    fireEvent.click(hide);
    expect(screen.queryByText(CREDENTIALS.password)).not.toBeInTheDocument();
  });

  it("keeps the create button disabled until the tablet has a name", () => {
    render(<DevicesPage />);
    fireEvent.click(addTabletButton());
    expect(screen.getByRole("button", { name: /create tablet/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/what to call it/i), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: /create tablet/i })).toBeDisabled();
  });

  it("explains a refusal from the API rather than failing silently", async () => {
    const mutate = vi.fn((_body: CreateTablet, opts: MutateOptions) =>
      opts.onError(new Error("This organisation is at its limit of 10000 tablets.")),
    );
    hooks.useCreateTablet.mockReturnValue({ mutate, isPending: false });
    render(<DevicesPage />);

    fireEvent.click(addTabletButton());
    fireEvent.change(screen.getByLabelText(/what to call it/i), { target: { value: "Spare" } });
    fireEvent.click(screen.getByRole("button", { name: /create tablet/i }));

    expect(await screen.findByText(/limit of 10000 tablets/i)).toBeInTheDocument();
  });
});
