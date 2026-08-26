import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/features/auth/types";
import { RoleGate } from "@/components/RoleGate";

/**
 * Placeholder landing page for the management shell. The four-pillar Outlet
 * Health Score card arrives in P8; this exists so auth and outlet scoping are
 * visible end to end.
 */
export function DashboardPage() {
  const { me } = useAuth();
  if (!me) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{me.full_name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-akira-ink/55">
        {ROLE_LABELS[me.global_role]}
        {me.is_global && " · sees every outlet"}
      </p>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
          Your outlets
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {me.outlets.map((outlet) => (
            <article
              key={outlet.outlet_id}
              className="rounded-lg border border-akira-ink/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{outlet.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-akira-ink/45">{outlet.code}</p>
                </div>
                {outlet.is_primary && (
                  <span className="rounded bg-akira-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-akira-blue">
                    Primary
                  </span>
                )}
              </div>
              <p className="mt-3 text-xs text-akira-ink/50">
                {ROLE_LABELS[outlet.role_at_outlet]} here
              </p>
            </article>
          ))}
          {me.outlets.length === 0 && (
            <p className="text-sm text-akira-ink/50">You are not assigned to any outlet yet.</p>
          )}
        </div>
      </section>

      {/* Permission rules are shown, not hidden: a control you cannot see is a
          rule you cannot understand. */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
          Administration
        </h2>
        <RoleGate
          roles={["owner"]}
          fallback={
            <p className="mt-3 text-sm text-akira-ink/45">
              Outlet and user administration is limited to owners. Your role is{" "}
              {ROLE_LABELS[me.global_role]}.
            </p>
          }
        >
          <p className="mt-3 text-sm text-akira-ink/70">
            You can create outlets, invite users and change roles.
          </p>
        </RoleGate>
      </section>
    </main>
  );
}
