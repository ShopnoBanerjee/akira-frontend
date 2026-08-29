import { useState } from "react";

import { navigate } from "@/app/navigate";
import { Button, EmptyState, TableSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/features/auth/types";
import { cn } from "@/lib/utils";
import { useOutletHealth, useOutletScores, type OutletHealth } from "./api";
import { BAND_COLOUR, BAND_TEXT, pct, sparklinePath, type Band } from "./format";

const PERIODS = [7, 28, 90];

/**
 * The Outlet Health card (spec section 5).
 *
 * All four pillars now produce (P15), so the headline is the BLENDED health
 * D14 used to refuse: sum(pillar x weight) renormalised over the pillars
 * actually measured this period. A pillar with nothing to measure (no
 * confirmed counts yet, say) leaves the denominator and is named beside the
 * number — never padded with a zero, because "not measured" and "failed"
 * must not look alike.
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
  const unmeasuredLabels = health.pillars
    .filter((pillar) => health.health.unmeasured.includes(pillar.key))
    .map((pillar) => pillar.label);

  return (
    <>
      <section className="mt-4 overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
        {/* --- Headline: the blended health score ----------------------- */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-akira-ink/8 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/45">
              Outlet health · {health.outlet_code}
            </p>
            <div className="mt-1 flex items-end gap-3">
              <span
                className={cn("text-5xl font-semibold tabular-nums", BAND_TEXT[health.health.band])}
              >
                {health.health.score == null ? "—" : Math.round(health.health.score)}
              </span>
              <span className="pb-1.5 text-sm text-akira-ink/45">/ 100</span>
              <span
                className={cn(
                  "mb-2 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                  health.health.band === "green" && "bg-health-green/12 text-health-green",
                  health.health.band === "amber" && "bg-health-amber/15 text-[#8a6414]",
                  health.health.band === "red" && "bg-akira-red/10 text-akira-red",
                  health.health.band === "none" && "bg-akira-ink/8 text-akira-ink/50",
                )}
              >
                {health.health.band === "none" ? "no data" : health.health.band}
              </span>
            </div>
            <p className="mt-1 text-xs text-akira-ink/50">
              {health.period.from} to {health.period.to}
            </p>

            {health.health.score == null && (
              <p className="mt-3 max-w-sm text-sm text-akira-ink/55">
                Nothing was measured in this period, so there is no score. A closed outlet has not
                failed — it has not been measured.
              </p>
            )}
            {unmeasuredLabels.length > 0 && health.health.score != null && (
              <p className="mt-3 max-w-sm text-sm text-akira-ink/55">
                Blended from {health.health.weights_used} of {health.health.weights_total} weight
                points — {unmeasuredLabels.join(" and ").toLowerCase()}{" "}
                {unmeasuredLabels.length === 1 ? "has" : "have"} nothing to measure yet and{" "}
                {unmeasuredLabels.length === 1 ? "sits" : "sit"} outside the number.
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

        {/* --- The pillar row ------------------------------------------ */}
        <div className="grid gap-px bg-akira-ink/8 sm:grid-cols-2 lg:grid-cols-4">
          {health.pillars.map((pillar) => (
            <article key={pillar.key} className="bg-white p-4">
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
                <p className="mt-2 text-xs text-akira-ink/35">Nothing to measure yet</p>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* --- SOP compliance ------------------------------------------- */}
      <section className="mt-6">
        <SectionHeading label="SOP compliance" score={sop.score} band={sop.band} />
        {sop.capped_by_critical && (
          <p className="mt-2 max-w-lg rounded-md border border-health-amber/40 bg-health-amber/10 px-3 py-2 text-sm text-[#8a6414]">
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
          <p className="mt-1 text-sm text-akira-ink/60">
            Dragged down by:{" "}
            <strong className="font-semibold">
              {sop.dragged_down_by.label.toLowerCase()} {pct(sop.dragged_down_by.value)}
            </strong>
          </p>
        )}
        <div className="mt-3 overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
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
        </div>
      </section>

      {/* --- Sales & growth ------------------------------------------- */}
      <section className="mt-6">
        <SectionHeading
          label="Sales & growth"
          score={health.sales.score}
          band={health.sales.band}
        />
        {health.sales.score == null ? (
          <NotMeasured text="Nothing traded in this period, so there is nothing to score — a shut period has not failed, it has not been measured." />
        ) : (
          <>
            {health.sales.dragged_down_by && (
              <p className="mt-1 text-sm text-akira-ink/60">
                Dragged down by: {health.sales.dragged_down_by.label.toLowerCase()}{" "}
                {health.sales.dragged_down_by.display}
              </p>
            )}
            <ComponentTable
              rows={health.sales.components.map((component) => ({
                ...component,
                status: "live" as const,
                note: null,
              }))}
            />
          </>
        )}
      </section>

      {/* --- Inventory discipline (P15) ------------------------------- */}
      <section className="mt-6">
        <SectionHeading
          label="Inventory discipline"
          score={health.inventory.score}
          band={health.inventory.band}
        />
        {health.inventory.score == null ? (
          <NotMeasured text="No confirmed counts and no finalised requisitions in this period. The pillar arms itself the day the first stock count is confirmed." />
        ) : (
          <>
            {health.inventory.dragged_down_by && (
              <p className="mt-1 text-sm text-akira-ink/60">
                Dragged down by: {health.inventory.dragged_down_by.label.toLowerCase()}{" "}
                {health.inventory.dragged_down_by.display}
              </p>
            )}
            <ComponentTable rows={health.inventory.components} />
          </>
        )}
      </section>

      {/* --- Guest & throughput (P15) --------------------------------- */}
      <section className="mt-6">
        <SectionHeading
          label="Guest & throughput"
          score={health.guest.score}
          band={health.guest.band}
        />
        {health.guest.score == null ? (
          <NotMeasured text="No customers identified by phone in this period — capture rate is scored under Sales & growth; this pillar needs someone to come back." />
        ) : (
          <ComponentTable rows={health.guest.components} />
        )}
      </section>
    </>
  );
}

function SectionHeading({
  label,
  score,
  band,
}: {
  label: string;
  score: number | null;
  band: Band;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
        {label}
      </h2>
      {score != null && (
        <span className={cn("text-sm font-semibold tabular-nums", BAND_TEXT[band])}>
          {score} / 100
        </span>
      )}
    </div>
  );
}

function NotMeasured({ text }: { text: string }) {
  return (
    <p className="mt-2 rounded-lg border border-dashed border-akira-ink/12 bg-akira-ink/[0.02] p-4 text-sm text-akira-ink/55">
      {text}
    </p>
  );
}

interface ComponentRow {
  key: string;
  label: string;
  display: string;
  target: string;
  score: number | null;
  weight: number;
  contribution: number;
  band: Band;
  status: "live" | "monitor" | "pending";
  note: string | null;
}

function ComponentTable({ rows }: { rows: ComponentRow[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wide text-akira-ink/45">
          <tr>
            <th className="px-4 py-2 font-semibold">Component</th>
            <th className="px-4 py-2 text-right font-semibold">Value</th>
            <th className="px-4 py-2 font-semibold">Target</th>
            <th className="px-4 py-2 text-right font-semibold">Score</th>
            <th className="px-4 py-2 text-right font-semibold">Weight</th>
            <th className="px-4 py-2 text-right font-semibold">Contributes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((component) => (
            <tr
              key={component.key}
              className={cn(
                "border-b border-akira-ink/5 last:border-0",
                component.status === "pending" && "text-akira-ink/40",
              )}
            >
              <td className="px-4 py-2">
                {component.label}
                {component.status === "monitor" && (
                  <span className="ml-2 rounded bg-akira-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-akira-blue">
                    monitor
                  </span>
                )}
              </td>
              <td
                className={cn(
                  "px-4 py-2 text-right font-mono tabular-nums",
                  component.status === "live" && BAND_TEXT[component.band],
                )}
              >
                {component.status === "pending" ? (component.note ?? "—") : component.display}
              </td>
              <td className="px-4 py-2 text-akira-ink/50">{component.target}</td>
              <td className="px-4 py-2 text-right tabular-nums">{component.score ?? "—"}</td>
              <td className="px-4 py-2 text-right tabular-nums text-akira-ink/50">
                {component.weight > 0 ? component.weight : "—"}
              </td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums">
                {component.weight > 0 ? component.contribution : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
