import { useState } from "react";

import { Button, EmptyState, TableSkeleton } from "@/components/ui/primitives";
import { navigate } from "@/app/navigate";
import { formatOutletTime } from "@/lib/dates";
import { formatPaiseShort } from "@/lib/money";
import { usePlatformOverview, useOrganisations } from "./api";
import { CreateOrganisationDialog } from "./CreateOrganisationDialog";
import { formatCount } from "./format";
import { AllowanceBar, StatusBadges, Tile } from "./parts";

/**
 * The vendor's first screen (D35): how the whole product is being used, and
 * every customer's usage against what it is allowed.
 */
export function PlatformDashboard() {
  const overview = usePlatformOverview();
  const organisations = useOrganisations();
  const [creating, setCreating] = useState(false);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organisations</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            Every customer on the platform, what they use, and what they are allowed. Open one to
            change its details or to work inside it.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New organisation</Button>
      </div>

      <section aria-label="Platform totals" className="mt-6">
        {overview.isPending && <TableSkeleton rows={1} />}
        {overview.data && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile
              label="Organisations"
              value={formatCount(overview.data.organisations)}
              hint={`${formatCount(overview.data.organisations_active)} active · ${formatCount(
                overview.data.organisations_onboarded,
              )} onboarded`}
            />
            <Tile
              label="Outlets"
              value={formatCount(overview.data.outlets)}
              hint={`${formatCount(overview.data.tablets)} tablets · ${formatCount(
                overview.data.people,
              )} people`}
            />
            <Tile
              label="Checklist runs, 30 days"
              value={formatCount(overview.data.runs_30d)}
              hint={`${formatCount(overview.data.runs_approved_30d)} approved`}
            />
            <Tile
              label="Sales, 30 days"
              value={formatPaiseShort(overview.data.net_sales_30d_paise)}
              hint={`${formatCount(overview.data.bills_30d)} bills`}
            />
          </div>
        )}
      </section>

      <section className="mt-8">
        {organisations.isPending && <TableSkeleton rows={3} />}
        {organisations.isError && (
          <EmptyState
            title="Could not load organisations"
            hint="The API did not respond."
            action={<Button onClick={() => void organisations.refetch()}>Try again</Button>}
          />
        )}
        {organisations.data && organisations.data.length === 0 && (
          <EmptyState
            title="No organisations yet"
            hint="Create the first customer and invite its owner."
            action={<Button onClick={() => setCreating(true)}>New organisation</Button>}
          />
        )}
        {organisations.data && organisations.data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Organisation</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Outlets</th>
                  <th className="px-4 py-2.5 font-semibold">People</th>
                  <th className="px-4 py-2.5 font-semibold">Tablets</th>
                  <th className="px-4 py-2.5 font-semibold">Runs, 30d</th>
                  <th className="px-4 py-2.5 font-semibold">Sales, 30d</th>
                  <th className="px-4 py-2.5 font-semibold">Last active</th>
                </tr>
              </thead>
              <tbody>
                {organisations.data.map((org) => (
                  <tr
                    key={org.organisation_id}
                    onClick={() => navigate(`/platform/organisations/${org.organisation_id}`)}
                    className="cursor-pointer border-b border-akira-ink/6 last:border-0 hover:bg-akira-ink/3"
                  >
                    <td className="px-4 py-3">
                      <a
                        href={`/platform/organisations/${org.organisation_id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/platform/organisations/${org.organisation_id}`);
                        }}
                        className="font-medium text-akira-ink hover:underline"
                      >
                        {org.name}
                      </a>
                      <p className="font-mono text-xs text-akira-ink/45">{org.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadges isActive={org.is_active} onboardedAt={org.onboarded_at} />
                    </td>
                    <td className="px-4 py-3">
                      <AllowanceBar allowance={org.usage.outlets} />
                    </td>
                    <td className="px-4 py-3">
                      <AllowanceBar allowance={org.usage.people} />
                    </td>
                    <td className="px-4 py-3">
                      <AllowanceBar allowance={org.usage.tablets} />
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(org.usage.runs_30d)}</td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      {formatPaiseShort(org.usage.net_sales_30d_paise)}
                    </td>
                    <td className="px-4 py-3 text-akira-ink/60 whitespace-nowrap">
                      {org.usage.last_activity_at
                        ? formatOutletTime(org.usage.last_activity_at)
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CreateOrganisationDialog open={creating} onClose={() => setCreating(false)} />
    </main>
  );
}
