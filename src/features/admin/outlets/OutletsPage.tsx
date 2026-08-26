import { useState, type FormEvent } from "react";

import {
  Button,
  Dialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  StatusDot,
  TableSkeleton,
} from "@/components/ui/primitives";
import { useHasRole } from "@/components/RoleGate";
import { ApiError } from "@/lib/api";
import { useCreateOutlet, useDeleteOutlet, useOutlets, useUpdateOutlet, type Outlet } from "../api";

export function OutletsPage() {
  const { data: outlets, isPending, isError, refetch } = useOutlets(true);
  const isOwner = useHasRole("owner");
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState<Outlet | null>(null);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Outlets</h1>
          <p className="mt-1 text-sm text-akira-ink/55">Every location the network operates.</p>
        </div>
        {isOwner ? (
          <Button variant="primary" onClick={() => setCreating(true)}>
            New outlet
          </Button>
        ) : (
          <p className="text-xs text-akira-ink/45" title="Creating outlets is limited to owners.">
            Owner-only actions hidden
          </p>
        )}
      </div>

      <div className="mt-6">
        {isPending && <TableSkeleton />}
        {isError && (
          <EmptyState
            title="Could not load outlets"
            hint="The API did not respond. Check that the backend is running."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {outlets && outlets.length === 0 && (
          <EmptyState
            title="No outlets yet"
            hint="Create the first outlet to start assigning people and checklists."
          />
        )}
        {outlets && outlets.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Code</th>
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">City</th>
                  <th className="px-4 py-2.5 font-semibold">Members</th>
                  <th className="px-4 py-2.5 font-semibold">Tablets</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  {isOwner && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {outlets.map((outlet) => (
                  <tr
                    key={outlet.id}
                    className="border-b border-akira-ink/5 last:border-0 hover:bg-akira-ink/[0.02]"
                  >
                    <td className="px-4 py-3 font-mono text-xs">{outlet.code}</td>
                    <td className="px-4 py-3 font-medium">{outlet.name}</td>
                    <td className="px-4 py-3 text-akira-ink/60">{outlet.city ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{outlet.member_count}</td>
                    <td className="px-4 py-3 tabular-nums">{outlet.device_count}</td>
                    <td className="px-4 py-3">
                      <StatusDot active={outlet.is_active} />
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" onClick={() => setEditing(outlet)}>
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => setClosing(outlet)}>
                          Close
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateOutletDialog open={creating} onClose={() => setCreating(false)} />
      <EditOutletDialog outlet={editing} onClose={() => setEditing(null)} />
      <CloseOutletDialog outlet={closing} onClose={() => setClosing(null)} />
    </main>
  );
}

/** Read a text field from a form. Files are not valid here by construction. */
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function CreateOutletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateOutlet();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    create.mutate(
      {
        code: field(data, "code").toUpperCase(),
        name: field(data, "name"),
        city: field(data, "city") || null,
        geo_lat: field(data, "geo_lat") ? Number(field(data, "geo_lat")) : null,
        geo_lng: field(data, "geo_lng") ? Number(field(data, "geo_lng")) : null,
        geofence_radius_m: Number(field(data, "geofence_radius_m")) || 150,
        timezone: "Asia/Kolkata",
      },
      {
        onSuccess: onClose,
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="New outlet">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Code">
          <Input
            name="code"
            required
            placeholder="AKR-SL03"
            pattern="[A-Za-z0-9][A-Za-z0-9-]*"
            title="Letters, digits and hyphens"
          />
        </Field>
        <Field label="Name">
          <Input name="name" required placeholder="AKIRA Salt Lake" />
        </Field>
        <Field label="City">
          <Input name="city" placeholder="Kolkata" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Latitude">
            <Input name="geo_lat" type="number" step="any" placeholder="22.58" />
          </Field>
          <Field label="Longitude">
            <Input name="geo_lng" type="number" step="any" placeholder="88.41" />
          </Field>
          <Field label="Geofence (m)">
            <Input name="geofence_radius_m" type="number" defaultValue={150} min={1} />
          </Field>
        </div>
        <p className="text-xs text-akira-ink/50">
          The code is permanent — it appears in exports and printed sheets, so it cannot be renamed
          later.
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create outlet"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditOutletDialog({ outlet, onClose }: { outlet: Outlet | null; onClose: () => void }) {
  const update = useUpdateOutlet();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outlet) return;
    setError(null);
    const data = new FormData(event.currentTarget);
    update.mutate(
      {
        id: outlet.id,
        name: field(data, "name"),
        city: field(data, "city") || null,
        geofence_radius_m: Number(field(data, "geofence_radius_m")) || null,
        is_active: data.get("is_active") === "on",
      },
      {
        onSuccess: onClose,
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <Dialog open={outlet !== null} onClose={onClose} title={`Edit ${outlet?.code ?? ""}`}>
      {outlet && (
        <form onSubmit={submit} className="flex flex-col gap-4" key={outlet.id}>
          <Field label="Name">
            <Input name="name" required defaultValue={outlet.name} />
          </Field>
          <Field label="City">
            <Input name="city" defaultValue={outlet.city ?? ""} />
          </Field>
          <Field label="Geofence radius (m)">
            <Input
              name="geofence_radius_m"
              type="number"
              min={1}
              defaultValue={outlet.geofence_radius_m}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={outlet.is_active}
              className="h-4 w-4 accent-akira-red"
            />
            Outlet is active
          </label>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function CloseOutletDialog({ outlet, onClose }: { outlet: Outlet | null; onClose: () => void }) {
  const remove = useDeleteOutlet();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setConfirmation("");
    setError(null);
    onClose();
  }

  return (
    <Dialog open={outlet !== null} onClose={close} title={`Close ${outlet?.name ?? ""}`}>
      {outlet && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-akira-ink/70">
            Closing an outlet hides it everywhere but keeps its history. This is refused while any
            checklist run is still open.
          </p>
          <Field label={`Type ${outlet.code} to confirm`}>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={outlet.code}
              autoComplete="off"
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="danger"
              disabled={confirmation !== outlet.code || remove.isPending}
              onClick={() =>
                remove.mutate(outlet.id, {
                  onSuccess: close,
                  onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                })
              }
            >
              {remove.isPending ? "Closing…" : "Close outlet"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
