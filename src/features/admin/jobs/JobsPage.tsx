import { useState } from "react";

import { Button, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useJobRuns, useJobSchedule, useRunJobNow } from "../api";
import { summariseJobDetail } from "./detail";

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-health-green/10 text-health-green",
  failed: "bg-akira-red/10 text-akira-red",
  running: "bg-akira-blue/10 text-akira-blue",
};

/** What each job does, in the words of someone deciding whether to press it. */
const JOB_COPY: Record<string, { label: string; what: string }> = {
  materialise_runs: {
    label: "Create today's runs",
    what: "Builds today's pending checklists from the active assignments. Safe to press twice — it creates nothing that already exists.",
  },
  mark_missed: {
    label: "Mark overdue runs missed",
    what: "Any run still unstarted past its due time plus grace becomes missed and raises an exception. Runs already in progress are left alone.",
  },
  daily_digest: {
    label: "Send the daily digest",
    what: "Rebuilds and re-sends yesterday's summary to the owner, ops manager and each outlet's manager. This one sends mail.",
  },
  photo_integrity: {
    label: "Photo integrity",
    what: "Hashes a submitted photo and runs the duplicate, gallery-pick and darkness checks. Triggered by an upload, not by a schedule.",
  },
  run_integrity: {
    label: "Run integrity",
    what: "Catches up any photo confirmed too close to submission to have been hashed yet.",
  },
  reconcile_schedule: {
    label: "Re-read job times",
    what: "Picks up a changed materialisation or digest time from Settings without restarting the API. Nothing to trigger by hand.",
  },
  reference_photo_measure: {
    label: "Reference brightness",
    what: "Measures a newly captured reference standard, so a standard shot in the dark is visible as one.",
  },
};

/** Only these can be triggered by hand; the API refuses anything else. */
const RUNNABLE = new Set(["materialise_runs", "mark_missed", "daily_digest"]);

export function JobsPage() {
  const { me } = useAuth();
  const { data: runs, isPending, isError, refetch } = useJobRuns();
  const { data: schedule } = useJobSchedule();
  const runNow = useRunJobNow();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isOwner = me?.global_role === "owner";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Scheduled jobs</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        Every scheduled and background job records its execution here, so a failure is visible
        rather than silent. A gap where a job should have run matters as much as a failure row.
      </p>

      <ErrorNote>{error}</ErrorNote>

      {/* --- The schedule ---------------------------------------------- */}
      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
          Schedule
        </h2>
        {schedule && !schedule.running && (
          <div className="rounded-lg border border-akira-red/25 bg-akira-red/5 px-4 py-3 text-sm text-akira-red">
            <strong className="font-semibold">The scheduler is not running.</strong> Nothing is
            firing on its own — today&rsquo;s runs will not be created and no digest will be sent
            until it is started. Check <span className="font-mono">SCHEDULER_ENABLED</span> on the
            API.
          </div>
        )}
        {schedule?.running && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Job</th>
                  <th className="px-4 py-2.5 font-semibold">Cadence</th>
                  <th className="px-4 py-2.5 font-semibold">Next run</th>
                  {isOwner && <th className="px-4 py-2.5 font-semibold">Run now</th>}
                </tr>
              </thead>
              <tbody>
                {schedule.jobs.map((job) => {
                  const copy = JOB_COPY[job.id];
                  return (
                    <tr key={job.id} className="border-b border-akira-ink/5 last:border-0">
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{copy?.label ?? job.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-akira-ink/40">
                          {job.id}
                        </span>
                        {copy && (
                          <p className="mt-0.5 max-w-md text-xs text-akira-ink/50">{copy.what}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-akira-ink/60">
                        {job.trigger}
                      </td>
                      <td className="px-4 py-2.5 text-akira-ink/60">
                        {job.next_run_at
                          ? new Date(job.next_run_at).toLocaleString()
                          : "not scheduled"}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-2.5">
                          {RUNNABLE.has(job.id) && (
                            <Button
                              disabled={runNow.isPending}
                              onClick={() => {
                                setError(null);
                                runNow.mutate(
                                  { jobName: job.id },
                                  {
                                    onError: (e) =>
                                      setError(
                                        e instanceof ApiError ? e.problem.detail : e.message,
                                      ),
                                  },
                                );
                              }}
                            >
                              {runNow.isPending && runNow.variables?.jobName === job.id
                                ? "Running…"
                                : "Run now"}
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {isOwner ? (
          <p className="mt-2 text-xs text-akira-ink/45">
            Every one of these is safe to press twice. Nothing here is destructive — but the digest
            does send mail.
          </p>
        ) : (
          <p className="mt-2 text-xs text-akira-ink/45">
            Running a job by hand is limited to the owner, because the digest sends mail.
          </p>
        )}
      </section>

      {/* --- History ---------------------------------------------------- */}
      <section className="mt-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
          Recent executions
        </h2>
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
            hint="The scheduler fires run materialisation at 05:00, the missed-run check every 15 minutes, and the digest at 09:00. Executions will appear here from the first one."
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
                  <tr
                    key={run.id}
                    onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                    className="cursor-pointer border-b border-akira-ink/5 align-top last:border-0 hover:bg-akira-ink/[0.02]"
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs">{run.job_name}</span>
                      {run.triggered_by_name && (
                        <p className="text-[11px] text-akira-ink/45">
                          by hand — {run.triggered_by_name}
                        </p>
                      )}
                    </td>
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
                    <td className="px-4 py-2.5 whitespace-nowrap text-akira-ink/60">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-akira-ink/60">
                      {run.duration_ms != null ? `${run.duration_ms} ms` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-akira-ink/55">
                      {run.error_detail ? (
                        <span className="text-akira-red">{run.error_detail}</span>
                      ) : expanded === run.id ? (
                        <pre className="max-w-md overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                          {JSON.stringify(run.detail, null, 2)}
                        </pre>
                      ) : (
                        <span className="line-clamp-1 max-w-xs truncate">
                          {summariseJobDetail(run.detail)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
