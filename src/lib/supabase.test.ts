import { describe, expect, it } from "vitest";

/**
 * A guard, not a feature test.
 *
 * `src/lib/supabase.ts` throws at module load when its environment is missing.
 * That is correct for the app — a missing key should stop it at boot rather
 * than at somebody's first click — but it makes the module, and everything
 * that imports it, unimportable in a test runner with no `.env.local`.
 *
 * CI has no `.env.local`. Two test files that reached this module through
 * `api.ts` failed there while passing on every developer machine, and the
 * frontend build stayed red for two epics before anyone read the log. The
 * stub values in `vite.config.ts` are what keep this importable; this test
 * fails the moment they are removed, instead of the failure surfacing later
 * as a mystery in someone else's pull request.
 */
describe("the Supabase client under test", () => {
  it("can be imported without a real environment", async () => {
    const { supabase } = await import("./supabase");
    expect(supabase).toBeTruthy();
    expect(supabase.auth).toBeTruthy();
  });

  it("points at nowhere, so no test can reach a real project", () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toContain(".invalid");
  });
});
