import { useMemo, useState, type FormEvent } from "react";

import {
  Button,
  Dialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  RoleBadge,
  StatusDot,
  TableSkeleton,
} from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS } from "@/features/auth/types";
import { ApiError } from "@/lib/api";
import {
  useGrantableRoles,
  useInviteUser,
  useOutlets,
  useSetUserPin,
  useSetUserRole,
  useUpdateUser,
  useUsers,
  type UserItem,
  type UserRole,
} from "../api";

export function UsersPage() {
  const [search, setSearch] = useState("");
  const { data: users, isPending, isError, refetch } = useUsers();
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<UserItem | null>(null);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) || (u.employee_code ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            Everyone you can administer, across your outlets.
          </p>
        </div>
        <Button variant="primary" onClick={() => setInviting(true)}>
          Invite someone
        </Button>
      </div>

      <div className="mt-5 max-w-xs">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or employee code"
          aria-label="Search people"
        />
      </div>

      <div className="mt-4">
        {isPending && <TableSkeleton rows={6} />}
        {isError && (
          <EmptyState
            title="Could not load people"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {users && filtered.length === 0 && (
          <EmptyState
            title={search ? "Nobody matches" : "No people yet"}
            hint={
              search
                ? "Try a different name or employee code."
                : "Invite the first person to get started."
            }
          />
        )}
        {filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 font-semibold">Outlets</th>
                  <th className="px-4 py-2.5 font-semibold">PIN</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((person) => (
                  <tr
                    key={person.profile_id}
                    className="border-b border-akira-ink/5 last:border-0 hover:bg-akira-ink/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{person.full_name}</p>
                      {person.employee_code && (
                        <p className="font-mono text-xs text-akira-ink/45">
                          {person.employee_code}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge
                        role={person.global_role}
                        label={ROLE_LABELS[person.global_role]}
                      />
                    </td>
                    <td className="px-4 py-3 text-akira-ink/60">
                      {person.outlets.map((o) => o.code).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-akira-ink/60">
                      {person.has_pin ? "Set" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot active={person.is_active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" onClick={() => setSelected(person)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
      <ManageDialog person={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

/** Read a text field from a form. Files are not valid here by construction. */
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteUser();
  const { data: grantable } = useGrantableRoles();
  const { data: outlets } = useOutlets();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const outletIds = (outlets ?? [])
      .filter((o) => data.get(`outlet-${o.id}`) === "on")
      .map((o) => o.id);
    if (outletIds.length === 0) {
      setError("Pick at least one outlet.");
      return;
    }
    invite.mutate(
      {
        email: field(data, "email"),
        full_name: field(data, "full_name"),
        global_role: field(data, "role") as UserRole,
        outlet_ids: outletIds,
        employee_code: field(data, "employee_code") || null,
      },
      {
        onSuccess: (result) => {
          setNotice(result.detail);
        },
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  function close() {
    setError(null);
    setNotice(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} title="Invite someone">
      {notice ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-akira-ink/70">{notice}</p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input name="email" type="email" required placeholder="name@example.com" />
          </Field>
          <Field label="Full name">
            <Input name="full_name" required />
          </Field>
          <Field label="Employee code">
            <Input name="employee_code" placeholder="AK-010" />
          </Field>
          <Field label="Role">
            <div className="flex flex-col gap-1.5">
              {(grantable?.all_roles ?? []).map((role) => {
                const allowed = grantable?.grantable.includes(role) ?? false;
                const reason = grantable?.reasons[role];
                return (
                  <label
                    key={role}
                    title={allowed ? undefined : reason}
                    className={
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm " +
                      (allowed
                        ? "cursor-pointer border-akira-ink/15 hover:bg-akira-ink/[0.03]"
                        : "cursor-not-allowed border-akira-ink/8 text-akira-ink/35")
                    }
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      disabled={!allowed}
                      required
                      className="accent-akira-red"
                    />
                    <span className="flex-1">{ROLE_LABELS[role]}</span>
                    {!allowed && (
                      <span className="text-[10px] uppercase tracking-wide">not allowed</span>
                    )}
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Outlets">
            <div className="flex flex-col gap-1.5">
              {(outlets ?? []).map((outlet) => (
                <label
                  key={outlet.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-akira-ink/15 px-3 py-2 text-sm hover:bg-akira-ink/[0.03]"
                >
                  <input
                    type="checkbox"
                    name={`outlet-${outlet.id}`}
                    className="h-4 w-4 accent-akira-red"
                  />
                  {outlet.name}
                  <span className="font-mono text-xs text-akira-ink/45">{outlet.code}</span>
                </label>
              ))}
            </div>
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={invite.isPending}>
              {invite.isPending ? "Inviting…" : "Send invitation"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function ManageDialog({ person, onClose }: { person: UserItem | null; onClose: () => void }) {
  const { me } = useAuth();
  const update = useUpdateUser();
  const setRole = useSetUserRole();
  const setPin = useSetUserPin();
  const { data: grantable } = useGrantableRoles();
  const [error, setError] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState("");

  const isSelf = me?.profile_id === person?.profile_id;
  const isFloorRole = person?.global_role === "staff" || person?.global_role === "shift_lead";

  function close() {
    setError(null);
    setPinValue("");
    onClose();
  }

  function onError(e: Error) {
    setError(e instanceof ApiError ? e.problem.detail : e.message);
  }

  return (
    <Dialog open={person !== null} onClose={close} title={person?.full_name ?? ""}>
      {person && (
        <div className="flex flex-col gap-5" key={person.profile_id}>
          <section className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">Role</p>
            <div className="flex flex-wrap gap-1.5">
              {(grantable?.all_roles ?? []).map((role) => {
                const allowed = grantable?.grantable.includes(role) ?? false;
                const current = role === person.global_role;
                return (
                  <button
                    key={role}
                    disabled={!allowed || current || setRole.isPending}
                    title={current ? "Current role" : grantable?.reasons[role]}
                    onClick={() =>
                      setRole.mutate(
                        { id: person.profile_id, role },
                        { onError, onSuccess: () => setError(null) },
                      )
                    }
                    className={
                      "rounded-md border px-2.5 py-1.5 text-xs font-semibold " +
                      (current
                        ? "border-akira-ink bg-akira-ink text-white"
                        : allowed
                          ? "border-akira-ink/15 hover:bg-akira-ink/5"
                          : "cursor-not-allowed border-akira-ink/8 text-akira-ink/30")
                    }
                  >
                    {ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
          </section>

          {isFloorRole && (
            <section className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
                Shared-tablet PIN {person.has_pin && "(currently set)"}
              </p>
              <div className="flex gap-2">
                <Input
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                  placeholder="4–8 digits"
                  maxLength={8}
                  inputMode="numeric"
                  aria-label="New PIN"
                />
                <Button
                  disabled={pinValue.length < 4 || setPin.isPending}
                  onClick={() =>
                    setPin.mutate(
                      { id: person.profile_id, pin: pinValue },
                      {
                        onError,
                        onSuccess: () => {
                          setPinValue("");
                          setError(null);
                        },
                      },
                    )
                  }
                >
                  Set PIN
                </Button>
                {person.has_pin && (
                  <Button
                    variant="danger"
                    disabled={setPin.isPending}
                    onClick={() =>
                      setPin.mutate(
                        { id: person.profile_id, pin: null },
                        { onError, onSuccess: () => setError(null) },
                      )
                    }
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-akira-ink/50">
                A PIN identifies this person on the shared tablet. It can never approve a checklist.
              </p>
            </section>
          )}

          <section className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
              Account
            </p>
            <Button
              variant={person.is_active ? "danger" : "default"}
              disabled={update.isPending || (isSelf && person.is_active)}
              title={
                isSelf && person.is_active ? "You cannot deactivate your own account." : undefined
              }
              onClick={() =>
                update.mutate(
                  { id: person.profile_id, is_active: !person.is_active },
                  { onError, onSuccess: () => setError(null) },
                )
              }
            >
              {person.is_active ? "Deactivate account" : "Reactivate account"}
            </Button>
          </section>

          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
