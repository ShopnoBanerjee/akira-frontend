import { useState } from "react";

import { navigate } from "@/app/navigate";
import { Button, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { formatBusinessDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  useFinaliseRequisition,
  useRequisition,
  useSetFinalQty,
  workingOf,
  type RequisitionLine,
} from "./api";

/**
 * The requisition: suggested vs asked vs final, with the working shown.
 *
 * Three numbers per line, deliberately side by side. `Suggested` is the par
 * formula and expands to show its arithmetic; `Asked` is what the chef wrote
 * on the sheet; `Final` is the manager's call and the only editable one.
 * A flag is a reason to look, never a block.
 */
export function RequisitionPage({ requisitionId }: { requisitionId: string }) {
  const requisition = useRequisition(requisitionId);
  const finalise = useFinaliseRequisition(requisitionId);
  const [error, setError] = useState<string | null>(null);

  const detail = requisition.data;
  if (requisition.isPending) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <TableSkeleton rows={6} />
      </main>
    );
  }
  if (requisition.isError || !detail) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <ErrorNote>
          Could not load this requisition.{" "}
          <button className="underline" onClick={() => void requisition.refetch()}>
            Try again
          </button>
        </ErrorNote>
      </main>
    );
  }

  const locked = detail.status === "final";

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <button className="text-sm text-akira-blue" onClick={() => navigate("/app/inventory/counts")}>
        ← Stock counts
      </button>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            Requisition · {formatBusinessDate(detail.business_date)}
          </h1>
          <p className="mt-1 text-sm text-akira-ink/60">
            {locked
              ? `Finalised by ${detail.finalised_by_name}.`
              : "Suggested is the par-gap formula; Asked is what the chef wrote; Final is your call."}
          </p>
        </div>
        {!locked && (
          <Button
            onClick={() => {
              setError(null);
              finalise.mutate(undefined, {
                onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
              });
            }}
            disabled={finalise.isPending}
          >
            {finalise.isPending ? "Finalising…" : "Finalise"}
          </Button>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mt-6 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wide text-akira-ink/45">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Item</th>
              <th className="px-4 py-2.5 text-right font-semibold">On hand</th>
              <th className="px-4 py-2.5 text-right font-semibold">Par</th>
              <th className="px-4 py-2.5 text-right font-semibold">Suggested</th>
              <th className="px-4 py-2.5 text-right font-semibold">Asked</th>
              <th className="px-4 py-2.5 text-right font-semibold">Final</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <RequisitionRow
                key={line.item_id}
                requisitionId={requisitionId}
                line={line}
                locked={locked}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const FLAG_LABELS: Record<string, string> = {
  padding: "asked well above the par gap",
  no_par: "no par level set",
  not_counted: "not counted on the sheet",
};

function RequisitionRow({
  requisitionId,
  line,
  locked,
}: {
  requisitionId: string;
  line: RequisitionLine;
  locked: boolean;
}) {
  const setFinal = useSetFinalQty(requisitionId);
  const [showWorking, setShowWorking] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const working = workingOf(line);

  return (
    <>
      <tr className="border-b border-akira-ink/5 align-top last:border-0">
        <td className="px-4 py-2.5">
          <p className="font-medium">{line.item_name}</p>
          {line.flags.length > 0 && (
            <p className="mt-0.5 flex flex-wrap gap-1">
              {line.flags.map((flag) => (
                <span
                  key={flag}
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    flag === "padding"
                      ? "bg-akira-amber/15 text-akira-amber-ink"
                      : "bg-akira-ink/5 text-akira-ink/50",
                  )}
                >
                  {FLAG_LABELS[flag] ?? flag}
                </span>
              ))}
            </p>
          )}
        </td>
        <Num value={line.on_hand} unit={line.item_unit} />
        <Num value={line.par_level} unit={line.item_unit} />
        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
          {line.suggested_qty != null ? (
            <button
              className={cn("underline decoration-dotted", showWorking && "text-akira-blue")}
              onClick={() => setShowWorking((v) => !v)}
              title="Show the working"
            >
              {line.suggested_qty} {line.item_unit}
            </button>
          ) : (
            <span className="text-akira-ink/35">—</span>
          )}
        </td>
        <Num value={line.requested_qty} unit={line.item_unit} />
        <td className="px-4 py-2.5 text-right">
          {locked ? (
            <span className="font-mono font-semibold tabular-nums">
              {line.final_qty != null ? `${line.final_qty} ${line.item_unit}` : "—"}
            </span>
          ) : (
            <input
              type="number"
              min={0}
              step="any"
              aria-label={`Final quantity for ${line.item_name}`}
              className="w-24 rounded border border-akira-ink/15 px-2 py-1 text-right font-mono text-sm tabular-nums"
              value={draft ?? (line.final_qty != null ? String(line.final_qty) : "")}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                if (draft === null) return;
                setFinal.mutate({
                  itemId: line.item_id,
                  finalQty: draft === "" ? null : Number(draft),
                });
                setDraft(null);
              }}
            />
          )}
        </td>
      </tr>
      {showWorking && working && (
        <tr className="border-b border-akira-ink/5 bg-akira-ink/[0.02]">
          <td colSpan={6} className="px-4 py-2 font-mono text-xs text-akira-ink/60">
            {working.formula}: max(0, {working.par} − {working.on_hand}) = {working.gap}
            {working.order_unit != null && <> → rounded up to {working.order_unit}</>} →{" "}
            <strong>{working.result}</strong>
          </td>
        </tr>
      )}
    </>
  );
}

function Num({ value, unit }: { value: number | null; unit: string }) {
  return (
    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
      {value != null ? `${value} ${unit}` : <span className="text-akira-ink/35">—</span>}
    </td>
  );
}
