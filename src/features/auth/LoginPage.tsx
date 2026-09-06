import { useState, type FormEvent } from "react";

import { Wordmark } from "@/components/Brand";
import { useAuth } from "./AuthProvider";

const FIELD =
  "h-11 w-full rounded-md border border-akira-ink/15 bg-white px-3 text-[15px] outline-none focus-visible:border-akira-blue focus-visible:ring-2 focus-visible:ring-akira-blue/25";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The address is trimmed; the password never is. A password may contain
  // spaces on purpose, and silently changing what somebody typed is worse
  // than a failed attempt they can see and retry.
  const cleanEmail = email.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(cleanEmail, password);
    } catch (err) {
      // Never distinguish "no such account" from "wrong password": that
      // difference tells an attacker which addresses are real.
      setError(
        err instanceof Error && /invalid/i.test(err.message)
          ? "That email and password do not match."
          : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Wordmark />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-akira-ink/55">Internal operations for AKIRA outlets.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Phone and tablet keyboards capitalise the first letter and
              // "correct" addresses; both produce a login that never matches.
              onBlur={() => setEmail(cleanEmail)}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              required
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
              Password
            </span>
            <span className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                className={`${FIELD} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-1 flex h-9 min-w-[64px] items-center justify-center rounded px-2 text-xs font-semibold text-akira-blue hover:bg-akira-blue/5"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-akira-red/25 bg-akira-red/5 px-3 py-2 text-sm text-akira-red"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !cleanEmail || !password}
            className="mt-1 h-11 rounded-md bg-akira-red text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
