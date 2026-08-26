import { Button, EmptyState, TableSkeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useJobRuns } from "../api";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-health-green/10 text-health-green",
  failed: "bg-akira-red/10 text-akira-red",
  running: "bg-akira-blue/10 text-akira-blue",
};

export function JobsPage() {
  const { data: runs, isPending, isError, refetch } = useJobRuns();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Job runs</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        Every scheduled and background job records its execution here, so a failure is visible
        rather than silent. A gap where a job should have run matters as much as a failure row.
      </p>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={4} />}
        {isError && (
          <EmptyState
            title="Could not load job history"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {runs && runs.length === 0 && (
          <EmptyState
            title="No jobs have run yet"
            hint="The scheduler — run materialisation at 05:00, missed-run checks, the daily digest — arrives with the integrity engine epic. Executions will appear here from its first run."
          />
        )}
        {runs && runs.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Job</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Started</th>
                  <th className="px-4 py-2.5 font-semibold">Duration</th>
                  <th className="px-4 py-2.5 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-akira-ink/5 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{run.job_name}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold",
                          STATUS_STYLES[run.status] ?? "bg-akira-ink/8",
                        )}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-akira-ink/60">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-akira-ink/60">
                      {run.duration_ms != null ? `${run.duration_ms} ms` : "—"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-xs text-akira-ink/55">
                      {run.error_detail ?? JSON.stringify(run.detail)}
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
