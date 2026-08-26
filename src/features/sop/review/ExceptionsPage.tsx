import { useState } from "react";

import { Button, Dialog, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useHasRole } from "@/components/RoleGate";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useExceptionAction, useExceptions, type ExceptionRow } from "./api";

/** Anything high-severity and older than this is visually escalated. */
const ESCALATE_AFTER_HOURS = 48;

export function ExceptionsPage() {
  const { data: exceptions, isPending, isError, refetch } = useExceptions();
  const [acting, setActing] = useState<{
    row: ExceptionRow;
    action: "resolve" | "waive";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const act = useExceptionAction();

  const open = (exceptions ?? []).filter((e) => e.status === "open" || e.status === "acknowledged");
  const closed = (exceptions ?? []).filter((e) => e.status === "resolved" || e.status === "waived");

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Exceptions</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        Every critical failure becomes a tracked exception the moment a run is submitted.
        High-severity items older than {ESCALATE_AFTER_HOURS} hours also cost the outlet score.
      </p>

      <ErrorNote>{error}</ErrorNote>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={3} />}
        {isError && (
          <EmptyState
            title="Could not load exceptions"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {exceptions && exceptions.length === 0 && (
          <EmptyState
            title="Nothing outstanding"
            hint="No critical failures are open. They appear here automatically when a checklist records one."
          />
        )}

        {open.length > 0 && (
          <div className="flex flex-col gap-2">
            {open.map((row) => (
              <ExceptionCard
                key={row.id}
                row={row}
                onAcknowledge={() =>
                  act.mutate(
                    { id: row.id, action: "acknowledge" },
                    {
                      onError: (e) =>
                        setError(e instanceof ApiError ? e.problem.detail : e.message),
                    },
                  )
                }
                onResolve={() => setActing({ row, action: "resolve" })}
                onWaive={() => setActing({ row, action: "waive" })}
              />
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
              Closed
            </h2>
            <div className="mt-2 flex flex-col gap-1.5">
              {closed.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-akira-ink/8 bg-white px-4 py-2.5 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-akira-ink/70">{row.title}</span>
                    <span className="shrink-0 rounded bg-akira-ink/6 px-2 py-0.5 text-[11px] font-semibold uppercase text-akira-ink/55">
                      {row.status}
                    </span>
                  </div>
                  {row.resolution_note && (
                    <p className="mt-1 text-xs text-akira-ink/50">
                      {row.resolved_by_name} — {row.resolution_note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <ActionDialog
        acting={acting}
        pending={act.isPending}
        onClose={() => setActing(null)}
        onSubmit={(text) => {
          if (!acting) return;
          act.mutate(
            {
              id: acting.row.id,
              action: acting.action,
              body: acting.action === "resolve" ? { resolution_note: text } : { reason: text },
            },
            {
              onSuccess: () => setActing(null),
              onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
            },
          );
        }}
      />
    </main>
  );
}

function ExceptionCard({
  row,
  onAcknowledge,
  onResolve,
  onWaive,
}: {
  row: ExceptionRow;
  onAcknowledge: () => void;
  onResolve: () => void;
  onWaive: () => void;
}) {
  const canWaive = useHasRole("owner", "ops_manager");
  const escalated = row.severity === "high" && row.age_hours > ESCALATE_AFTER_HOURS;

  return (
    <article
      className={cn(
        "rounded-lg border bg-white p-4",
        escalated ? "border-akira-red" : "border-akira-ink/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{row.title}</p>
          <p className="mt-0.5 text-xs text-akira-ink/55">
            {row.outlet_code} · {row.business_date} ·{" "}
            <span className={cn(escalated && "font-semibold text-akira-red")}>
              open {Math.floor(row.age_hours)}h
            </span>
            {row.assigned_to_name && ` · with ${row.assigned_to_name}`}
          </p>
          {row.detail && (
            <p className="mt-1.5 rounded bg-akira-ink/[0.04] px-2 py-1 text-xs text-akira-ink/70">
              {row.detail}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded px-2 py-1 text-[11px] font-bold uppercase",
            row.severity === "high"
              ? "bg-akira-red/10 text-akira-red"
              : row.severity === "medium"
                ? "bg-health-amber/15 text-[#8a6414]"
                : "bg-akira-ink/8 text-akira-ink/55",
          )}
        >
          {row.severity}
        </span>
      </div>

      {escalated && (
        <p className="mt-2 rounded-md border border-akira-red/25 bg-akira-red/5 px-3 py-1.5 text-xs font-medium text-akira-red">
          Open more than {ESCALATE_AFTER_HOURS} hours — this is costing the outlet score every day
          it stays open.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {row.status === "open" && <Button onClick={onAcknowledge}>Acknowledge</Button>}
        <Button onClick={onResolve}>Resolve</Button>
        {canWaive && (
          <Button variant="ghost" onClick={onWaive}>
            Waive
          </Button>
        )}
      </div>
    </article>
  );
}

function ActionDialog({
  acting,
  pending,
  onClose,
  onSubmit,
}: {
  acting: { row: ExceptionRow; action: "resolve" | "waive" } | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const isWaive = acting?.action === "waive";

  return (
    <Dialog
      open={acting !== null}
      onClose={onClose}
      title={isWaive ? "Waive this exception" : "Resolve this exception"}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-akira-ink/70">
          {isWaive
            ? "Waiving records that this was accepted and not fixed. It stays in the history with your reason attached."
            : "Say what was actually done. This is what anyone reading the record later will see."}
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={isWaive ? "Why is this being waived?" : "What was done?"}
          className="w-full rounded-md border border-akira-ink/15 px-3 py-2 text-sm outline-none focus-visible:border-akira-blue"
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={isWaive ? "danger" : "primary"}
            disabled={text.trim().length < 3 || pending}
            onClick={() => {
              onSubmit(text.trim());
              setText("");
            }}
          >
            {pending ? "Saving…" : isWaive ? "Waive" : "Resolve"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
