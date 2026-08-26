import { useState, type FormEvent } from "react";

import {
  Button,
  Dialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  TableSkeleton,
} from "@/components/ui/primitives";
import { useHasRole } from "@/components/RoleGate";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { navigate } from "@/app/navigate";
import {
  useAddItem,
  useDeleteItem,
  useDuplicateTemplate,
  useReorderItems,
  useTemplate,
  useUpdateItem,
  useUpdateTemplate,
  type TemplateItem,
} from "./api";

export function TemplateBuilderPage({ templateId }: { templateId: string }) {
  const { data: template, isPending, isError, refetch } = useTemplate(templateId);
  const isAdmin = useHasRole("owner", "ops_manager");
  const updateTemplate = useUpdateTemplate();
  const duplicate = useDuplicateTemplate();
  const reorder = useReorderItems();
  const [editingItem, setEditingItem] = useState<TemplateItem | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <TableSkeleton rows={6} />
      </main>
    );
  }
  if (isError || !template) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <EmptyState
          title="Could not load this template"
          hint="It may have been removed, or the API did not respond."
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      </main>
    );
  }

  function onError(e: Error) {
    setError(e instanceof ApiError ? e.problem.detail : e.message);
  }

  function move(index: number, direction: -1 | 1) {
    if (!template) return;
    const ids = template.items.map((i) => i.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    const moved = next[index];
    const displaced = next[target];
    if (moved === undefined || displaced === undefined) return;
    next[target] = moved;
    next[index] = displaced;
    reorder.mutate(
      { templateId: template.id, itemIds: next },
      { onError, onSuccess: () => setError(null) },
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <button
        onClick={() => navigate("/app/sop/templates")}
        className="text-xs font-semibold text-akira-blue hover:underline"
      >
        ← All templates
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
            <span className="rounded bg-akira-ink/[0.06] px-2 py-0.5 font-mono text-xs">
              v{template.version}
            </span>
            {!template.is_active && (
              <span className="rounded bg-akira-ink/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-akira-ink/50">
                inactive
              </span>
            )}
          </div>
          {template.name_bn && (
            <p className="mt-0.5 text-sm text-akira-ink/55">{template.name_bn}</p>
          )}
          <p className="mt-1 text-xs text-akira-ink/50">
            {template.category_label} · {template.frequency.replace("_", " ")} · {template.day_part}
            {template.assignment_count > 0 &&
              ` · assigned to ${template.assignment_count} outlet${
                template.assignment_count === 1 ? "" : "s"
              }`}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() =>
                updateTemplate.mutate(
                  { id: template.id, is_active: !template.is_active },
                  { onError, onSuccess: () => setError(null) },
                )
              }
            >
              {template.is_active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              onClick={() =>
                duplicate.mutate(template.id, {
                  onSuccess: (copy) => navigate(`/app/sop/templates/${copy.id}`),
                  onError,
                })
              }
            >
              Duplicate
            </Button>
            <Button variant="primary" onClick={() => setEditingItem("new")}>
              Add item
            </Button>
          </div>
        )}
      </div>

      {template.warnings.map((warning) => (
        <p
          key={warning}
          className="mt-4 rounded-md border border-health-amber/40 bg-health-amber/10 px-3 py-2 text-sm text-[#8a6414]"
        >
          {warning}
        </p>
      ))}
      <ErrorNote>{error}</ErrorNote>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Item list */}
        <div>
          {template.items.length === 0 ? (
            <EmptyState
              title="No items yet"
              hint="Add the first checklist item. Items are what staff see and tick, one screen at a time."
              action={
                isAdmin && (
                  <Button variant="primary" onClick={() => setEditingItem("new")}>
                    Add the first item
                  </Button>
                )
              }
            />
          ) : (
            <ol className="overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
              {template.items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 border-b border-akira-ink/5 px-3 py-2.5 last:border-0"
                >
                  <span className="w-6 text-center font-mono text-xs text-akira-ink/40">
                    {item.sort_order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.title}
                      {item.is_critical && (
                        <span className="ml-2 rounded bg-akira-red/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-akira-red">
                          critical
                        </span>
                      )}
                    </p>
                    <p className="flex flex-wrap gap-2 text-xs text-akira-ink/50">
                      {item.title_bn && <span>{item.title_bn}</span>}
                      {item.requires_photo && <span>📷 photo</span>}
                      {item.requires_value && (
                        <span>
                          # {item.value_type}
                          {item.value_min != null && ` ≥${item.value_min}`}
                          {item.value_max != null && ` ≤${item.value_max}`}
                          {item.value_unit && ` ${item.value_unit}`}
                        </span>
                      )}
                      {item.allow_na && <span>n/a allowed</span>}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label="Move up"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        label="Move down"
                        disabled={index === template.items.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </IconButton>
                      <Button variant="ghost" onClick={() => setEditingItem(item)}>
                        Edit
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* What staff will see */}
        <aside className="hidden lg:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-akira-ink/50">
            What staff will see
          </p>
          <div className="mt-2 rounded-[1.5rem] border-4 border-akira-ink/80 bg-[#faf9f8] p-3 shadow-lg">
            <div className="rounded-xl bg-white p-3">
              <p className="text-[10px] font-bold tracking-[0.3em] text-akira-red">アキラ</p>
              <p className="mt-1 text-sm font-semibold">{template.name}</p>
              {template.items.slice(0, 1).map((item) => (
                <div key={item.id} className="mt-3">
                  <p className="text-[15px] font-semibold leading-snug">
                    {item.title_bn ?? item.title}
                  </p>
                  {item.title_bn && <p className="text-xs text-akira-ink/55">{item.title}</p>}
                  {(item.instruction_bn ?? item.instruction) ? (
                    <p className="mt-1 text-xs text-akira-ink/60">
                      {item.instruction_bn ?? item.instruction}
                    </p>
                  ) : null}
                  {item.requires_value && (
                    <div className="mt-2 rounded-md border border-akira-ink/15 px-3 py-2 text-xs text-akira-ink/40">
                      {item.value_min != null || item.value_max != null
                        ? `${item.value_min ?? ""}–${item.value_max ?? ""} ${item.value_unit ?? ""}`
                        : "Enter a value"}
                    </div>
                  )}
                  {item.requires_photo && (
                    <div className="mt-2 rounded-md border border-dashed border-akira-blue/40 px-3 py-3 text-center text-xs text-akira-blue">
                      📷 Photo required
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    <div className="rounded-md bg-health-green/15 py-2.5 text-center text-xs font-bold text-health-green">
                      PASS
                    </div>
                    <div className="rounded-md bg-akira-red/10 py-2.5 text-center text-xs font-bold text-akira-red">
                      FAIL
                    </div>
                    <div
                      className={cn(
                        "rounded-md py-2.5 text-center text-xs font-bold",
                        item.allow_na
                          ? "bg-akira-ink/8 text-akira-ink/60"
                          : "bg-akira-ink/[0.03] text-akira-ink/25",
                      )}
                    >
                      N/A
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-akira-ink/40">
                    1 of {template.items.length}
                  </p>
                </div>
              ))}
              {template.items.length === 0 && (
                <p className="mt-4 text-center text-xs text-akira-ink/40">
                  Items appear here as you add them.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ItemDialog
        templateId={template.id}
        item={editingItem}
        onClose={() => setEditingItem(null)}
      />
    </main>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className="rounded p-1.5 text-akira-ink/50 hover:bg-akira-ink/5 hover:text-akira-ink disabled:cursor-not-allowed disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}

/** Read a text field from a form. Files are not valid here by construction. */
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function ItemDialog({
  templateId,
  item,
  onClose,
}: {
  templateId: string;
  item: TemplateItem | "new" | null;
  onClose: () => void;
}) {
  const add = useAddItem();
  const update = useUpdateItem();
  const remove = useDeleteItem();
  const [error, setError] = useState<string | null>(null);
  const [requiresValue, setRequiresValue] = useState(false);

  const isNew = item === "new";
  const existing = item !== "new" ? item : null;
  const busy = add.isPending || update.isPending || remove.isPending;

  function close() {
    setError(null);
    setRequiresValue(false);
    onClose();
  }

  function onError(e: Error) {
    setError(e instanceof ApiError ? e.problem.detail : e.message);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const wantsValue = data.get("requires_value") === "on";
    const body = {
      title: field(data, "title"),
      title_bn: field(data, "title_bn") || null,
      instruction: field(data, "instruction") || null,
      instruction_bn: field(data, "instruction_bn") || null,
      requires_photo: data.get("requires_photo") === "on",
      requires_value: wantsValue,
      value_type: wantsValue ? ((field(data, "value_type") || "number") as never) : null,
      value_min: field(data, "value_min") ? Number(field(data, "value_min")) : null,
      value_max: field(data, "value_max") ? Number(field(data, "value_max")) : null,
      value_unit: field(data, "value_unit") || null,
      is_critical: data.get("is_critical") === "on",
      allow_na: data.get("allow_na") === "on",
    };
    if (isNew) {
      add.mutate({ templateId, ...body }, { onSuccess: close, onError });
    } else if (existing) {
      update.mutate({ templateId, itemId: existing.id, ...body }, { onSuccess: close, onError });
    }
  }

  const showValueFields = existing ? existing.requires_value || requiresValue : requiresValue;

  return (
    <Dialog open={item !== null} onClose={close} title={isNew ? "Add item" : "Edit item"}>
      <form onSubmit={submit} className="flex flex-col gap-3.5" key={existing?.id ?? "new"}>
        <Field label="Title (English)">
          <Input name="title" required defaultValue={existing?.title ?? ""} />
        </Field>
        <Field label="Title (Bengali)">
          <Input name="title_bn" defaultValue={existing?.title_bn ?? ""} />
        </Field>
        <Field label="Instruction">
          <Input name="instruction" defaultValue={existing?.instruction ?? ""} />
        </Field>
        <Field label="Instruction (Bengali)">
          <Input name="instruction_bn" defaultValue={existing?.instruction_bn ?? ""} />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Toggle name="requires_photo" defaultChecked={existing?.requires_photo}>
            Requires photo
          </Toggle>
          <Toggle
            name="requires_value"
            defaultChecked={existing?.requires_value}
            onChange={(e) => setRequiresValue(e.target.checked)}
          >
            Records a value
          </Toggle>
          <Toggle name="is_critical" defaultChecked={existing?.is_critical}>
            Critical (weight 3, escalates)
          </Toggle>
          <Toggle name="allow_na" defaultChecked={existing?.allow_na}>
            N/A allowed
          </Toggle>
        </div>

        {showValueFields && (
          <div className="grid grid-cols-4 gap-2 rounded-md bg-akira-ink/[0.03] p-2.5">
            <Field label="Type">
              <select
                name="value_type"
                defaultValue={existing?.value_type ?? "number"}
                className="h-9 rounded-md border border-akira-ink/15 bg-white px-2 text-sm"
              >
                <option value="number">Number</option>
                <option value="temperature_c">Temp °C</option>
                <option value="time">Time</option>
                <option value="text">Text</option>
              </select>
            </Field>
            <Field label="Min">
              <Input
                name="value_min"
                type="number"
                step="any"
                defaultValue={existing?.value_min ?? ""}
              />
            </Field>
            <Field label="Max">
              <Input
                name="value_max"
                type="number"
                step="any"
                defaultValue={existing?.value_max ?? ""}
              />
            </Field>
            <Field label="Unit">
              <Input name="value_unit" defaultValue={existing?.value_unit ?? ""} />
            </Field>
          </div>
        )}

        <p className="text-xs text-akira-ink/50">
          Saving this bumps the template version. Runs completed before the change keep showing what
          was true when they ran.
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-between gap-2">
          {existing ? (
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() =>
                remove.mutate({ templateId, itemId: existing.id }, { onSuccess: close, onError })
              }
            >
              Remove item
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function Toggle({ children, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-akira-ink/12 px-2.5 py-2 text-xs font-medium hover:bg-akira-ink/[0.03]">
      <input type="checkbox" className="h-4 w-4 accent-akira-red" {...props} />
      {children}
    </label>
  );
}
