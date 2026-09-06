import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();
vi.mock("./AuthProvider", () => ({ useAuth: () => ({ signIn }) }));

import { LoginPage } from "./LoginPage";

beforeEach(() => signIn.mockReset());

describe("LoginPage", () => {
  it("trims the email when the field is left and on submit, never the password", () => {
    signIn.mockResolvedValue(undefined);
    render(<LoginPage />);
    const email = screen.getByLabelText<HTMLInputElement>(/email/i);
    const password = screen.getByLabelText<HTMLInputElement>(/^password$/i);

    fireEvent.change(email, { target: { value: "  Owner@akira.test  " } });
    fireEvent.blur(email);
    expect(email.value).toBe("Owner@akira.test");

    fireEvent.change(email, { target: { value: " owner@akira.test " } });
    fireEvent.change(password, { target: { value: " pass with spaces " } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(signIn).toHaveBeenCalledWith("owner@akira.test", " pass with spaces ");
  });

  it("keeps the button disabled while the email is only spaces", () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "x" } });
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });

  it("can show and hide the password", () => {
    render(<LoginPage />);
    const password = screen.getByLabelText<HTMLInputElement>(/^password$/i);
    expect(password.type).toBe("password");

    const toggle = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggle);
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(password.type).toBe("password");
  });

  it("does not reveal whether the address exists", async () => {
    signIn.mockImplementation(() => {
      throw new Error("Invalid login credentials");
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    // A plain wait rather than findByRole: React 19's act scope re-raises the
    // mock's error through waitFor even though the component caught it.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.getByRole("alert")).toHaveTextContent("That email and password do not match.");
  });
});
