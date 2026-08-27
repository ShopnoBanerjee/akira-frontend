import { useState } from "react";

import { navigate } from "@/app/navigate";
import { Button, EmptyState, TableSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import {
  BAND_COLOUR,
  BAND_TEXT,
  pct,
  sparklinePath,
  useOutletHealth,
  useOutletScores,
  type Band,
  type OutletHealth,
} from "./api";

const PERIODS = [7, 28, 90];

/**
 * The Outlet Health card (spec section 5).
 *
 * Four pillars, of which Stage 1 delivers exactly one. The other three are
 * drawn greyed rather than omitted, so the shape of the finished thing is
 * visible from the start and the layout does not move when they arrive.
 *
 * There is deliberately no blended health number yet. Multiplying the one live
 * pillar by its 0.30 weight would read as a catastrophic 27/100 for a perfect
 * outlet; silently rescaling it would make the number jump the day a second
 * pillar lands, with nothing about the outlet having changed. The headline is
 * the SOP compliance score, labelled as exactly that.
 */
export function DashboardPage() {
  const { me } = useAuth();
  const [days, setDays] = useState(28);
  const { data: outlets, isPending, isError, refetch } = useOutletScores(days);
  const [selected, setSelected] = useState<string | null>(null);

  const active =
    selected ??
    outlets?.find((o) => me?.outlets.some((m) => m.outlet_id === o.outlet_id))?.outlet_id ??
    outlets?.[0]?.outlet_id ??
    null;
  const {
    data: health,
    isPending: healthPending,
    isPlaceholderData,
  } = useOutletHealth(active, days);

  if (!me) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{me.full_name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            {ROLE_LABELS[me.global_role]}
            {me.is_global && " · sees every outlet"}
          </p>
        </div>
        <div className="flex rounded-md border border-akira-ink/15 bg-white p-0.5">
          {PERIODS.map((option) => (
            <button
              key={option}
              onClick={() => setDays(option)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold",
                days === option
                  ? "bg-akira-ink text-white"
                  : "text-akira-ink/60 hover:bg-akira-ink/5",
              )}
            >
              {option} days
            </button>
          ))}
        </div>
      </div>

      {isPending && (
        <div className="mt-6">
          <TableSkeleton rows={3} />
        </div>
      )}
      {isError && (
        <div className="mt-6">
          <EmptyState
            title="Could not load outlet health"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        </div>
      )}
      {outlets?.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No outlets yet"
            hint="Create an outlet under Settings → Outlets and assign a checklist to it."
          />
        </div>
      )}

      {outlets && outlets.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {outlets.map((outlet) => (
            <button
              key={outlet.outlet_id}
              onClick={() => setSelected(outlet.outlet_id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                active === outlet.outlet_id
                  ? "border-akira-ink/25 bg-white"
                  : "border-akira-ink/10 bg-white/50 hover:bg-white",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: BAND_COLOUR[outlet.band as Band] }}
              />
              <span className="font-mono text-xs">{outlet.outlet_code}</span>
              <span className="font-semibold tabular-nums">
                {outlet.score == null ? "—" : Math.round(outlet.score)}
              </span>
            </button>
          ))}
        </div>
      )}

      {healthPending && active !== null && (
        <div className="mt-4">
          <TableSkeleton rows={5} />
        </div>
      )}
      {health && (
        // Dimmed while the next outlet or period is in flight, so a stale
        // number is never mistaken for a fresh one.
        <div className={cn(isPlaceholderData && "opacity-50 transition-opacity")}>
          <HealthCard health={health} />
        </div>
      )}
    </main>
  );
}

