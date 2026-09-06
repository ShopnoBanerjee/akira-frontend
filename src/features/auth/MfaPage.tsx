import { useEffect, useState, type FormEvent } from "react";

import { Wordmark } from "@/components/Brand";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

const FIELD =
  "h-11 w-full rounded-md border border-akira-ink/15 bg-white px-3 text-center font-mono text-lg tracking-[0.3em] outline-none focus-visible:border-akira-blue focus-visible:ring-2 focus-visible:ring-akira-blue/25";

type Stage =
  | { kind: "loading" }
  | { kind: "enrol"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "failed"; message: string };

/**
 * The second factor (D33). Owners of a live organisation and the platform
 * admin get here after a password; the API refuses everything else until the
 * session carries `aal2`.
 *
 * Everything on this screen talks to Supabase Auth directly — enrolment,
 * challenge, verification — which is one of the three things the Supabase
 * client is for. The API only ever sees the resulting `aal` claim.
 */
export function MfaPage() {
  const { refresh, signOut, me } = useAuth();
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (!active) return;
      if (listError) {
        setStage({ kind: "failed", message: listError.message });
        return;
      }
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setStage({ kind: "verify", factorId: verified.id });
        return;
      }
      // An earlier enrolment that never finished is dead weight; Supabase
      // caps how many a user can hold, so clear them before starting anew.
      for (const stale of data.totp.filter((f) => f.status !== "verified")) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }
      const { data: enrolled, error: enrolError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "AKIRA Ops",
      });
      if (!active) return;
      if (enrolError || !enrolled) {
        setStage({ kind: "failed", message: enrolError?.message ?? "Could not start enrolment." });
        return;
      }
      setStage({
        kind: "enrol",
        factorId: enrolled.id,
        qr: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    })();
    return () => {
      active = false;
    };
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    if (stage.kind !== "enrol" && stage.kind !== "verify") return;
    const digits = code.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(digits)) {
      setError("Enter the six digits from your authenticator app.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: stage.factorId,
      });
      if (challengeError || !challenge) {
        throw new Error(challengeError?.message ?? "Could not start the check.");
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: stage.factorId,
        challengeId: challenge.id,
        code: digits,
      });
      if (verifyError) throw new Error(verifyError.message);
      // The session now carries aal2; /users/me will say so.
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error && /invalid|expired/i.test(err.message)
          ? "That code did not match. Codes change every 30 seconds; try the current one."
          : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Wordmark />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {stage.kind === "verify" ? "Enter your code" : "Set up your authenticator"}
          </h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            {me?.is_platform_admin
              ? "The platform login always needs a second factor."
              : "Owners of a live organisation sign in with a password and an authenticator app."}
          </p>
        </div>

        {stage.kind === "loading" && (
          <p className="text-sm text-akira-ink/55" role="status">
            Checking your account…
          </p>
        )}

        {stage.kind === "failed" && (
          <div role="alert" className="rounded-md bg-akira-red/8 px-3 py-2 text-sm text-akira-red">
            {stage.message}
          </div>
        )}

        {stage.kind === "enrol" && (
          <div className="mb-5 rounded-lg border border-akira-ink/10 bg-white p-4">
            <p className="text-sm">
              Scan this with Google Authenticator, Authy or 1Password, then enter the six-digit code
              it shows.
            </p>
            <img
              src={stage.qr}
              alt="QR code for your authenticator app"
              className="mx-auto mt-3 h-44 w-44"
            />
            <details className="mt-2 text-xs text-akira-ink/55">
              <summary className="cursor-pointer">Cannot scan? Type the key instead</summary>
              <code className="mt-1 block break-all font-mono text-[13px] text-akira-ink">
                {stage.secret}
              </code>
            </details>
          </div>
        )}

        {(stage.kind === "enrol" || stage.kind === "verify") && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
                Six-digit code
              </span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                autoFocus
                required
                className={FIELD}
              />
            </label>
            {error && (
              <div
                role="alert"
                className="rounded-md bg-akira-red/8 px-3 py-2 text-sm text-akira-red"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={busy || code.replace(/\s+/g, "").length !== 6}
              className="h-11 rounded-md bg-akira-red text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Checking…" : stage.kind === "verify" ? "Continue" : "Finish setup"}
            </button>
          </form>
        )}

        <button
          onClick={() => void signOut()}
          className="mt-6 text-xs font-semibold text-akira-ink/50 hover:text-akira-ink"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
