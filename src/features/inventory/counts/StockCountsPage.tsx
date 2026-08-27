import { useRef, useState } from "react";

import { navigate } from "@/app/navigate";

import { Button, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useOutlets } from "@/features/admin/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { formatBusinessDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useCounts, useUploadSheet, type CountRow } from "./api";

/**
 * Stock counts: the list, and the way in.
 *
 * The physical artifact is a photographed paper sheet. This screen answers:
 * did the sheet go in, has the machine read it, and how much of it still
 * needs a human. The review itself lives on the count's own page.
 */
export function StockCountsPage() {
  const { me } = useAuth();
  const { data: outlets } = useOutlets();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const mine =
    me?.outlets.find((o) => o.is_primary)?.outlet_id ?? me?.outlets[0]?.outlet_id ?? null;
  const outletId =
    chosen ??
    (mine && outlets?.some((o) => o.id === mine) ? mine : null) ??
    outlets?.[0]?.id ??
    null;

  const counts = useCounts(outletId);
  const upload = useUploadSheet();

  function pickFile() {
    fileInput.current?.click();
  }

  function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || !outletId) return;
    setError(null);
    upload.mutate(
      { outletId, file },
      {
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Stock counts</h1>
          <p className="mt-1 max-w-xl text-sm text-akira-ink/60">
            Photographed count sheets, read by the extractor and checked by a person. Nothing
            becomes the outlet&apos;s on-hand truth until someone has resolved every line the
            machine was unsure about.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {outlets && outlets.length > 1 && (
            <select
              aria-label="Outlet"
              className="rounded border border-akira-ink/15 px-2 py-1.5 text-sm"
              value={outletId ?? ""}
              onChange={(e) => setChosen(e.target.value)}
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code}
                </option>
              ))}
            </select>
          )}
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => onFile(e.target.files)}
          />
          <Button onClick={pickFile} disabled={upload.isPending || !outletId}>
            {upload.isPending ? "Uploading…" : "Upload sheet"}
          </Button>
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <section className="mt-6">
        {counts.isPending && <TableSkeleton rows={3} />}
        {counts.isError && (
          <ErrorNote>
            Could not load the counts.{" "}
            <button className="underline" onClick={() => void counts.refetch()}>
              Try again
            </button>
          </ErrorNote>
        )}
        {counts.data && counts.data.length === 0 && (
          <EmptyState
            title="No count sheets yet"
            hint="Photograph the day's count sheet (or export it as a PDF) and upload it here. The extractor reads it; you check what it wasn't sure about."
          />
        )}
        {counts.data && counts.data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wide text-akira-ink/45">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Business date</th>
                  <th className="px-4 py-2.5 font-semibold">File</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Lines</th>
                  <th className="px-4 py-2.5 font-semibold">Needs review</th>
                  <th className="px-4 py-2.5 font-semibold">Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {counts.data.map((count) => (
                  <CountLineRow key={count.id} count={count} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

const STATUS_STYLES: Record<CountRow["status"], string> = {
  extracting: "bg-akira-blue/10 text-akira-blue",
  review: "bg-akira-amber/15 text-akira-amber-ink",
  confirmed: "bg-akira-green/10 text-akira-green",
  failed: "bg-akira-red/10 text-akira-red",
};

const STATUS_LABELS: Record<CountRow["status"], string> = {
  extracting: "Reading the sheet…",
  review: "Awaiting review",
  confirmed: "Confirmed",
  failed: "Extraction failed",
};

function CountLineRow({ count }: { count: CountRow }) {
  return (
    <tr
      className="cursor-pointer border-b border-akira-ink/5 last:border-0 hover:bg-akira-ink/[0.02]"
      onClick={() => navigate(`/app/inventory/counts/${count.id}`)}
    >
      <td className="px-4 py-2.5 font-medium">
        {formatBusinessDate(count.business_date)}
        {count.counted_at_label && (
          <span className="ml-2 text-xs text-akira-ink/45">{count.counted_at_label}</span>
        )}
      </td>
      <td className="max-w-[220px] truncate px-4 py-2.5 text-akira-ink/60">
        {count.original_filename}
      </td>
      <td className="px-4 py-2.5">
        <span
          className={cn(
            "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold",
            STATUS_STYLES[count.status],
          )}
        >
          {STATUS_LABELS[count.status]}
        </span>
      </td>
      <td className="px-4 py-2.5 tabular-nums">{count.line_count}</td>
      <td className="px-4 py-2.5 tabular-nums">
        {count.needs_review > 0 ? (
          <span className="font-semibold text-akira-amber-ink">{count.needs_review}</span>
        ) : (
          <span className="text-akira-ink/40">0</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-akira-ink/60">{count.confirmed_by_name ?? "—"}</td>
    </tr>
  );
}
