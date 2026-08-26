import { navigate } from "@/app/navigate";
import { Button, EmptyState, TableSkeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useReviewQueue, type QueueRow } from "./api";

/**
 * Oldest first, and no bulk approve anywhere — approving a batch unread is
 * exactly the failure this whole system exists to prevent.
 */
export function ReviewQueuePage() {
  const { data: queue, isPending, isError, refetch } = useReviewQueue();

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        Submitted checklists waiting for a decision, oldest first. Open each one and look at the
        photos — that is the whole point of the record.
      </p>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={4} />}
        {isError && (
          <EmptyState
            title="Could not load the queue"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {queue && queue.length === 0 && (
          <EmptyState
            title="Nothing waiting"
            hint="Every submitted checklist has been reviewed. New ones appear here as staff finish them."
          />
        )}
        {queue && queue.length > 0 && (
          <div className="flex flex-col gap-2">
            {queue.map((run) => (
              <QueueCard key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function QueueCard({ run }: { run: QueueRow }) {
  const waitingHours = run.submitted_at
    ? (Date.now() - new Date(run.submitted_at).getTime()) / 3_600_000
    : 0;

  return (
    <button
      onClick={() => navigate(`/app/sop/review/${run.id}`)}
      className="flex items-center justify-between gap-4 rounded-lg border border-akira-ink/10 bg-white px-4 py-3 text-left hover:bg-akira-ink/[0.02]"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {run.template_name}
          <span className="ml-2 font-mono text-xs text-akira-ink/45">{run.outlet_code}</span>
        </p>
        <p className="mt-0.5 text-xs text-akira-ink/55">
          {run.submitted_by_name ?? "Unknown"} · {run.business_date}
          {waitingHours >= 1 && ` · waiting ${Math.floor(waitingHours)}h`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs">
        {run.critical_fail_count > 0 && (
          <span className="rounded bg-akira-red/10 px-2 py-1 font-bold text-akira-red">
            {run.critical_fail_count} critical
          </span>
        )}
        {run.fail_count > 0 && run.critical_fail_count === 0 && (
          <span className="rounded bg-health-amber/15 px-2 py-1 font-semibold text-[#8a6414]">
            {run.fail_count} failed
          </span>
        )}
        {run.integrity_flag_count > 0 && (
          <span className="rounded bg-akira-red/10 px-2 py-1 font-semibold text-akira-red">
            {run.integrity_flag_count} flags
          </span>
        )}
        {run.is_late && (
          <span className="rounded bg-akira-ink/8 px-2 py-1 text-akira-ink/60">late</span>
        )}
        <span
          className={cn(
            "w-14 text-right font-mono text-sm tabular-nums",
            run.score_pct == null
              ? "text-akira-ink/35"
              : run.score_pct >= 90
                ? "text-health-green"
                : run.score_pct >= 75
                  ? "text-[#8a6414]"
                  : "text-akira-red",
          )}
        >
          {run.score_pct == null ? "—" : `${run.score_pct}%`}
        </span>
      </div>
    </button>
  );
}
