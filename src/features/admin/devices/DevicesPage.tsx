import { useState } from "react";

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
import {
  useCreateTablet,
  useDevices,
  useOutlets,
  useRevokeDevice,
  useUpdateDevice,
  type Device,
  type TabletCredentials,
} from "../api";

export function DevicesPage() {
  const { data: devices, isPending, isError, refetch } = useDevices();
  const isOwner = useHasRole("owner");
  const [revoking, setRevoking] = useState<Device | null>(null);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<TabletCredentials | null>(null);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shared tablets</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            Each tablet holds one outlet-bound session. Staff identify with their PIN, so work is
            always attributed to a person.
          </p>
        </div>
        {isOwner && <Button onClick={() => setCreating(true)}>Add a tablet</Button>}
      </div>

      {credentials && (
        <CredentialsPanel credentials={credentials} onDismiss={() => setCredentials(null)} />
      )}

      <div className="mt-6">
        {isPending && <TableSkeleton rows={3} />}
        {isError && (
          <EmptyState
            title="Could not load tablets"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {devices && devices.length === 0 && (
          <EmptyState
            title="No tablets yet"
            hint="A tablet holds one outlet-bound login. Add one here and sign the device in with the credentials it gives you."
            action={
              isOwner ? <Button onClick={() => setCreating(true)}>Add a tablet</Button> : undefined
            }
          />
        )}
        {devices && devices.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Label</th>
                  <th className="px-4 py-2.5 font-semibold">Outlet</th>
                  <th className="px-4 py-2.5 font-semibold">Last seen</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  {isOwner && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="border-b border-akira-ink/5 last:border-0">
                    <td className="px-4 py-3 font-medium">{device.label}</td>
                    <td className="px-4 py-3">
                      {device.outlet_name}{" "}
                      <span className="font-mono text-xs text-akira-ink/45">
                        {device.outlet_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-akira-ink/60">
                      {device.last_seen_at
                        ? new Date(device.last_seen_at).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot active={device.is_active} />
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="danger" onClick={() => setRevoking(device)}>
                          Revoke
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

      <RevokeDialog device={revoking} onClose={() => setRevoking(null)} />
      <CreateTabletDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(c) => {
          setCreating(false);
          setCredentials(c);
        }}
      />
    </main>
  );
}

/**
 * The credentials, once. Deliberately loud and deliberately not dismissible by
 * accident: a tablet has no mailbox, so nobody can reset this password. If it
 * is lost the only route back is a new tablet.
 */
function CredentialsPanel({
  credentials,
  onDismiss,
}: {
  credentials: TabletCredentials;
  onDismiss: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <section className="mt-6 rounded-lg border border-akira-blue/30 bg-akira-blue/5 p-4">
      <h2 className="text-sm font-semibold">
        {credentials.device.label} is ready — sign the tablet in now
      </h2>
      <p className="mt-1 text-sm text-akira-ink/70">{credentials.detail}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-[7rem_1fr]">
        <dt className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">Email</dt>
        <dd className="break-all font-mono text-sm">{credentials.email}</dd>
        <dt className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
          Password
        </dt>
        <dd className="break-all font-mono text-sm">{credentials.password}</dd>
      </dl>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="h-4 w-4"
        />
        I have signed the tablet in, or written these down
      </label>
      <div className="mt-3">
        <Button disabled={!confirmed} onClick={onDismiss}>
          Hide these
        </Button>
      </div>
    </section>
  );
}

function CreateTabletDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (credentials: TabletCredentials) => void;
}) {
  const { data: outlets } = useOutlets();
  const create = useCreateTablet();
  const [label, setLabel] = useState("");
  const [outletId, setOutletId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setLabel("");
    setOutletId("");
    setError(null);
    onClose();
  }

  const chosen = outletId || outlets?.[0]?.id || "";

  return (
    <Dialog open={open} onClose={close} title="Add a tablet">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-akira-ink/70">
          This creates the tablet's own login as well. You will see the password once, on the next
          screen — there is no way to look it up later.
        </p>
        <Field label="Which outlet">
          <select
            value={chosen}
            onChange={(e) => setOutletId(e.target.value)}
            className="h-11 w-full rounded-md border border-akira-ink/15 bg-white px-3 text-[15px]"
          >
            {(outlets ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="What to call it">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Kitchen pass tablet"
            autoComplete="off"
          />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!label.trim() || !chosen || create.isPending}
            onClick={() => {
              setError(null);
              create.mutate(
                { outlet_id: chosen, label: label.trim() },
                {
                  onSuccess: (c) => {
                    setLabel("");
                    setOutletId("");
                    onCreated(c);
                  },
                  onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                },
              );
            }}
          >
            {create.isPending ? "Creating…" : "Create tablet"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RevokeDialog({ device, onClose }: { device: Device | null; onClose: () => void }) {
  const revoke = useRevokeDevice();
  const update = useUpdateDevice();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setConfirmation("");
    setError(null);
    onClose();
  }

  function onError(e: Error) {
    setError(e instanceof ApiError ? e.problem.detail : e.message);
  }

  return (
    <Dialog open={device !== null} onClose={close} title="Revoke this tablet?">
      {device && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-akira-ink/70">
            <strong>{device.label}</strong> will immediately lose access to {device.outlet_name}.
            Runs it already recorded are kept. Use this the moment a tablet goes missing.
          </p>
          <p className="text-sm text-akira-ink/70">
            If the tablet is just misplaced, suspend it instead — suspension is reversible.
          </p>
          <Field label="Type REVOKE to confirm permanent revocation">
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="REVOKE"
              autoComplete="off"
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-between gap-2">
            <Button
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { id: device.id, is_active: !device.is_active },
                  { onSuccess: close, onError },
                )
              }
            >
              {device.is_active ? "Suspend instead" : "Reactivate"}
            </Button>
            <div className="flex gap-2">
              <Button onClick={close}>Cancel</Button>
              <Button
                variant="danger"
                disabled={confirmation !== "REVOKE" || revoke.isPending}
                onClick={() => revoke.mutate(device.id, { onSuccess: close, onError })}
              >
                {revoke.isPending ? "Revoking…" : "Revoke permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
