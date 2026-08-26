import { useState } from "react";

import { navigate } from "@/app/navigate";
import { Button, Dialog, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  useApproveRun,
  useMarkViewed,
  useRejectRun,
  useReviewDetail,
  type AiReview,
  type ReviewItem,
} from "./api";
import { FLAG_COPY, FLAG_LABEL, flagEvidence, verdictCopy } from "./flags";

export function ReviewDetailPage({ runId }: { runId: string }) {
  const { me } = useAuth();
  const { data: run, isPending, isError, refetch } = useReviewDetail(runId);
  const approve = useApproveRun();
  const reject = useRejectRun();
  const markViewed = useMarkViewed(runId);
  const [lightbox, setLightbox] = useState<ReviewItem | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <TableSkeleton rows={6} />
      </main>
    );
  }
  if (isError || !run) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <EmptyState
          title="Could not load this run"
          hint="It may have been removed, or the API did not respond."
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </main>
    );
  }

  const isSubmitter = me?.profile_id === run.submitted_by;
  const decidable = run.status === "submitted";
  const photoItems = run.items.filter((i) => i.photo_view_url);
  const unviewed = photoItems.filter((i) => !i.viewed_by_me).length;

  function openPhoto(item: ReviewItem) {
    setLightbox(item);
    if (!item.viewed_by_me) markViewed.mutate(item.id);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <button
        onClick={() => navigate("/app/sop/review")}
        className="text-xs font-semibold text-akira-blue hover:underline"
      >
        ← Review queue
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{run.template_name}</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            {run.outlet_code} · {run.business_date} · submitted by{" "}
            {run.submitted_by_name ?? "unknown"}
            {run.device_label && ` on ${run.device_label}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Stat label="Score" value={run.score_pct == null ? "—" : `${run.score_pct}%`} />
            {run.critical_fail_count > 0 && (
              <Stat label="Critical fails" value={String(run.critical_fail_count)} tone="bad" />
            )}
            {run.is_late && (
              <Stat
                label="Late"
                value={run.minutes_late ? `${run.minutes_late} min` : "yes"}
                tone="warn"
              />
            )}
            <Stat
              label="Location"
              value={
                run.geo_ok === null ? "not shared" : run.geo_ok ? "at outlet" : "outside radius"
              }
              tone={run.geo_ok === false ? "bad" : undefined}
            />
            <Stat label="Template" value={`v${run.template_version}`} />
          </div>

          {run.integrity_flags.length > 0 && (
            <div className="mt-3 flex max-w-xl flex-col gap-1.5">
              {run.integrity_flags.map((flag) => (
                <FlagLine key={flag} flag={flag} evidence={run.integrity_detail[flag]} />
              ))}
            </div>
          )}
        </div>

        {decidable && (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => setRejecting(true)}>
                Send back
              </Button>
              <Button
                variant="primary"
                disabled={isSubmitter || approve.isPending}
                title={
                  isSubmitter
                    ? "You submitted this run — someone else has to approve it."
                    : undefined
                }
                onClick={() =>
                  approve.mutate(runId, {
                    onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                  })
                }
              >
                {approve.isPending ? "Approving…" : "Approve"}
              </Button>
            </div>
            {isSubmitter && (
              <p className="max-w-xs text-right text-xs text-akira-ink/50">
                You submitted this run, so someone else has to approve it.
              </p>
            )}
            {!isSubmitter && unviewed > 0 && (
              <p className="max-w-xs text-right text-xs text-akira-ink/50">
                {unviewed} photo{unviewed === 1 ? "" : "s"} not opened yet.
              </p>
            )}
          </div>
        )}
        {run.status === "approved" && (
          <span className="rounded-lg bg-health-green/12 px-3 py-2 text-sm font-semibold text-health-green">
            Approved by {run.approved_by_name ?? "—"}
          </span>
        )}
      </div>

      {run.rejection_reason && run.status !== "submitted" && (
        <p className="mt-4 rounded-md border border-akira-red/25 bg-akira-red/5 px-3 py-2 text-sm text-akira-red">
          Sent back: {run.rejection_reason}
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>

      <div className="mt-6 overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
        {run.items.map((item) => (
          <ItemRow key={item.id} item={item} onOpenPhoto={() => openPhoto(item)} />
        ))}
      </div>

      <PhotoLightbox item={lightbox} onClose={() => setLightbox(null)} />
      <RejectDialog
        open={rejecting}
        items={run.items}
        pending={reject.isPending}
        onClose={() => setRejecting(false)}
        onSubmit={(reason, itemIds) =>
          reject.mutate(
            { runId, reason, itemIds },
            {
              onSuccess: () => setRejecting(false),
              onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
            },
          )
        }
      />
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  // Explicit undefined is allowed: callers compute the tone conditionally.
  tone?: "bad" | "warn" | undefined;
}) {
  return (
    <span
      className={cn(
        "rounded px-2 py-1",
        tone === "bad"
          ? "bg-akira-red/10 text-akira-red"
          : tone === "warn"
            ? "bg-health-amber/15 text-[#8a6414]"
            : "bg-akira-ink/[0.05] text-akira-ink/70",
      )}
    >
      <span className="text-akira-ink/45">{label}:</span>{" "}
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function ItemRow({ item, onOpenPhoto }: { item: ReviewItem; onOpenPhoto: () => void }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-akira-ink/5 px-4 py-3 last:border-0",
        item.result === "fail" && "bg-akira-red/[0.03]",
      )}
    >
      <span className="w-6 pt-0.5 text-center font-mono text-xs text-akira-ink/40">
        {item.sort_order}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {item.title}
          {item.is_critical && (
            <span className="ml-2 rounded bg-akira-red/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-akira-red">
              critical
            </span>
          )}
        </p>
        {item.title_bn && <p className="text-xs text-akira-ink/50">{item.title_bn}</p>}

        {item.value_numeric != null && (
          <p
            className={cn(
              "mt-1 font-mono text-sm tabular-nums",
              item.out_of_range ? "font-bold text-akira-red" : "text-akira-ink/70",
            )}
          >
            {item.value_numeric}
            {item.value_unit ? ` ${item.value_unit}` : ""}
            {item.out_of_range && " — out of range"}
            {(item.value_min != null || item.value_max != null) && (
              <span className="ml-1 font-sans text-xs font-normal text-akira-ink/40">
                (expected {item.value_min ?? ""}–{item.value_max ?? ""})
              </span>
            )}
          </p>
        )}

        {item.note && (
          <p className="mt-1 rounded bg-akira-ink/[0.04] px-2 py-1 text-xs text-akira-ink/70">
            {item.note}
          </p>
        )}

        {item.integrity_flags.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1.5">
            {item.integrity_flags.map((flag) => (
              <FlagLine key={flag} flag={flag} evidence={item.integrity_detail[flag]} />
            ))}
          </div>
        )}

        {item.ai_review && <VerdictLine review={item.ai_review} />}

        {item.photo_path && item.photo_processed_at === null && (
          <p className="mt-1.5 text-xs text-akira-ink/45">
            The integrity checks have not run on this photo yet — not the same as clean.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.photo_view_url ? (
          <button onClick={onOpenPhoto} className="relative">
            <img
              src={item.photo_view_url}
              alt={`Photo for ${item.title}`}
              className="h-14 w-14 rounded-md border border-akira-ink/10 object-cover"
            />
            {!item.viewed_by_me && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-akira-blue" />
            )}
          </button>
        ) : item.requires_photo ? (
          <span className="text-xs text-akira-red">no photo</span>
        ) : null}

        <span
          className={cn(
            "w-14 rounded px-2 py-1 text-center text-[11px] font-bold uppercase",
            item.result === "pass" && "bg-health-green/12 text-health-green",
            item.result === "fail" && "bg-akira-red/10 text-akira-red",
            item.result === "na" && "bg-akira-ink/8 text-akira-ink/55",
            item.result === "pending" && "bg-health-amber/15 text-[#8a6414]",
          )}
        >
          {item.result === "pending" ? "todo" : item.result}
        </span>
      </div>
    </div>
  );
}

function PhotoLightbox({ item, onClose }: { item: ReviewItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onClose={onClose} title={item?.title ?? ""}>
      {item?.photo_view_url && (
        <div className="flex flex-col gap-3">
          <img
            src={item.photo_view_url}
            alt={`Photo for ${item.title}`}
            className="max-h-[60vh] w-full rounded-md object-contain"
          />
          {item.note && <p className="text-sm text-akira-ink/70">{item.note}</p>}
          {item.integrity_flags.map((flag) => (
            <FlagLine key={flag} flag={flag} evidence={item.integrity_detail[flag]} />
          ))}
          {item.ai_review && <VerdictLine review={item.ai_review} />}
          <Button onClick={onClose}>Close</Button>
        </div>
      )}
    </Dialog>
  );
}

function RejectDialog({
  open,
  items,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  items: ReviewItem[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (reason: string, itemIds: string[]) => void;
}) {
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <Dialog open={open} onClose={onClose} title="Send this back">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-akira-ink/70">
          Pick the items that need redoing. Everything else keeps its answer, so staff only repeat
          what was actually wrong.
        </p>

        <div className="max-h-56 overflow-y-auto rounded-md border border-akira-ink/10">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 border-b border-akira-ink/5 px-3 py-2 text-sm last:border-0 hover:bg-akira-ink/[0.02]"
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 accent-akira-red"
              />
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              {item.result === "fail" && (
                <span className="text-[10px] font-bold uppercase text-akira-red">failed</span>
              )}
            </label>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="What needs fixing? Staff see this on the item."
          className="w-full rounded-md border border-akira-ink/15 px-3 py-2 text-sm outline-none focus-visible:border-akira-blue"
        />

        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            disabled={reason.trim().length < 3 || selected.size === 0 || pending}
            onClick={() => onSubmit(reason.trim(), [...selected])}
          >
            {pending
              ? "Sending…"
              : `Send back ${selected.size} item${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * One flag, with its evidence. The chip alone is an accusation; the sentence
 * beneath it is what lets a manager check the claim instead of taking it on
 * faith — or dismiss it, which is equally the point.
 */
function FlagLine({
  flag,
  evidence,
}: {
  flag: string;
  // Explicit undefined: a flag may have no recorded evidence, and the
  // lookup that produces it is an index access.
  evidence: Record<string, unknown> | undefined;
}) {
  const detail = flagEvidence(flag, evidence);
  return (
    <div className="rounded-md border border-akira-red/20 bg-akira-red/[0.04] px-2.5 py-1.5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-akira-red">
        {FLAG_LABEL[flag] ?? flag.replace(/_/g, " ")}
        <span className="font-normal normal-case tracking-normal text-akira-ink/60">
          {FLAG_COPY[flag] ?? ""}
        </span>
      </p>
      {detail && <p className="mt-0.5 text-xs text-akira-ink/70">{detail}</p>}
    </div>
  );
}

/**
 * The advisory verdict. Deliberately not styled like a decision: it is never
 * red even when it says fail, because red on this screen means the run failed
 * a check, and this is an opinion a manager is free to disagree with.
 */
function VerdictLine({ review }: { review: AiReview }) {
  const shown = review.shown_as;
  return (
    <div className="mt-1.5 rounded-md border border-akira-blue/20 bg-akira-blue/[0.04] px-2.5 py-1.5">
      <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-akira-blue">
        Automated review: {shown}
        {review.confidence !== null && (
          <span className="font-normal normal-case tracking-normal tabular-nums text-akira-ink/50">
            {Math.round(review.confidence * 100)}% confident
          </span>
        )}
        {shown === "uncertain" && review.verdict !== "uncertain" && (
          <span className="font-normal normal-case tracking-normal text-akira-ink/50">
            (said &ldquo;{review.verdict}&rdquo;, below the{" "}
            {Math.round(review.uncertain_below * 100)}% certainty bar)
          </span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-akira-ink/70">{review.rationale}</p>
      <p className="mt-0.5 text-[11px] text-akira-ink/40">
        {verdictCopy(shown, review.compared_to_reference)} Advisory only — it never approves or
        blocks anything.
      </p>
    </div>
  );
}
