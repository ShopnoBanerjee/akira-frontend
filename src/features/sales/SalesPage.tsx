import { Fragment, useMemo, useRef, useState } from "react";

import { Button, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useOutlets } from "@/features/admin/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { formatBusinessDate, formatOutletClock, formatOutletTime } from "@/lib/dates";
import { formatPaise, formatPaiseWhole } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  UPLOAD_STATUS,
  describeWarning,
  useDailyTotals,
  useItemSummary,
  useOrders,
  useReparse,
  useUploadExport,
  useUploads,
  type UploadRow,
} from "./api";
import { ForecastSection } from "./ForecastSection";

/**
 * Petpooja sales ingestion.
 *
 * Stage 1 ingests and shows; the sales dashboard is Stage 2. So this screen is
 * built to answer one question — did the file go in, and did it go in right —
 * rather than to analyse anything. That means showing the reconciliation
 * (what the parser made of the file), the trading days it landed on, and every
 * row the parser chose to skip.
 */
export function SalesPage() {
  const { me } = useAuth();
  const { data: outlets } = useOutlets();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const mine =
    me?.outlets.find((o) => o.is_primary)?.outlet_id ?? me?.outlets[0]?.outlet_id ?? null;
  const outletId =
    chosen ??
    (mine && outlets?.some((o) => o.id === mine) ? mine : null) ??
    outlets?.[0]?.id ??
    null;

  const uploads = useUploads(outletId);
  const daily = useDailyTotals(outletId);
  const orders = useOrders(outletId, day);
  const items = useItemSummary(outletId);

  const total = useMemo(
    () => (daily.data ?? []).reduce((sum, d) => sum + d.net_paise, 0),
    [daily.data],
  );
  const bills = useMemo(
    () => (daily.data ?? []).reduce((sum, d) => sum + d.bills, 0),
    [daily.data],
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
            Upload a Petpooja <span className="font-mono text-xs">Orders Master Report</span>{" "}
            (bills), <span className="font-mono text-xs">Order Listing</span> (item names per bill)
            or <span className="font-mono text-xs">Item Report: Day Wise</span> (true units per day)
            — the file says which it is. Bills are filed by trading day, so a bill struck at 00:45
            counts towards the night before. Sending the same file twice changes nothing.
          </p>
        </div>
        {outlets && outlets.length > 1 && (
          <select
            value={outletId ?? ""}
            onChange={(e) => {
              setChosen(e.target.value);
              setDay(null);
            }}
            className="h-9 rounded-md border border-akira-ink/15 bg-white px-3 text-sm outline-none focus-visible:border-akira-blue"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <ErrorNote>{error}</ErrorNote>

      {outletId && <Dropzone outletId={outletId} onError={setError} />}

      {/* --- What has been ingested ---------------------------------- */}
      {daily.data && daily.data.length > 0 && (
        <section className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3 rounded-lg border border-akira-ink/10 bg-white p-5">
          <Figure label="Net sales ingested" value={formatPaiseWhole(total)} big />
          <Figure label="Bills" value={String(bills)} />
          <Figure label="Trading days" value={String(daily.data.length)} />
          <Figure
            label="Earliest"
            value={formatBusinessDate(daily.data[daily.data.length - 1]!.business_date)}
          />
          <Figure label="Latest" value={formatBusinessDate(daily.data[0]!.business_date)} />
        </section>
      )}

      {/* --- Uploads --------------------------------------------------- */}
      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
        Uploads
      </h2>
      <div className="mt-2">
        {uploads.isPending && <TableSkeleton rows={2} />}
        {uploads.data?.length === 0 && (
          <EmptyState
            title="Nothing uploaded yet"
            hint="Export Orders → Master Report from Petpooja for the period you want, and drop the .xlsx above."
          />
        )}
        {uploads.data && uploads.data.length > 0 && (
          <div className="flex flex-col gap-2">
            {uploads.data.map((upload) => (
              <UploadCard key={upload.id} upload={upload} onError={setError} />
            ))}
          </div>
        )}
      </div>

      {/* --- Trading days ---------------------------------------------- */}
      {daily.data && daily.data.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
            By trading day
          </h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Business date</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Bills</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Covers</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Net sales</th>
                </tr>
              </thead>
              <tbody>
                {daily.data.map((d) => (
                  <tr
                    key={d.business_date}
                    onClick={() => setDay(day === d.business_date ? null : d.business_date)}
                    className={cn(
                      "cursor-pointer border-b border-akira-ink/5 last:border-0 hover:bg-akira-ink/[0.02]",
                      day === d.business_date && "bg-akira-blue/[0.06]",
                    )}
                  >
                    <td className="px-4 py-2">
                      {formatBusinessDate(d.business_date)}
                      <span className="ml-2 font-mono text-[11px] text-akira-ink/35">
                        {d.business_date}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{d.bills}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-akira-ink/60">
                      {d.covers || "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">
                      {formatPaise(d.net_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-akira-ink/45">
            Click a day to see its bills. Covers show only where Petpooja recorded a cover count.
          </p>
        </>
      )}

      {/* --- What sells -------------------------------------------------- */}
      {(items.data?.length ?? 0) > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
            What sells
          </h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Item</th>
                  <th className="px-4 py-2.5 text-right font-semibold">On bills</th>
                  <th className="px-4 py-2.5 text-right font-semibold">First seen</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {items.data?.slice(0, 12).map((row) => (
                  <tr key={row.item_name} className="border-b border-akira-ink/5 last:border-0">
                    <td className="px-4 py-2">{row.item_name}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{row.bills}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-akira-ink/60">
                      {formatBusinessDate(row.first_date)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-akira-ink/60">
                      {formatBusinessDate(row.last_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-akira-ink/45">
            Bills carrying the item at least once — not units sold. The Order Listing report names
            items without quantities, and this page does not invent them.
          </p>
        </>
      )}

      {outletId && <ForecastSection outletId={outletId} />}

      {/* --- Bills ------------------------------------------------------ */}
      {day && (
        <>
          <h2 className="mt-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
            Bills on {formatBusinessDate(day)}
            <button
              onClick={() => setDay(null)}
              className="font-sans text-[11px] normal-case tracking-normal text-akira-blue hover:underline"
            >
              clear
            </button>
          </h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Bill</th>
                  <th className="px-4 py-2.5 font-semibold">Struck</th>
                  <th className="px-4 py-2.5 font-semibold">Channel</th>
                  <th className="px-4 py-2.5 font-semibold">Payment</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Covers</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {orders.data?.map((o) => {
                  const clock = formatOutletClock(o.ordered_at);
                  const afterMidnight = clock < "05:00";
                  return (
                    <Fragment key={o.id}>
                      <tr
                        className={cn(
                          "border-b border-akira-ink/5 last:border-0",
                          o.items.length > 0 && "border-b-0",
                        )}
                      >
                        <td className="px-4 py-2 font-mono text-xs">{o.external_bill_no}</td>
                        <td className="px-4 py-2 tabular-nums">
                          {clock}
                          {afterMidnight && (
                            <span
                              title="Struck after midnight, so it counts towards the previous trading day."
                              className="ml-2 rounded bg-akira-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-akira-blue"
                            >
                              after midnight
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-akira-ink/70">
                          {o.channel?.replace(/_/g, " ") ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-akira-ink/60">{o.payment_mode ?? "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-akira-ink/60">
                          {o.covers ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums">
                          {formatPaise(o.net_paise)}
                        </td>
                      </tr>
                      {o.items.length > 0 && (
                        <tr className="border-b border-akira-ink/5 last:border-0">
                          <td colSpan={6} className="px-4 pb-2 pt-0 text-xs text-akira-ink/55">
                            {o.items.join(" · ")}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-akira-ink/45">
            Item names come from the Order Listing report and appear once one covering these dates
            has been uploaded. The listing carries no quantities, so none are shown.
          </p>
        </>
      )}
    </main>
  );
}

function Figure({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-akira-ink/45">{label}</p>
      <p className={cn("font-semibold tabular-nums", big ? "text-2xl" : "text-lg")}>{value}</p>
    </div>
  );
}

function Dropzone({
  outletId,
  onError,
}: {
  outletId: string;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadExport(outletId);
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  function send(file: File | undefined) {
    if (!file) return;
    onError(null);
    setNote(null);
    upload.mutate(file, {
      onSuccess: (r) => setNote(r.detail),
      onError: (e) => onError(e instanceof ApiError ? e.problem.detail : e.message),
    });
  }

  return (
    <div className="mt-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          send(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          over ? "border-akira-blue bg-akira-blue/5" : "border-akira-ink/15 bg-white",
        )}
      >
        <p className="text-sm font-medium">
          {upload.isPending ? "Uploading…" : "Drop a Petpooja export here"}
        </p>
        <p className="max-w-md text-xs text-akira-ink/50">
          Any of the three supported reports, exported as .xlsx. Parsing runs in the background; the
          row below will settle on its own. Upload the master first — the listing decorates bills it
          already knows.
        </p>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            send(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          variant="primary"
          disabled={upload.isPending}
          onClick={() => input.current?.click()}
        >
          Choose a file
        </Button>
      </div>
      {note && <p className="mt-2 text-sm text-akira-ink/60">{note}</p>}
    </div>
  );
}

function UploadCard({
  upload,
  onError,
}: {
  upload: UploadRow;
  onError: (message: string | null) => void;
}) {
  const reparse = useReparse();
  const [showWarnings, setShowWarnings] = useState(false);
  const status = UPLOAD_STATUS[upload.status] ?? { label: upload.status, tone: "busy" as const };

  return (
    <article className="rounded-lg border border-akira-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{upload.original_filename}</p>
          <p className="mt-0.5 text-xs text-akira-ink/50">
            {upload.uploaded_by_name ?? "unknown"} · {formatOutletTime(upload.created_at)}
            {upload.adapter_version && (
              <span className="ml-2 font-mono text-[10px] text-akira-ink/35">
                {upload.adapter_version}
              </span>
            )}
          </p>
          {/* What the file said it was. Shown because it is the string to
              copy into the expected-restaurant setting, and because an
              unexpected name here is the whole point of recording it. */}
          {upload.restaurant_name && (
            <p className="mt-0.5 truncate text-xs text-akira-ink/45">
              Restaurant: <span className="text-akira-ink/70">{upload.restaurant_name}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
              status.tone === "ok" && "bg-health-green/12 text-health-green",
              status.tone === "busy" && "bg-akira-blue/10 text-akira-blue",
              status.tone === "bad" && "bg-akira-red/10 text-akira-red",
            )}
          >
            {status.label}
          </span>
          <Button
            disabled={reparse.isPending}
            title="Read the stored file again — after an adapter change, or a fix."
            onClick={() =>
              reparse.mutate(upload.id, {
                onError: (e) => onError(e instanceof ApiError ? e.problem.detail : e.message),
              })
            }
          >
            Re-parse
          </Button>
        </div>
      </div>

      {upload.status === "parsed" && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-akira-ink/60">
          <span>
            Bills: <b className="font-semibold text-akira-ink">{upload.row_count}</b>
          </span>
          <span>
            Net:{" "}
            <b className="font-semibold text-akira-ink">{formatPaise(upload.parsed_net_paise)}</b>
          </span>
          {upload.period_start && upload.period_end && (
            <span>
              Covering {formatBusinessDate(upload.period_start)} to{" "}
              {formatBusinessDate(upload.period_end)}
            </span>
          )}
        </div>
      )}

      {upload.error_detail && (
        <p className="mt-3 rounded-md border border-akira-red/25 bg-akira-red/5 px-3 py-2 text-sm text-akira-red">
          {upload.error_detail}
        </p>
      )}

      {upload.warnings.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="text-xs font-semibold text-[#8a6414] hover:underline"
          >
            {upload.warnings.length} row{upload.warnings.length === 1 ? "" : "s"} the parser did not
            count {showWarnings ? "▴" : "▾"}
          </button>
          {showWarnings && (
            <ul className="mt-1.5 flex flex-col gap-1 rounded-md bg-health-amber/[0.08] px-3 py-2">
              {upload.warnings.map((w, i) => (
                <li key={i} className="text-xs text-akira-ink/70">
                  {describeWarning(w)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {upload.status === "parsed" && upload.warnings.length === 0 && (
        <p className="mt-2 text-xs text-akira-ink/45">
          Every row in the file was counted — nothing skipped.
        </p>
      )}
    </article>
  );
}
