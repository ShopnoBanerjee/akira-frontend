import { useEffect, useRef, useState } from "react";

import { navigate } from "@/app/navigate";
import { ApiError } from "@/lib/api";
import { resizeImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import { requestLocation, useRun, useStartRun, useSubmitRun, type RunItem } from "./api";
import { useRunDraft } from "./store";

/**
 * One item per screen, thumb-reach controls, and a draft that survives
 * anything. Staff use this standing up, on bad wifi, at 1am.
 */
export function RunPage({ runId }: { runId: string }) {
  const { data: run, isPending, refetch } = useRun(runId);
  const start = useStartRun();
  const submit = useSubmitRun();
  const draft = useRunDraft();
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    void draft.load(runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  // Auto-start a pending run on open. Idempotent server-side.
  useEffect(() => {
    if (!run || startedRef.current) return;
    if (run.status === "pending") {
      startedRef.current = true;
      start.mutate(runId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.status, runId]);

  if (isPending || !run) {
    return (
      <main className="flex flex-col gap-3 px-4 py-5">
        <div className="h-40 animate-pulse rounded-xl bg-akira-ink/6 motion-reduce:animate-none" />
      </main>
    );
  }

  if (run.status === "submitted" || run.status === "approved") {
    return (
      <main className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-health-green/15 text-3xl">
          ✓
        </div>
        <h1 className="text-xl font-semibold">Submitted</h1>
        <p className="max-w-xs text-sm text-akira-ink/55">
          A manager will review it. If anything needs fixing it comes back to this list.
        </p>
        <button
          onClick={() => navigate("/floor")}
          className="mt-2 min-h-[52px] rounded-xl bg-akira-ink px-8 text-[15px] font-semibold text-white"
        >
          Back to today
        </button>
      </main>
    );
  }

  const items = run.items;
  const pendingSync = draft.pendingCount();

  const answeredIds = new Set(
    items
      .filter((i) => i.result !== "pending")
      .map((i) => i.id)
      .concat(Object.keys(draft.answers)),
  );

  if (reviewing) {
    return (
      <Review
        run={run}
        onBack={() => setReviewing(false)}
        pendingSync={pendingSync}
        syncError={draft.lastError}
        onRetry={() => void draft.drain()}
        submitError={submitError}
        submitting={submit.isPending}
        onSubmit={() => {
          setSubmitError(null);
          void (async () => {
            const geo = await requestLocation();
            submit.mutate(
              { runId, geo },
              {
                onSuccess: () => void draft.clear(),
                onError: (e) => {
                  setSubmitError(e instanceof ApiError ? e.problem.detail : e.message);
                  // The server may know about items this tab does not; refresh.
                  void refetch();
                },
              },
            );
          })();
        }}
      />
    );
  }

  const item = items[Math.min(index, items.length - 1)];
  if (!item) return null;

  return (
    <main className="flex min-h-full flex-col">
      {/* Sticky progress */}
      <div className="sticky top-0 z-10 border-b border-akira-ink/8 bg-[#faf9f8]/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center justify-between text-xs font-semibold text-akira-ink/55">
          <button onClick={() => navigate("/floor")} className="min-h-[44px] pr-3 text-akira-blue">
            ← Today
          </button>
          <span className="tabular-nums">
            {index + 1} of {items.length}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-akira-ink/10">
          <div
            className="h-full rounded-full bg-akira-blue transition-all"
            style={{ width: `${(answeredIds.size / items.length) * 100}%` }}
          />
        </div>
      </div>

      <ItemScreen
        key={item.id}
        item={item}
        onAnswered={() => {
          if (index < items.length - 1) setIndex(index + 1);
          else setReviewing(true);
        }}
      />

      <div className="flex items-center justify-between px-4 pb-6">
        <NavButton disabled={index === 0} onClick={() => setIndex(index - 1)}>
          ← Back
        </NavButton>
        {index < items.length - 1 ? (
          <NavButton onClick={() => setIndex(index + 1)}>Skip →</NavButton>
        ) : (
          <NavButton onClick={() => setReviewing(true)}>Review →</NavButton>
        )}
      </div>

      {pendingSync > 0 && (
        <SyncBanner
          count={pendingSync}
          error={draft.lastError}
          onRetry={() => void draft.drain()}
        />
      )}
    </main>
  );
}

function NavButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="min-h-[48px] rounded-lg px-4 text-sm font-semibold text-akira-ink/60 active:bg-akira-ink/5 disabled:opacity-30"
      {...props}
    />
  );
}

function SyncBanner({
  count,
  error,
  onRetry,
}: {
  count: number;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="fixed inset-x-3 bottom-3 z-20 flex items-center justify-between gap-3 rounded-xl bg-akira-ink px-4 py-3 text-white shadow-lg">
      <p className="text-sm">
        {count} change{count === 1 ? "" : "s"} waiting to sync
        {error && <span className="block text-xs text-white/60">{error}</span>}
      </p>
      <button
        onClick={onRetry}
        className="min-h-[44px] shrink-0 rounded-lg bg-white/15 px-4 text-sm font-semibold"
      >
        Retry now
      </button>
    </div>
  );
}

function ItemScreen({ item, onAnswered }: { item: RunItem; onAnswered: () => void }) {
  const draft = useRunDraft();
  const saved = draft.answers[item.id];
  const [note, setNote] = useState(saved?.note ?? item.note ?? "");
  const [value, setValue] = useState<string>(
    String(saved?.valueNumeric ?? item.value_numeric ?? ""),
  );
  const [needNote, setNeedNote] = useState(false);
  const [photoState, setPhotoState] = useState<"none" | "captured" | "uploaded">(
    saved?.photoConfirmed || item.photo_path ? "uploaded" : saved?.photoBlob ? "captured" : "none",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const numericValue = value.trim() === "" ? null : Number(value);
  const isOut =
    numericValue != null &&
    !Number.isNaN(numericValue) &&
    ((item.value_min != null && numericValue < item.value_min) ||
      (item.value_max != null && numericValue > item.value_max));

  const currentResult = saved?.result ?? (item.result !== "pending" ? item.result : null);

  async function capture(file: File) {
    const resized = await resizeImage(file);
    await draft.attachPhoto(item.id, resized);
    setPhotoState("captured");
  }

  function answer(result: "pass" | "fail" | "na") {
    if (result === "fail" && !note.trim()) {
      setNeedNote(true);
      return;
    }
    setNeedNote(false);
    void draft.answer(item.id, {
      result,
      valueNumeric: numericValue != null && !Number.isNaN(numericValue) ? numericValue : null,
      valueText: null,
      note: note.trim() || null,
      photoBlob: null,
    });
    onAnswered();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-5">
      <div>
        <h2 className="text-[19px] font-semibold leading-snug">
          {item.title_bn ?? item.title}
          {item.is_critical && (
            <span className="ml-2 align-middle rounded bg-akira-red/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-akira-red">
              critical
            </span>
          )}
        </h2>
        {item.title_bn && <p className="mt-0.5 text-sm text-akira-ink/55">{item.title}</p>}
        {(item.instruction_bn ?? item.instruction) && (
          <p className="mt-2 text-[15px] text-akira-ink/70">
            {item.instruction_bn ?? item.instruction}
          </p>
        )}
      </div>

      {item.requires_value && item.value_type !== "text" && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
            {item.value_type === "temperature_c" ? "Temperature" : "Count"}
            {item.value_min != null || item.value_max != null
              ? ` (${item.value_min ?? ""}–${item.value_max ?? ""}${item.value_unit ? " " + item.value_unit : ""})`
              : item.value_unit
                ? ` (${item.value_unit})`
                : ""}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={cn(
              "mt-1.5 h-14 w-full rounded-xl border-2 bg-white px-4 text-2xl font-semibold tabular-nums outline-none",
              isOut
                ? "border-akira-red text-akira-red"
                : "border-akira-ink/15 focus:border-akira-blue",
            )}
          />
          {isOut && (
            <p className="mt-1.5 text-sm font-semibold text-akira-red">
              Out of range — check again, then record what you actually see.
            </p>
          )}
        </div>
      )}

      {item.requires_photo && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void capture(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex min-h-[72px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed text-[15px] font-semibold",
              photoState === "none"
                ? "border-akira-blue/50 bg-akira-blue/5 text-akira-blue"
                : "border-health-green/50 bg-health-green/5 text-health-green",
            )}
          >
            {photoState === "none"
              ? "📷 Take the photo"
              : photoState === "captured"
                ? "✓ Photo saved — will upload · retake?"
                : "✓ Photo uploaded · retake?"}
          </button>
        </div>
      )}

      <div>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            if (e.target.value.trim()) setNeedNote(false);
          }}
          placeholder={needNote ? "Say what you found — required for FAIL" : "Note (optional)"}
          rows={2}
          className={cn(
            "w-full rounded-xl border-2 bg-white px-3.5 py-2.5 text-[15px] outline-none",
            needNote
              ? "border-akira-red placeholder-akira-red/60"
              : "border-akira-ink/12 focus:border-akira-blue",
          )}
        />
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2.5">
        <ResultButton kind="pass" active={currentResult === "pass"} onClick={() => answer("pass")}>
          PASS
        </ResultButton>
        <ResultButton kind="fail" active={currentResult === "fail"} onClick={() => answer("fail")}>
          FAIL
        </ResultButton>
        <ResultButton
          kind="na"
          active={currentResult === "na"}
          disabled={!item.allow_na}
          onClick={() => answer("na")}
        >
          N/A
        </ResultButton>
      </div>
    </div>
  );
}

