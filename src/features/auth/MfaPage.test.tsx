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

/**
 * Mirrors supabase-js exactly: `all` carries every factor whatever its
 * status, `totp` carries ONLY the verified ones. Getting this shape wrong in
 * a mock is how the "abandoned enrolment" bug reached production - the old
 * fixtures put unverified factors in `totp`, where the real client never
 * puts them, so the test agreed with code that could not work.
 */
function listing(...factors: { id: string; status: string }[]) {
  const all = factors.map((f) => ({ ...f, factor_type: "totp" }));
  return {
    data: { all, totp: all.filter((f) => f.status === "verified"), phone: [], webauthn: [] },
    error: null,
  };
}

const NO_FACTORS = listing();
const VERIFIED = listing({ id: "f9", status: "verified" });
const ABANDONED = listing({ id: "old", status: "unverified" });
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
    mfa.listFactors.mockResolvedValue(VERIFIED);
    render(<MfaPage />);

    expect(await screen.findByRole("heading", { name: /enter your code/i })).toBeInTheDocument();
    expect(mfa.enroll).not.toHaveBeenCalled();
    expect(screen.queryByAltText(/qr code/i)).not.toBeInTheDocument();
  });

  it("clears an abandoned enrolment before starting a new one", async () => {
    // Regression: an unverified factor is absent from `data.totp` and present
    // only in `data.all`. Reading the wrong one skipped the cleanup, and
    // Supabase then refused the new enrolment because the friendly name was
    // taken - the owner saw "a factor with the friendly name ... already
    // exists" and could go no further.
    mfa.listFactors.mockResolvedValue(ABANDONED);
    expect(ABANDONED.data.totp).toEqual([]);
    mfa.enroll.mockResolvedValue(ENROLLED);
    render(<MfaPage />);

    await screen.findByAltText(/qr code/i);
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: "old" });
    expect(mfa.enroll).toHaveBeenCalled();
  });

  it("explains a wrong code and lets the person try again", async () => {
    mfa.listFactors.mockResolvedValue(VERIFIED);
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
    mfa.listFactors.mockResolvedValue(VERIFIED);
    render(<MfaPage />);
    await screen.findByRole("heading", { name: /enter your code/i });
    fireEvent.change(screen.getByLabelText(/six-digit code/i), { target: { value: "12" } });
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(mfa.challenge).not.toHaveBeenCalled();
  });
});