function HealthCard({ health }: { health: OutletHealth }) {
  const { sop, trend } = health;
  const scores = trend.map((t) => t.score);
  const path = sparklinePath(scores, 220, 40);

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
        {/* --- Headline ------------------------------------------------- */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-akira-ink/8 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/45">
              SOP compliance · {health.outlet_code}
            </p>
            <div className="mt-1 flex items-end gap-3">
              <span className={cn("text-5xl font-semibold tabular-nums", BAND_TEXT[sop.band])}>
                {sop.score == null ? "—" : Math.round(sop.score)}
              </span>
              <span className="pb-1.5 text-sm text-akira-ink/45">/ 100</span>
              <span
                className={cn(
                  "mb-2 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                  sop.band === "green" && "bg-health-green/12 text-health-green",
                  sop.band === "amber" && "bg-health-amber/15 text-[#8a6414]",
                  sop.band === "red" && "bg-akira-red/10 text-akira-red",
                  sop.band === "none" && "bg-akira-ink/8 text-akira-ink/50",
                )}
              >
                {sop.band === "none" ? "no data" : sop.band}
              </span>
            </div>
            <p className="mt-1 text-xs text-akira-ink/50">
              {health.period.from} to {health.period.to}
            </p>

            {sop.score == null && (
              <p className="mt-3 max-w-sm text-sm text-akira-ink/55">
                Nothing was scheduled in this period, so there is no score. A closed outlet has not
                failed — it has not been measured.
              </p>
            )}
            {sop.capped_by_critical && (
              <p className="mt-3 max-w-sm rounded-md border border-health-amber/40 bg-health-amber/10 px-3 py-2 text-sm text-[#8a6414]">
                <strong className="font-semibold">Held at amber.</strong> The arithmetic says{" "}
                {Math.round(sop.score ?? 0)}, but an outlet cannot be green with{" "}
                {sop.counts.open_critical} unresolved critical failure
                {sop.counts.open_critical === 1 ? "" : "s"}.{" "}
                <button
                  onClick={() => navigate("/app/sop/exceptions")}
                  className="font-semibold underline"
                >
                  Clear them
                </button>
              </p>
            )}
            {sop.dragged_down_by?.value != null && sop.score != null && !sop.capped_by_critical && (
              <p className="mt-3 text-sm text-akira-ink/65">
                Dragged down by:{" "}
                <strong className="font-semibold">
                  {sop.dragged_down_by.label.toLowerCase()} {pct(sop.dragged_down_by.value)}
                </strong>
              </p>
            )}
          </div>

          {/* --- Sparkline --------------------------------------------- */}
          <div className="min-w-[240px]">
            <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
              Approved run score
            </p>
            {path ? (
              <>
                <svg
                  viewBox="0 0 220 40"
                  className="mt-2 h-12 w-[220px] overflow-visible"
                  role="img"
                  aria-label={`Mean approved run score across ${trend.length} days`}
                >
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--color-akira-blue)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="mt-1 text-xs text-akira-ink/45">
                  {Math.round(Math.min(...scores))}–{Math.round(Math.max(...scores))} across{" "}
                  {trend.length} day{trend.length === 1 ? "" : "s"} with approvals
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-akira-ink/45">
                {trend.length === 1
                  ? "One day of approvals so far — not yet a trend."
                  : "No approved runs in this period."}
              </p>
            )}
          </div>
        </div>

        {/* --- How the number was reached ------------------------------- */}
        <div className="grid gap-px bg-akira-ink/8 sm:grid-cols-3">
          {sop.components.map((component) => (
            <div key={component.key} className="bg-white p-4">
              <p className="text-xs text-akira-ink/50">{component.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{pct(component.value)}</p>
              <p className="mt-0.5 text-[11px] text-akira-ink/40">
                weight {component.weight.toFixed(2)} · contributes{" "}
                {component.contribution.toFixed(1)}
              </p>
            </div>
          ))}
        </div>

        {sop.penalties.length > 0 && (
          <div className="border-t border-akira-ink/8 bg-akira-red/[0.03] px-4 py-3">
            {sop.penalties.map((penalty) => (
              <p key={penalty.key} className="text-sm text-akira-ink/70">
                <span className="font-semibold text-akira-red">−{penalty.points.toFixed(1)}</span>{" "}
                {penalty.label.toLowerCase()} — {penalty.detail}
              </p>
            ))}
          </div>
        )}

        {/* --- The counts behind it ------------------------------------ */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-akira-ink/8 px-4 py-3 text-xs text-akira-ink/55">
          <Count label="Scheduled" value={sop.counts.scheduled} />
          <Count label="Approved" value={sop.counts.approved} />
          <Count label="Awaiting review" value={sop.counts.submitted - sop.counts.approved} />
          <Count label="Missed" value={sop.counts.missed} bad={sop.counts.missed > 0} />
          <Count
            label="Integrity flags"
            value={sop.counts.integrity_flags}
            bad={sop.counts.integrity_flags > 0}
          />
          <Count
            label="Open critical"
            value={sop.counts.open_critical}
            bad={sop.counts.open_critical > 0}
          />
        </div>
      </section>

      {/* --- The other three pillars ---------------------------------- */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
          Outlet health
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
          One number per outlet from four weighted pillars. Stage 1 measures one of them, so there
          is no blended score yet — a figure built from a quarter of the evidence would be worse
          than none.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {health.pillars.map((pillar) => (
            <article
              key={pillar.key}
              className={cn(
                "rounded-lg border p-4",
                pillar.status === "live"
                  ? "border-akira-ink/15 bg-white"
                  : "border-dashed border-akira-ink/12 bg-akira-ink/[0.02]",
              )}
            >
              <div className="flex items-baseline justify-between">
                <p
                  className={cn(
                    "text-sm font-medium",
                    pillar.status === "live" ? "text-akira-ink" : "text-akira-ink/40",
                  )}
                >
                  {pillar.label}
                </p>
                <span className="text-[11px] text-akira-ink/35">{pillar.weight}%</span>
              </div>
              {pillar.status === "live" ? (
                <p
                  className={cn("mt-2 text-2xl font-semibold tabular-nums", BAND_TEXT[pillar.band])}
                >
                  {pillar.score == null ? "—" : Math.round(pillar.score)}
                </p>
              ) : (
                <p className="mt-2 text-xs text-akira-ink/35">Coming in Stage 2</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Count({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <span>
      {label}:{" "}
      <span className={cn("font-semibold tabular-nums", bad ? "text-akira-red" : "text-akira-ink")}>
        {value}
      </span>
    </span>
  );
}