function ResultButton({
  kind,
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind: "pass" | "fail" | "na";
  active: boolean;
}) {
  return (
    <button
      className={cn(
        "min-h-[64px] rounded-xl text-[17px] font-bold transition-transform active:scale-[0.97] disabled:opacity-25",
        kind === "pass" &&
          (active ? "bg-health-green text-white" : "bg-health-green/12 text-health-green"),
        kind === "fail" && (active ? "bg-akira-red text-white" : "bg-akira-red/10 text-akira-red"),
        kind === "na" && (active ? "bg-akira-ink text-white" : "bg-akira-ink/8 text-akira-ink/60"),
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Review({
  run,
  onBack,
  onSubmit,
  pendingSync,
  syncError,
  onRetry,
  submitError,
  submitting,
}: {
  run: { items: RunItem[]; template_name: string };
  onBack: () => void;
  onSubmit: () => void;
  pendingSync: number;
  syncError: string | null;
  onRetry: () => void;
  submitError: string | null;
  submitting: boolean;
}) {
  const draft = useRunDraft();

  function effective(item: RunItem): { result: string; note: string | null } {
    const d = draft.answers[item.id];
    return d ? { result: d.result, note: d.note } : { result: item.result, note: item.note };
  }

  const unanswered = run.items.filter((i) => effective(i).result === "pending");
  const fails = run.items.filter((i) => effective(i).result === "fail");
  const canSubmit = unanswered.length === 0 && pendingSync === 0 && !submitting;

  return (
    <main className="flex min-h-full flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Review & submit</h1>
        <button onClick={onBack} className="min-h-[44px] text-sm font-semibold text-akira-blue">
          ← Items
        </button>
      </div>

      <ul className="flex flex-col gap-1.5">
        {run.items.map((item, i) => {
          const e = effective(item);
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center justify-between rounded-lg border bg-white px-3 py-2.5 text-sm",
                e.result === "fail" ? "border-akira-red/40" : "border-akira-ink/8",
              )}
            >
              <span className="min-w-0 truncate pr-2">
                <span className="mr-1.5 font-mono text-xs text-akira-ink/40">{i + 1}</span>
                {item.title_bn ?? item.title}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded px-2 py-0.5 text-[11px] font-bold uppercase",
                  e.result === "pass" && "bg-health-green/12 text-health-green",
                  e.result === "fail" && "bg-akira-red/10 text-akira-red",
                  e.result === "na" && "bg-akira-ink/8 text-akira-ink/55",
                  e.result === "pending" && "bg-health-amber/15 text-[#8a6414]",
                )}
              >
                {e.result === "pending" ? "not done" : e.result}
              </span>
            </li>
          );
        })}
      </ul>

      {fails.length > 0 && (
        <p className="text-sm text-akira-ink/60">
          {fails.length} item{fails.length === 1 ? "" : "s"} failed — a manager will see the notes
          and photos.
        </p>
      )}

      {unanswered.length > 0 && (
        <p className="rounded-lg bg-health-amber/10 px-3 py-2 text-sm text-[#8a6414]">
          {unanswered.length} item{unanswered.length === 1 ? "" : "s"} still unanswered. Go back and
          finish them.
        </p>
      )}
      {pendingSync > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-akira-ink px-3 py-2.5 text-sm text-white">
          <span>
            {pendingSync} change{pendingSync === 1 ? "" : "s"} still syncing — submit unlocks when
            everything is saved.
            {syncError && <span className="block text-xs text-white/60">{syncError}</span>}
          </span>
          <button
            onClick={onRetry}
            className="min-h-[44px] shrink-0 rounded-lg bg-white/15 px-3 font-semibold"
          >
            Retry
          </button>
        </div>
      )}
      {submitError && (
        <p
          role="alert"
          className="rounded-lg border border-akira-red/25 bg-akira-red/5 px-3 py-2 text-sm text-akira-red"
        >
          {submitError}
        </p>
      )}

      <button
        disabled={!canSubmit}
        onClick={onSubmit}
        className="mt-auto min-h-[60px] rounded-xl bg-akira-red text-[17px] font-bold text-white active:opacity-90 disabled:opacity-30"
      >
        {submitting ? "Submitting…" : "Submit checklist"}
      </button>
    </main>
  );
}
