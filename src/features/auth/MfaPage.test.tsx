import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
const signOut = vi.fn();
vi.mock("./AuthProvider", () => ({
  useAuth: () => ({ refresh, signOut, me: { is_platform_admin: false } }),
}));

// Hoisted with the mock: the factory reads `mfa` when the module under test
// is first imported, which is before an ordinary `const` here would exist.
const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(),
  unenroll: vi.fn(),
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { auth: { mfa } } }));

import { MfaPage } from "./MfaPage";

const NO_FACTORS = { data: { totp: [], all: [] }, error: null };
const ENROLLED = {
  data: { id: "f1", totp: { qr_code: "data:image/svg+xml;utf8,<svg/>", secret: "ABCD1234" } },
  error: null,
};

describe("MfaPage", () => {
  beforeEach(() => {
    for (const fn of Object.values(mfa)) fn.mockReset();
    refresh.mockReset();
    refresh.mockResolvedValue(undefined);
    mfa.unenroll.mockResolvedValue({ data: null, error: null });
    mfa.challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    mfa.verify.mockResolvedValue({ data: {}, error: null });
  });

  it("enrols a new authenticator when none is verified, then verifies the code", async () => {
    mfa.listFactors.mockResolvedValue(NO_FACTORS);
    mfa.enroll.mockResolvedValue(ENROLLED);
    render(<MfaPage />);

    expect(await screen.findByAltText(/qr code/i)).toHaveAttribute(
      "src",
      ENROLLED.data.totp.qr_code,
    );
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "AKIRA Ops" });

    fireEvent.change(screen.getByLabelText(/six-digit code/i), { target: { value: "123 456" } });
    fireEvent.click(screen.getByRole("button", { name: /finish setup/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(mfa.challenge).toHaveBeenCalledWith({ factorId: "f1" });
    expect(mfa.verify).toHaveBeenCalledWith({ factorId: "f1", challengeId: "c1", code: "123456" });
  });

  it("only asks for the code when a verified factor already exists", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "f9", status: "verified" }], all: [] },
      error: null,
    });
    render(<MfaPage />);

    expect(await screen.findByRole("heading", { name: /enter your code/i })).toBeInTheDocument();
    expect(mfa.enroll).not.toHaveBeenCalled();
    expect(screen.queryByAltText(/qr code/i)).not.toBeInTheDocument();
  });

  it("clears an abandoned enrolment before starting a new one", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "old", status: "unverified" }], all: [] },
      error: null,
    });
    mfa.enroll.mockResolvedValue(ENROLLED);
    render(<MfaPage />);

    await screen.findByAltText(/qr code/i);
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "old" });
  });

  it("explains a wrong code and lets the person try again", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "f9", status: "verified" }], all: [] },
      error: null,
    });
    mfa.verify.mockResolvedValue({ data: null, error: { message: "Invalid TOTP code entered" } });
    render(<MfaPage />);

    await screen.findByRole("heading", { name: /enter your code/i });
    fireEvent.change(screen.getByLabelText(/six-digit code/i), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/did not match/i);
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled();
  });

  it("refuses anything but six digits without calling the provider", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "f9", status: "verified" }], all: [] },
      error: null,
    });
    render(<MfaPage />);
    await screen.findByRole("heading", { name: /enter your code/i });
    fireEvent.change(screen.getByLabelText(/six-digit code/i), { target: { value: "12" } });
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(mfa.challenge).not.toHaveBeenCalled();
  });
});
