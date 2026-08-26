/**
 * Scaffold placeholder.
 *
 * Routing, the two shells (/app and /floor) and the auth provider land in P2.
 * P0 is configuration only — see docs/STAGE1_PROMPT_PACK.md in the API repo.
 */
export function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-jp text-sm tracking-[0.35em] text-akira-red">アキラ</p>
      <h1 className="text-2xl font-semibold text-akira-ink">AKIRA Ops Suite</h1>
      <p className="max-w-sm text-sm text-akira-ink/60">
        Scaffold ready. Authentication and the management and floor shells arrive in the next epic.
      </p>
    </main>
  );
}
