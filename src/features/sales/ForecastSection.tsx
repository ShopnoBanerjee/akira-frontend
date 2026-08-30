import { useState } from "react";

import { Button } from "@/components/ui/primitives";
import { formatBusinessDate } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  useCreateForecastEvent,
  useDeleteForecastEvent,
  useForecast,
  useForecastAccuracy,
  useForecastEvents,
  type ForecastDay,
} from "./api";

/**
 * The spec-5.1 baseline forecast, with its working shown.
 *
 * Every number is median x trend x event, and the row says which — a
 * forecast a manager cannot check is one they learn to ignore. The MAPE
 * line reports how the stored, made-in-advance forecasts actually scored;
 * it is the evidence any cleverer model will one day have to beat (D23).
 */
export function ForecastSection({ outletId }: { outletId: string }) {
  const forecast = useForecast(outletId);
  const accuracy = useForecastAccuracy(outletId);
  const events = useForecastEvents(outletId);

  if (forecast.isPending) return null;
  const days = forecast.data ?? [];
  if (days.length === 0) return null;

  const acc = accuracy.data;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
          Next {days.length} days — baseline forecast
        </h2>
        {acc != null && acc.day_ahead_days > 0 && (
          <span className="text-xs text-akira-ink/55">
            day-ahead error {acc.mape_day_ahead}% over {acc.day_ahead_days} scored day
            {acc.day_ahead_days === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="mt-2 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
              <th className="px-4 py-2.5 font-semibold">Day</th>
              <th className="px-4 py-2.5 text-right font-semibold">Forecast net</th>
              <th className="px-4 py-2.5 text-right font-semibold">Covers</th>
              <th className="px-4 py-2.5 font-semibold">How it was reached</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <ForecastRow key={d.target_date} day={d} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-xs text-akira-ink/45">
        Median of the last four same weekdays, times a clamped 14-day trend, times any event flag.
        Nothing here is learned or clever, on purpose — a cleverer model must first beat this one on
        the scored history above.
      </p>

      <EventFlags outletId={outletId} events={events.data ?? []} />
    </section>
  );
}

function ForecastRow({ day }: { day: ForecastDay }) {
  const c = day.components;
  if (day.net_paise == null) {
    return (
      <tr className="border-b border-akira-ink/5 last:border-0">
        <td className="px-4 py-2 tabular-nums">{formatBusinessDate(day.target_date)}</td>
        <td colSpan={3} className="px-4 py-2 text-akira-ink/50">
          No forecast — {day.reason}
        </td>
      </tr>
    );
  }
  const median = typeof c.median_net_paise === "number" ? c.median_net_paise : null;
  const trend = typeof c.trend_factor === "number" ? c.trend_factor : 1;
  const event = typeof c.event_multiplier === "number" ? c.event_multiplier : 1;
  const label = typeof c.event_label === "string" ? c.event_label : null;
  return (
    <tr className="border-b border-akira-ink/5 last:border-0">
      <td className="px-4 py-2 tabular-nums">{formatBusinessDate(day.target_date)}</td>
      <td className="px-4 py-2 text-right font-semibold tabular-nums">
        {formatPaise(day.net_paise)}
      </td>
      <td className="px-4 py-2 text-right tabular-nums text-akira-ink/60">{day.covers ?? "—"}</td>
      <td className="px-4 py-2 text-xs text-akira-ink/55">
        {median != null && <>median {formatPaise(median)}</>} × trend {trend}
        {event !== 1 && (
          <>
            {" "}
            ×{" "}
            <span className="rounded bg-akira-blue/10 px-1 py-0.5 font-semibold text-akira-blue">
              {event} {label}
            </span>
          </>
        )}
      </td>
    </tr>
  );
}

function EventFlags({
  outletId,
  events,
}: {
  outletId: string;
  events: { id: string; event_date: string; multiplier: number; label: string }[];
}) {
  const create = useCreateForecastEvent(outletId);
  const remove = useDeleteForecastEvent();
  const [date, setDate] = useState("");
  const [multiplier, setMultiplier] = useState("1.2");
  const [label, setLabel] = useState("");

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
        Event flags
      </h3>
      <p className="mt-1 text-xs text-akira-ink/45">
        Write the festival down before it happens — the multiplier applies to that day&apos;s
        forecast and is named in its working.
      </p>
      {events.length > 0 && (
        <ul className="mt-2 space-y-1">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-2 text-sm">
              <span className="tabular-nums">{formatBusinessDate(e.event_date)}</span>
              <span className="font-semibold text-akira-blue">×{e.multiplier}</span>
              <span className="text-akira-ink/70">{e.label}</span>
              <button
                onClick={() => remove.mutate(e.id)}
                className="text-xs text-akira-ink/40 hover:text-akira-red"
                aria-label={`Remove ${e.label}`}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-2 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!date || !label.trim()) return;
          create.mutate(
            { event_date: date, multiplier: Number(multiplier), label: label.trim() },
            { onSuccess: () => setLabel("") },
          );
        }}
      >
        <label className="text-xs text-akira-ink/55">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-0.5 block rounded-md border border-akira-ink/15 px-2 py-1.5 text-sm"
            required
          />
        </label>
        <label className="text-xs text-akira-ink/55">
          Multiplier
          <input
            type="number"
            step="0.05"
            min="0.2"
            max="5"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            className="mt-0.5 block w-24 rounded-md border border-akira-ink/15 px-2 py-1.5 text-sm tabular-nums"
            required
          />
        </label>
        <label className="flex-1 text-xs text-akira-ink/55">
          What is happening
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Durga Puja weekend"
            className="mt-0.5 block w-full min-w-40 rounded-md border border-akira-ink/15 px-2 py-1.5 text-sm"
            required
          />
        </label>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Flagging…" : "Flag it"}
        </Button>
      </form>
      <p className={cn("mt-1 text-xs text-akira-red", create.isError ? "visible" : "invisible")}>
        Could not save the flag — check the values and try again.
      </p>
    </div>
  );
}
