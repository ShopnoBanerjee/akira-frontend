import { Wordmark } from "@/components/Brand";
import { Button, EmptyState, StatusDot, TableSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatOutletTime } from "@/lib/dates";
import { useOrganisations } from "./api";

/**
 * The platform shell (D33): the one screen above organisations. P26a lists
 * them; creating an organisation, its owner, and the onboarding checklist
 * arrive in P26b. The platform admin can also open any organisation's /app
 * screens read-only; every such read is on that organisation's audit log.
 */
export function PlatformPage() {
  const { me, signOut } = useAuth();
  const { data: organisations, isPending, isError, refetch } = useOrganisations();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Wordmark compact />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Organisations</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            Every tenant on this platform. Signed in as {me?.full_name} (platform admin, read-only
            inside organisations).
          </p>
        </div>
        <button
          onClick={() => void signOut()}
          className="min-h-[32px] text-xs font-semibold text-akira-blue hover:underline"
        >
          Sign out
        </button>
      </div>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={2} />}
        {isError && (
          <EmptyState
            title="Could not load organisations"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {organisations && organisations.length === 0 && (
          <EmptyState title="No organisations yet" hint="Onboarding arrives in the next phase." />
        )}
        {organisations && organisations.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Organisation</th>
                  <th className="px-4 py-2.5 font-semibold">Slug</th>
                  <th className="px-4 py-2.5 font-semibold">Outlets</th>
                  <th className="px-4 py-2.5 font-semibold">People</th>
                  <th className="px-4 py-2.5 font-semibold">Owners</th>
                  <th className="px-4 py-2.5 font-semibold">Onboarded</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {organisations.map((org) => (
                  <tr
                    key={org.organisation_id}
                    className="border-b border-akira-ink/6 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium">{org.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{org.slug}</td>
                    <td className="px-4 py-2.5">
                      {org.outlets} / {org.max_outlets}
                    </td>
                    <td className="px-4 py-2.5">
                      {org.people} / {org.max_people}
                    </td>
                    <td className="px-4 py-2.5">{org.owners}</td>
                    <td className="px-4 py-2.5 text-akira-ink/70">
                      {org.onboarded_at ? formatOutletTime(org.onboarded_at) : "In development"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <StatusDot active={org.is_active} />
                        {org.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
