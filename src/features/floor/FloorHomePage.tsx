import { useSyncExternalStore } from "react";

import { navigate } from "@/app/navigate";
import { useAuth } from "@/features/auth/AuthProvider";
import { getActor, setActor } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PinScreen } from "./PinScreen";
import { useTodayRuns, type RunListItem } from "./api";

function subscribeActor(callback: () => void) {
  window.addEventListener("akira:actor-changed", callback);
  return () => window.removeEventListener("akira:actor-changed", callback);
}

export function useActor() {
  return useSyncExternalStore(subscribeActor, () => {
    const actor = getActor();
    return actor ? JSON.stringify(actor) : null;
  });
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "To do", className: "bg-akira-ink/8 text-akira-ink/70" },
  in_progress: { label: "In progress", className: "bg-akira-blue/12 text-akira-blue" },
  submitted: { label: "Waiting for review", className: "bg-health-amber/15 text-[#8a6414]" },
  approved: { label: "Approved", className: "bg-health-green/12 text-health-green" },
  rejected: { label: "Sent back", className: "bg-akira-red/10 text-akira-red" },
  missed: { label: "Missed", className: "bg-akira-red/10 text-akira-red" },
};

export function FloorHomePage() {
  const { me } = useAuth();
  const actorRaw = useActor();
  const actor = actorRaw ? (JSON.parse(actorRaw) as { full_name: string }) : null;

  const isDevice = me?.device != null;
  const outletId = me?.device?.outlet_id ?? me?.outlets[0]?.outlet_id ?? null;
  const {
    data: runs,
    isPending,
    isError,
    refetch,
  } = useTodayRuns(!isDevice || actor ? outletId : null);

  // A tablet with nobody identified shows the PIN screen and nothing else.
  if (isDevice && !actor) {
    return <PinScreen onIdentified={() => undefined} />;
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Today</h1>
        {isDevice && actor && (
          <button
            onClick={() => setActor(null)}
            className="min-h-[48px] rounded-lg px-3 text-sm font-semibold text-akira-blue active:bg-akira-blue/5"
          >
            {actor.full_name} · switch
          </button>
        )}
      </div>

      {isPending && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-akira-ink/6 motion-reduce:animate-none"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-akira-red/20 bg-white p-6 text-center">
          <p className="text-[15px] font-medium">Could not load today's checklists</p>
          <p className="mt-1 text-sm text-akira-ink/55">Check the wifi, then try again.</p>
          <button
            onClick={() => void refetch()}
            className="mt-4 min-h-[48px] rounded-lg bg-akira-red px-6 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {runs && runs.length === 0 && (
        <div className="rounded-xl border border-dashed border-akira-ink/20 bg-white p-8 text-center">
          <p className="text-[15px] font-medium">Nothing due right now</p>
          <p className="mt-1 text-sm text-akira-ink/55">
            Checklists appear here when they are scheduled for your role.
          </p>
        </div>
      )}

      {(runs ?? []).map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </main>
  );
}

function RunCard({ run }: { run: RunListItem }) {
  const status = STATUS_STYLES[run.status] ?? STATUS_STYLES.pending!;
  const done = run.status === "approved" || run.status === "submitted";
  const overdue =
    !done &&
    run.status !== "missed" &&
    run.due_at != null &&
    new Date(run.due_at).getTime() < Date.now();
  const openable =
    run.status === "pending" || run.status === "in_progress" || run.status === "rejected";

  return (
    <button
      disabled={!openable}
      onClick={() => navigate(`/floor/run/${run.id}`)}
      className={cn(
        "flex min-h-[88px] flex-col gap-2 rounded-xl border bg-white p-4 text-left active:bg-akira-ink/[0.03] disabled:active:bg-white",
        overdue ? "border-akira-red/50" : "border-akira-ink/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-snug">
            {run.template_name_bn ?? run.template_name}
          </p>
          {run.template_name_bn && <p className="text-xs text-akira-ink/50">{run.template_name}</p>}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
            status.className,
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", overdue ? "text-akira-red" : "text-akira-ink/55")}>
          {run.due_at
            ? `Due ${new Date(run.due_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}${overdue ? " — overdue" : ""}`
            : "No due time"}
        </span>
        <span className="tabular-nums text-akira-ink/55">
          {run.answered_count}/{run.item_count}
        </span>
      </div>

      {run.status === "rejected" && run.rejection_reason && (
        <p className="rounded-md bg-akira-red/5 px-2.5 py-1.5 text-xs text-akira-red">
          Sent back: {run.rejection_reason}
        </p>
      )}
    </button>
  );
}
