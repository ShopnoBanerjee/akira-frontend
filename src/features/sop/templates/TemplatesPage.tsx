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
import { navigate } from "@/app/navigate";
import { useCreateTemplate, useSopCategories, useTemplates, type TemplateSummary } from "./api";

/** Read a text field from a form. Files are not valid here by construction. */
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function TemplatesPage() {
  const { data: templates, isPending, isError, refetch } = useTemplates();
  const { data: categories } = useSopCategories();
  const isAdmin = useHasRole("owner", "ops_manager");
  const [creating, setCreating] = useState(false);

  const grouped = (categories ?? []).map((category) => ({
    category,
    templates: (templates ?? []).filter((t) => t.category_id === category.id),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SOP Templates</h1>
          <p className="mt-1 text-sm text-akira-ink/55">
            The checklists outlets run. Editing items creates a new version; completed runs keep
            rendering the version they were performed against.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={() => setCreating(true)}>
            New template
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={6} />}
        {isError && (
          <EmptyState
            title="Could not load templates"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {grouped.map(
          ({ category, templates: list }) =>
            list.length > 0 && (
              <section key={category.id} className="mt-6 first:mt-0">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
                  {category.label}
                  {category.label_bn && (
                    <span className="ml-2 font-normal normal-case tracking-normal text-akira-ink/40">
                      {category.label_bn}
                    </span>
                  )}
                </h2>
                <div className="mt-2 overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
                  {list.map((template) => (
                    <TemplateRow key={template.id} template={template} />
                  ))}
                </div>
              </section>
            ),
        )}
      </div>

      <CreateTemplateDialog open={creating} onClose={() => setCreating(false)} />
    </main>
  );
}

function TemplateRow({ template }: { template: TemplateSummary }) {
  return (
    <button
      onClick={() => navigate(`/app/sop/templates/${template.id}`)}
      className="flex w-full items-center justify-between gap-4 border-b border-akira-ink/5 px-4 py-3 text-left last:border-0 hover:bg-akira-ink/[0.02]"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {template.name}
          {!template.is_active && (
            <span className="ml-2 rounded bg-akira-ink/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-akira-ink/50">
              inactive
            </span>
          )}
        </p>
        {template.name_bn && <p className="text-xs text-akira-ink/55">{template.name_bn}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs tabular-nums text-akira-ink/55">
        <span>{template.item_count} items</span>
        {template.critical_count > 0 && (
          <span className="text-akira-red">{template.critical_count} critical</span>
        )}
        <span>
          {template.assignment_count} outlet
          {template.assignment_count === 1 ? "" : "s"}
        </span>
        <span className="rounded bg-akira-ink/[0.05] px-1.5 py-0.5 font-mono">
          v{template.version}
        </span>
      </div>
    </button>
  );
}

function CreateTemplateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateTemplate();
  const { data: categories } = useSopCategories();
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    create.mutate(
      {
        name: field(data, "name"),
        name_bn: field(data, "name_bn") || null,
        description: field(data, "description") || null,
        category_id: field(data, "category_id"),
        frequency: field(data, "frequency") as never,
        day_part: field(data, "day_part") as never,
      },
      {
        onSuccess: (detail) => {
          onClose();
          navigate(`/app/sop/templates/${detail.id}`);
        },
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="New template">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Name">
          <Input name="name" required placeholder="Opening — Kitchen" />
        </Field>
        <Field label="Name (Bengali)">
          <Input name="name_bn" placeholder="খোলা — রান্নাঘর" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Category">
            <select
              name="category_id"
              required
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-2 text-sm"
            >
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frequency">
            <select
              name="frequency"
              defaultValue="daily"
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-2 text-sm"
            >
              <option value="per_shift">Per shift</option>
              <option value="daily">Daily</option>
              <option value="alternate_day">Alternate day</option>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
          <Field label="Day part">
            <select
              name="day_part"
              defaultValue="any"
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-2 text-sm"
            >
              <option value="opening">Opening</option>
              <option value="mid">Mid</option>
              <option value="closing">Closing</option>
              <option value="any">Any</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <Input name="description" placeholder="Optional" />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create and open"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
