import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { navigate } from "@/app/navigate";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { UI } from "./content";
import type { Language, TrainingRecord } from "./api";
import { useCompleteTraining, useRecordStep, useSkipTraining, useStartTraining } from "./api";
import { placeCard, progressLabel, spotlightRect, type Rect, type TourStep } from "./tour";

/** Ask the shell to open or close its navigation so a nav anchor is visible. */
export const TOUR_NAV_EVENT = "akira:tour-nav";

interface Props {
  steps: TourStep[];
  version: string;
  canSkip: boolean;
  /** The attempt already open at this version, to resume from. */
  record: TrainingRecord | null;
  /** Called after the server has accepted the completion or skip. */
  onDone: () => void;
  /** A voluntary re-run: the person may close it at any time. */
  optional?: boolean;
}

const CARD = { width: 340, height: 220 };
const ANCHOR_TRIES = 25;
const ANCHOR_INTERVAL_MS = 80;

function findAnchor(anchor: string | null): Element | null {
  if (!anchor) return null;
  const candidates = Array.from(document.querySelectorAll(`[data-tour="${anchor}"]`));
  // Prefer a visible one: the sidebar and the mobile drawer both carry the
  // nav anchors, and only one of them is on screen.
  return (
    candidates.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/**
 * The guided tour: dims the page, spotlights the real control, explains it,
 * and records each step as it is reached. Next is the only way forward - the
 * highlighted control is shown, not pressed, so the tour can never navigate
 * itself somewhere its next step does not expect (D31).
 */
export function Tour({ steps, version, canSkip, record, onDone, optional = false }: Props) {
  const start = useStartTraining();
  const recordStep = useRecordStep();
  const complete = useCompleteTraining();
  const skip = useSkipTraining();

  const [lang, setLang] = useState<Language | null>(record?.language ?? null);
  const [attempt, setAttempt] = useState<TrainingRecord | null>(record);
  const [index, setIndex] = useState(() =>
    record ? Math.min(Math.max(record.last_step, 0), Math.max(steps.length - 1, 0)) : 0,
  );
  const [target, setTarget] = useState<Rect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const step = steps[index];
  const total = steps.length;
  const isLast = index === total - 1;
  const busy = start.isPending || complete.isPending || skip.isPending;

  const onError = useCallback((e: unknown) => {
    setError(e instanceof ApiError ? e.problem.detail : (UI.failed.en satisfies string));
  }, []);

  // --- Language, then the attempt -----------------------------------------
  function chooseLanguage(choice: Language) {
    setLang(choice);
    if (attempt) return;
    start.mutate(
      { version, total_steps: total, language: choice },
      {
        onSuccess: (rec) => {
          setAttempt(rec);
          setIndex(Math.min(Math.max(rec.last_step, 0), Math.max(total - 1, 0)));
        },
        onError,
      },
    );
  }

  // --- Follow the step: route, nav drawer, anchor ---------------------------
  useEffect(() => {
    if (!lang || !attempt || !step) return;
    if (step.route && window.location.pathname !== step.route) navigate(step.route);
    const wantsNav = step.anchor !== null && /^(nav-|signout)/.test(step.anchor);
    window.dispatchEvent(new CustomEvent(TOUR_NAV_EVENT, { detail: { open: wantsNav } }));

    let tries = 0;
    let timer: number | undefined;
    let cancelled = false;
    const look = () => {
      if (cancelled) return;
      const el = findAnchor(step.anchor);
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        // Measure after the scroll settles.
        timer = window.setTimeout(() => !cancelled && setTarget(rectOf(el)), 60);
        return;
      }
      tries += 1;
      if (tries < ANCHOR_TRIES) timer = window.setTimeout(look, ANCHOR_INTERVAL_MS);
      else setTarget(null);
    };
    setTarget(null);
    look();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [step, lang, attempt]);

  useLayoutEffect(() => {
    const onChange = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const el = findAnchor(step?.anchor ?? null);
      setTarget(el ? rectOf(el) : null);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [step]);

  useEffect(
    () => () => {
      window.dispatchEvent(new CustomEvent(TOUR_NAV_EVENT, { detail: { open: false } }));
    },
    [],
  );

  // --- Moving ---------------------------------------------------------------
  function goNext() {
    if (!attempt || !step) return;
    setError(null);
    if (isLast) {
      complete.mutate({ record_id: attempt.id }, { onSuccess: onDone, onError });
      return;
    }
    // Record the step reached, but do not make the person wait for the wire.
    recordStep.mutate({ record_id: attempt.id, step: index + 1 });
    setIndex(index + 1);
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  function doSkip() {
    if (!attempt) return;
    skip.mutate({ record_id: attempt.id }, { onSuccess: onDone, onError });
  }

  const card = useMemo(
    () => placeCard(target ? spotlightRect(target) : null, viewport, CARD),
    [target, viewport],
  );
  const hole = target ? spotlightRect(target) : null;
  const l: Language = lang ?? "en";

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={step ? step.title[l] : UI.chooseLanguage[l]}
    >
      {/* The dim, with a hole cut where the control is. */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="akira-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {hole && (
              <rect
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(35,31,32,0.62)" mask="url(#akira-tour-mask)" />
        {hole && (
          <rect
            x={hole.left}
            y={hole.top}
            width={hole.width}
            height={hole.height}
            rx="10"
            fill="none"
            stroke="#ee3345"
            strokeWidth="2.5"
          />
        )}
      </svg>

      {!lang ? (
        <div className="absolute inset-0 flex items-center justify-center p-5">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/50">
              AKIRA Ops
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {UI.chooseLanguage.en} · {UI.chooseLanguage.bn}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseLanguage("en")}
                className="min-h-[56px] rounded-lg border-2 border-akira-ink/15 text-[16px] font-semibold hover:border-akira-red"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => chooseLanguage("bn")}
                className="min-h-[56px] rounded-lg border-2 border-akira-ink/15 text-[16px] font-semibold hover:border-akira-red"
              >
                বাংলা
              </button>
            </div>
            <p className="mt-3 text-xs text-akira-ink/50">
              {UI.languageHint.en} {UI.languageHint.bn}
            </p>
            {error && <p className="mt-3 text-sm font-medium text-akira-red">{error}</p>}
          </div>
        </div>
      ) : (
        step && (
          <div
            className="absolute w-[340px] max-w-[calc(100vw-24px)] rounded-xl bg-white p-5 shadow-2xl"
            style={{ top: card.top, left: card.left }}
            data-placement={card.placement}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-akira-ink/50">
                {progressLabel(index, total, l)}
              </span>
              <button
                type="button"
                onClick={() => setLang(l === "en" ? "bn" : "en")}
                className="min-h-[32px] rounded px-2 text-xs font-semibold text-akira-blue"
                aria-label="Switch language"
              >
                {l === "en" ? "বাংলা" : "English"}
              </button>
            </div>
            <h2 className="mt-1 text-[17px] font-semibold tracking-tight">{step.title[l]}</h2>
            <p className="mt-2 text-sm leading-relaxed text-akira-ink/75">{step.body[l]}</p>
            {error && <p className="mt-2 text-sm font-medium text-akira-red">{error}</p>}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={index === 0 || busy}
                className="min-h-[44px] rounded-md px-3 text-sm font-semibold text-akira-ink/60 disabled:opacity-30"
              >
                {UI.back[l]}
              </button>
              <div className="flex items-center gap-2">
                {(canSkip || optional) && !isLast && (
                  <button
                    type="button"
                    onClick={optional ? onDone : doSkip}
                    disabled={busy}
                    className="min-h-[44px] rounded-md px-3 text-xs font-semibold text-akira-ink/50"
                  >
                    {optional ? "✕" : UI.skip[l]}
                  </button>
                )}
                <button
                  type="button"
                  onClick={goNext}
                  disabled={busy || !attempt}
                  className={cn(
                    "min-h-[44px] rounded-md bg-akira-red px-5 text-sm font-semibold text-white",
                    busy && "opacity-60",
                  )}
                >
                  {busy ? UI.saving[l] : isLast ? UI.finish[l] : UI.next[l]}
                </button>
              </div>
            </div>
            {!optional && !canSkip && (
              <p className="mt-3 text-[11px] text-akira-ink/45">{UI.required[l]}</p>
            )}
          </div>
        )
      )}
    </div>
  );
}
