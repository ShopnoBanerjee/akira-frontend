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
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import {
  useCreateInventoryItem,
  useInventoryDepartments,
  useInventoryItems,
  useRetireInventoryItem,
  useSetItemLevel,
  useUpdateInventoryItem,
  type InventoryItem,
} from "../api";

const UNITS = [
  "piece",
  "gram",
  "kilogram",
  "millilitre",
  "litre",
  "roll",
  "packet",
  "box",
  "bottle",
  "jug",
] as const;

/** Read a text field from a form. Files are not valid here by construction. */
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function InventoryPage() {
  const [departmentId, setDepartmentId] = useState<string>("");
  const [search, setSearch] = useState("");
  const { data: departments } = useInventoryDepartments();
  const filters = {
    ...(departmentId ? { departmentId } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const { data: items, isPending, isError, refetch } = useInventoryItems(filters);
  const isAdmin = useHasRole("owner", "ops_manager");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            The shared catalogue. Add an item once; each outlet sets its own par level.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            Add item
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          aria-label="Filter by department"
          className="h-9 rounded-md border border-akira-ink/15 bg-white px-3 text-sm outline-none focus-visible:border-akira-blue"
        >
          <option value="">All departments</option>
          {(departments ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} ({d.item_count})
            </option>
          ))}
        </select>
        <div className="w-64">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search English or Bengali"
            aria-label="Search items"
          />
        </div>
      </div>

      <div className="mt-4">
        {isPending && <TableSkeleton rows={8} />}
        {isError && (
          <EmptyState
            title="Could not load the catalogue"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {items && items.length === 0 && (
          <EmptyState title="Nothing matches" hint="Try a different department or search term." />
        )}
        {items && items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Item</th>
                  <th className="px-4 py-2.5 font-semibold">Department</th>
                  <th className="px-4 py-2.5 font-semibold">Unit</th>
                  <th className="px-4 py-2.5 font-semibold">Par levels</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-akira-ink/5 last:border-0 hover:bg-akira-ink/[0.02]"
                  >
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{item.name}</p>
                      {item.name_bn && <p className="text-xs text-akira-ink/55">{item.name_bn}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-akira-ink/60">{item.department_label}</td>
                    <td className="px-4 py-2.5 text-akira-ink/60">{item.unit}</td>
                    <td className="px-4 py-2.5 tabular-nums text-akira-ink/70">
                      {item.levels.length
                        ? item.levels
                            .map((l) => `${l.outlet_code}: ${l.par_level ?? "—"}`)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button variant="ghost" onClick={() => setSelected(item)}>
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

      <CreateItemDialog open={creating} onClose={() => setCreating(false)} />
      <ManageItemDialog item={selected} onClose={() => setSelected(null)} />
    </main>
  );
}

function CreateItemDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateInventoryItem();
  const { data: departments } = useInventoryDepartments();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    create.mutate(
      {
        name: field(data, "name"),
        name_bn: field(data, "name_bn") || null,
        department_id: field(data, "department_id"),
        unit: field(data, "unit") as (typeof UNITS)[number],
        notes: field(data, "notes") || null,
      },
      {
        onSuccess: onClose,
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add a catalogue item">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name (English)">
          <Input name="name" required placeholder="Shichimi Togarashi" />
        </Field>
        <Field label="Name (Bengali)">
          <Input name="name_bn" placeholder="শিচিমি তোগারাশি" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department">
            <select
              name="department_id"
              required
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-3 text-sm"
            >
              {(departments ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unit">
            <select
              name="unit"
              required
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-3 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <Input name="notes" placeholder="Optional" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add item"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ManageItemDialog({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const { me } = useAuth();
  const isAdmin = useHasRole("owner", "ops_manager");
  const update = useUpdateInventoryItem();
  const retire = useRetireInventoryItem();
  const setLevel = useSetItemLevel();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setError(null);
    onClose();
  }

  function onError(e: Error) {
    setError(e instanceof ApiError ? e.problem.detail : e.message);
  }

  function saveLevel(outletId: string, form: HTMLFormElement) {
    if (!item) return;
    const data = new FormData(form);
    const par = field(data, "par_level");
    setLevel.mutate(
      {
        itemId: item.id,
        outletId,
        par_level: par ? Number(par) : null,
        is_stocked: data.get("is_stocked") === "on",
      },
      { onError, onSuccess: () => setError(null) },
    );
  }

  // Levels are edited per outlet the caller can see. An outlet without a row
  // yet still gets an editor, defaulting to stocked with no par.
  const editableOutlets =
    me?.outlets.map((o) => {
      const existing = item?.levels.find((l) => l.outlet_id === o.outlet_id);
      return {
        outletId: o.outlet_id,
        code: o.code,
        par: existing?.par_level ?? null,
        stocked: existing?.is_stocked ?? true,
      };
    }) ?? [];

  return (
    <Dialog open={item !== null} onClose={close} title={item?.name ?? ""}>
      {item && (
        <div className="flex flex-col gap-5" key={item.id}>
          {item.name_bn && <p className="text-sm text-akira-ink/60">{item.name_bn}</p>}
          {item.notes && (
            <p className="rounded-md bg-akira-ink/[0.04] px-3 py-2 text-xs text-akira-ink/60">
              {item.notes}
            </p>
          )}

          <section className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55">
              Par levels ({item.unit})
            </p>
            {editableOutlets.map((o) => (
              <form
                key={o.outletId}
                onSubmit={(e) => {
                  e.preventDefault();
                  saveLevel(o.outletId, e.currentTarget);
                }}
                className="flex items-center gap-2"
              >
                <span className="w-24 font-mono text-xs text-akira-ink/60">{o.code}</span>
                <Input
                  name="par_level"
                  type="number"
                  step="any"
                  min={0}
                  defaultValue={o.par ?? ""}
                  placeholder="No par"
                  aria-label={`Par level for ${o.code}`}
                  className="w-28"
                />
                <label className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    name="is_stocked"
                    defaultChecked={o.stocked}
                    className="h-4 w-4 accent-akira-red"
                  />
                  Stocked
                </label>
                <Button type="submit" disabled={setLevel.isPending}>
                  Save
                </Button>
              </form>
            ))}
            {editableOutlets.length === 0 && (
              <p className="text-xs text-akira-ink/50">
                You are not assigned to an outlet, so there are no levels to edit.
              </p>
            )}
          </section>

          {isAdmin && (
            <section className="flex items-center justify-between border-t border-akira-ink/10 pt-4">
              <StatusDot active={item.is_active} />
              <div className="flex gap-2">
                <Button
                  disabled={update.isPending}
                  onClick={() =>
                    update.mutate(
                      { id: item.id, is_active: !item.is_active },
                      { onError, onSuccess: () => setError(null) },
                    )
                  }
                >
                  {item.is_active ? "Deactivate" : "Reactivate"}
                </Button>
                <Button
                  variant="danger"
                  disabled={retire.isPending}
                  onClick={() => retire.mutate(item.id, { onSuccess: close, onError })}
                >
                  Retire item
                </Button>
              </div>
            </section>
          )}

          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
