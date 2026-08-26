import { useMemo, useRef, useState } from "react";

import { Button, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useOutlets } from "@/features/admin/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  coverage,
  useReferencePhotos,
  useRetireReferencePhoto,
  useSetReferencePhoto,
  type ReferencePhoto,
} from "./api";

/**
 * Capturing each outlet's photographic standard.
 *
 * This screen exists because the AI reviewer has nothing to compare against
 * until somebody walks New Town with a tablet and photographs every station as
 * it should look. That is a physical job, so the screen is built around it:
 * grouped by checklist the way the walk goes, showing what is still missing,
 * and capturing straight from the camera rather than asking for an upload.
 */
export function ReferencePhotosPage() {
  const { me } = useAuth();
  const { data: outlets, isPending: outletsPending } = useOutlets();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to the outlet this person actually works at. Owners and ops
  // managers see every outlet including the dev ones, and landing them on
  // whichever sorts first is how somebody ends up photographing standards for
  // a test outlet.
  const myOutlet =
    me?.outlets.find((o) => o.is_primary)?.outlet_id ?? me?.outlets[0]?.outlet_id ?? null;
  const activeOutlet =
    outletId ??
    (myOutlet && outlets?.some((o) => o.id === myOutlet) ? myOutlet : null) ??
    outlets?.[0]?.id ??
    null;
  const { data: rows, isPending, isError, refetch } = useReferencePhotos(activeOutlet);

  const groups = useMemo(() => {
    const visible = (rows ?? []).filter((r) => !onlyMissing || !r.photo_path);
    const byTemplate = new Map<string, ReferencePhoto[]>();
    for (const row of visible) {
      const list = byTemplate.get(row.template_name) ?? [];
      list.push(row);
      byTemplate.set(row.template_name, list);
    }
    return [...byTemplate.entries()];
  }, [rows, onlyMissing]);

  const { captured, total, pct } = coverage(rows);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Reference standards</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        One photograph per item per outlet, showing what &ldquo;done&rdquo; looks like here. Shoot
        them under normal service lighting — a standard captured in an empty, brightly lit room sets
        a bar the evening shift can never match. The automated reviewer compares submitted photos
        against these; managers read them too.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <select
          value={activeOutlet ?? ""}
          onChange={(e) => setOutletId(e.target.value)}
          disabled={outletsPending}
          className="h-9 rounded-md border border-akira-ink/15 bg-white px-3 text-sm outline-none focus-visible:border-akira-blue"
        >
          {outlets?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code} — {o.name}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-akira-ink/70">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
            className="h-4 w-4 accent-akira-blue"
          />
          Only what is still missing
        </label>

        {total > 0 && (
          <span className="ml-auto flex items-center gap-2 text-sm">
            <span className="text-akira-ink/50">Captured</span>
            <span className="font-semibold tabular-nums">
              {captured}/{total}
            </span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-akira-ink/10">
              <span
                style={{ width: `${pct}%` }}
                className={cn(
                  "block h-full rounded-full",
                  pct === 100 ? "bg-health-green" : pct >= 50 ? "bg-health-amber" : "bg-akira-red",
                )}
              />
            </span>
          </span>
        )}
      </div>

      <ErrorNote>{error}</ErrorNote>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={6} />}
        {isError && (
          <EmptyState
            title="Could not load the standards"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {rows && rows.length === 0 && (
          <EmptyState
            title="No items take a photo yet"
            hint="Mark a checklist item as requiring a photo in the SOP template builder, and it will appear here waiting for its standard."
          />
        )}
        {rows && rows.length > 0 && groups.length === 0 && (
          <EmptyState
            title="Every item has a standard"
            hint="Nothing is missing at this outlet. Clear the filter to review what has been captured."
            action={<Button onClick={() => setOnlyMissing(false)}>Show all</Button>}
          />
        )}

        {groups.map(([templateName, items]) => (
          <section key={templateName} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
              {templateName}
            </h2>
            <div className="overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
              {items.map((item) => (
                <ReferenceRow
                  key={item.template_item_id}
                  item={item}
                  outletId={activeOutlet!}
                  onError={setError}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function ReferenceRow({
  item,
  outletId,
  onError,
}: {
  item: ReferencePhoto;
  outletId: string;
  onError: (message: string | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const setPhoto = useSetReferencePhoto(outletId);
  const retire = useRetireReferencePhoto();
  const [preview, setPreview] = useState<string | null>(null);

  const busy = setPhoto.isPending || retire.isPending;
  // Standards are shot in the room, not in an empty one. The threshold is the
  // same one that flags a submitted photo as too dark.
  const dark = item.luminance_mean !== null && item.luminance_mean < 40;

  function capture(file: File | undefined) {
    if (!file) return;
    onError(null);
    setPhoto.mutate(
      { templateItemId: item.template_item_id, file },
      {
        onError: (e) => onError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <div className="flex items-start gap-3 border-b border-akira-ink/5 px-4 py-3 last:border-0">
      <button
        onClick={() => item.photo_view_url && setPreview(item.photo_view_url)}
        disabled={!item.photo_view_url}
        className={cn(
          "h-16 w-16 shrink-0 overflow-hidden rounded-md border",
          item.photo_view_url
            ? "border-akira-ink/10"
            : "border-dashed border-akira-ink/20 bg-akira-ink/[0.02]",
        )}
      >
        {item.photo_view_url ? (
          <img
            src={item.photo_view_url}
            alt={`Standard for ${item.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-wider text-akira-ink/35">
            not set
          </span>
        )}
      </button>

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
        {item.instruction && <p className="mt-0.5 text-xs text-akira-ink/50">{item.instruction}</p>}
        {item.photo_path ? (
          <p className="mt-1 text-xs text-akira-ink/45">
            Captured {item.captured_at ? new Date(item.captured_at).toLocaleDateString() : "—"}
            {item.captured_by_name ? ` by ${item.captured_by_name}` : ""}
            {item.luminance_mean !== null && (
              <span className={cn("ml-2", dark && "font-semibold text-akira-red")}>
                {"· "}
                brightness {Math.round(item.luminance_mean)}
                {dark && " — too dark to be a fair standard"}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[#8a6414]">
            No standard yet. Submitted photos for this item are judged on the instruction alone.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            capture(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button
          variant={item.photo_path ? "default" : "primary"}
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {setPhoto.isPending ? "Uploading…" : item.photo_path ? "Replace" : "Capture"}
        </Button>
        {item.id && (
          <Button
            variant="ghost"
            disabled={busy}
            title="Retire this standard. Past verdicts keep pointing at it."
            onClick={() =>
              retire.mutate(item.id!, {
                onError: (e) => onError(e instanceof ApiError ? e.problem.detail : e.message),
              })
            }
          >
            Retire
          </Button>
        )}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-akira-ink/70 p-8"
        >
          <img
            src={preview}
            alt={`Standard for ${item.title}`}
            className="max-h-full max-w-3xl rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}
