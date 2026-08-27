import { useMemo, useState } from "react";

import { navigate } from "@/app/navigate";
import { Button, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useInventoryItems } from "@/features/admin/api";
import { ApiError } from "@/lib/api";
import { formatBusinessDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  describeParseDetail,
  useBuildRequisition,
  useConfirmCount,
  useCount,
  useReExtract,
  useReviewLine,
  type CountLine,
} from "./api";

/**
 * One count, line by line: what the paper said, what the machine made of it,
 * and what still needs a person.
 *
 * The layout rule: raw always visible beside derived. A reviewer who can see
 * "1.500" next to 1500 g trusts the parse; a reviewer shown only the number
 * has to trust the machine, which is precisely what this screen exists to
 * avoid.
 */
export function CountReviewPage({ countId }: { countId: string }) {
  const count = useCount(countId);
  const confirm = useConfirmCount(countId);
  const reExtract = useReExtract(countId);
  const buildReq = useBuildRequisition();
  const [error, setError] = useState<string | null>(null);
  const [onlyReview, setOnlyReview] = useState(true);

  const detail = count.data;
  const openLines = useMemo(
    () => detail?.lines.filter((line) => line.needs_review).length ?? 0,
    [detail],
  );
  const visible = useMemo(
    () =>
      detail?.lines.filter(
        (line) => !onlyReview || line.needs_review || detail.status !== "review",
      ) ?? [],
    [detail, onlyReview],
  );

  if (count.isPending) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <TableSkeleton rows={6} />
      </main>
    );
  }
  if (count.isError || !detail) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <ErrorNote>
          Could not load this count.{" "}
          <button className="underline" onClick={() => void count.refetch()}>
            Try again
          </button>
        </ErrorNote>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <button className="text-sm text-akira-blue" onClick={() => navigate("/app/inventory/counts")}>
        ← Stock counts
      </button>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">
            Count · {formatBusinessDate(detail.business_date)}
            {detail.counted_at_label && (
              <span className="ml-2 text-sm font-normal text-akira-ink/50">
                {detail.counted_at_label}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-akira-ink/60">
            {detail.original_filename}
            {detail.extractor && <> · read by {detail.extractor}</>}
            {detail.page_count != null && <> · {detail.page_count} pages</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {detail.status === "failed" && (
            <Button
              onClick={() => {
                setError(null);
                reExtract.mutate(undefined, {
                  onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                });
              }}
              disabled={reExtract.isPending}
            >
              {reExtract.isPending ? "Re-reading…" : "Read the sheet again"}
            </Button>
          )}
          {detail.status === "review" && (
            <Button
              onClick={() => {
                setError(null);
                confirm.mutate(undefined, {
                  onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                });
              }}
              disabled={confirm.isPending || openLines > 0}
            >
              {openLines > 0
                ? `${openLines} line${openLines === 1 ? "" : "s"} to resolve`
                : confirm.isPending
                  ? "Confirming…"
                  : "Confirm count"}
            </Button>
          )}
          {detail.status === "confirmed" && (
            <Button
              onClick={() => {
                setError(null);
                buildReq.mutate(countId, {
                  onSuccess: (r) => navigate(`/app/inventory/requisitions/${r.requisition_id}`),
                  onError: (e) => {
                    if (e instanceof ApiError && e.problem.extra?.requisition_id) {
                      navigate(
                        `/app/inventory/requisitions/${String(e.problem.extra.requisition_id)}`,
                      );
                      return;
                    }
                    setError(e instanceof ApiError ? e.problem.detail : e.message);
                  },
                });
              }}
              disabled={buildReq.isPending}
            >
              {buildReq.isPending ? "Computing…" : "Requisition"}
            </Button>
          )}
        </div>
      </div>

      {detail.status === "confirmed" && (
        <p className="mt-3 rounded bg-akira-green/10 px-3 py-2 text-sm text-akira-green">
          Confirmed by {detail.confirmed_by_name}. This is the outlet&apos;s on-hand count for{" "}
          {formatBusinessDate(detail.business_date)}.
        </p>
      )}
      {detail.status === "extracting" && (
        <p className="mt-3 rounded bg-akira-blue/10 px-3 py-2 text-sm text-akira-blue">
          The extractor is reading the sheet. This refreshes on its own.
        </p>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}

      {detail.status === "review" && (
        <label className="mt-4 flex w-fit items-center gap-2 text-sm text-akira-ink/70">
          <input
            type="checkbox"
            checked={onlyReview}
            onChange={(e) => setOnlyReview(e.target.checked)}
          />
          Only what needs review ({openLines})
        </label>
      )}

      <section className="mt-4">
        {detail.lines.length === 0 && detail.status !== "extracting" && (
          <EmptyState
            title="No lines"
            hint="Extraction produced nothing readable. Try reading the sheet again, or check the file."
          />
        )}
        <div className="space-y-2">
          {visible.map((line) => (
            <LineCard
              key={line.id}
              countId={countId}
              line={line}
              locked={detail.status !== "review"}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function LineCard({
  countId,
  line,
  locked,
}: {
  countId: string;
  line: CountLine;
  locked: boolean;
}) {
  const review = useReviewLine(countId);
  const [editing, setEditing] = useState(false);
  const notes = describeParseDetail(line.parse_detail);

  return (
    <div
      className={cn(
        "rounded-lg border bg-white px-4 py-3",
        line.needs_review ? "border-akira-amber/60" : "border-akira-ink/10",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {line.raw_name}
            {line.item_name && line.item_name !== line.raw_name && (
              <span className="ml-2 text-sm text-akira-ink/50">→ {line.item_name}</span>
            )}
            {line.match_method && (
              <span className="ml-2 rounded bg-akira-ink/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-akira-ink/50">
                {line.match_method}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-akira-ink/50">
            Sheet says: closing <span className="font-mono">{line.raw_closing ?? "—"}</span> ·
            requisition <span className="font-mono">{line.raw_requisition ?? "—"}</span>
            {line.extract_confidence != null && (
              <> · extractor {Math.round(line.extract_confidence * 100)}% sure</>
            )}
          </p>
          {notes.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-akira-ink/55">
              {notes.map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <ReadingPair label="On hand" value={line.qty} unit={line.item_unit} />
          <ReadingPair label="Asked for" value={line.requested_qty} unit={line.item_unit} />
          {!locked && line.needs_review && !editing && (
            <Button onClick={() => setEditing(true)}>Resolve</Button>
          )}
          {!locked && !line.needs_review && (
            <span className="text-xs text-akira-green">
              ✓ {line.reviewed_by_name ?? "resolved"}
            </span>
          )}
        </div>
      </div>
      {editing && (
        <ResolveForm
          line={line}
          pending={review.isPending}
          onCancel={() => setEditing(false)}
          onSave={(input) =>
            review.mutate(input, {
              onSuccess: () => setEditing(false),
            })
          }
        />
      )}
    </div>
  );
}

function ReadingPair({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string | null;
}) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wide text-akira-ink/40">{label}</p>
      <p className="font-mono tabular-nums">{value != null ? `${value} ${unit ?? ""}` : "—"}</p>
    </div>
  );
}

function ResolveForm({
  line,
  pending,
  onCancel,
  onSave,
}: {
  line: CountLine;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: {
    lineId: string;
    itemId: string | null;
    qty: number | null;
    requestedQty: number | null;
    rememberAlias: boolean;
  }) => void;
}) {
  const { data: items } = useInventoryItems();
  const [itemId, setItemId] = useState<string | null>(line.item_id);
  const [qty, setQty] = useState(line.qty != null ? String(line.qty) : "");
  const [requested, setRequested] = useState(
    line.requested_qty != null ? String(line.requested_qty) : "",
  );
  const [remember, setRemember] = useState(line.item_id === null);

  const unit = items?.find((i) => i.id === itemId)?.unit ?? line.item_unit ?? "";

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-akira-ink/10 pt-3">
      <label className="text-xs text-akira-ink/60">
        Catalogue item
        <select
          className="mt-1 block rounded border border-akira-ink/15 px-2 py-1.5 text-sm"
          value={itemId ?? ""}
          onChange={(e) => setItemId(e.target.value || null)}
        >
          <option value="">— not an item —</option>
          {(items ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-akira-ink/60">
        On hand ({unit})
        <input
          type="number"
          min={0}
          step="any"
          className="mt-1 block w-28 rounded border border-akira-ink/15 px-2 py-1.5 text-sm"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="blank = not counted"
        />
      </label>
      <label className="text-xs text-akira-ink/60">
        Asked for ({unit})
        <input
          type="number"
          min={0}
          step="any"
          className="mt-1 block w-28 rounded border border-akira-ink/15 px-2 py-1.5 text-sm"
          value={requested}
          onChange={(e) => setRequested(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 pb-1.5 text-xs text-akira-ink/60">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          disabled={!itemId}
        />
        Remember “{line.raw_name}” for this item
      </label>
      <div className="flex gap-2 pb-0.5">
        <Button
          onClick={() =>
            onSave({
              lineId: line.id,
              itemId,
              qty: qty === "" ? null : Number(qty),
              requestedQty: requested === "" ? null : Number(requested),
              rememberAlias: remember && itemId !== null,
            })
          }
          disabled={pending}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        <button className="text-sm text-akira-ink/50 underline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
