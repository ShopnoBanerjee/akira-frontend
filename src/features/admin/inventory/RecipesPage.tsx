import { useState } from "react";

import { Button, EmptyState, ErrorNote, TableSkeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  useDeleteRecipe,
  useInventoryItems,
  useRecipes,
  useSaveRecipe,
  useUnmappedNames,
  type Recipe,
} from "../api";

/**
 * Recipes: what one sold dish uses from the catalogue.
 *
 * The worklist at the top is the honesty gap made visible — theoretical
 * consumption only counts what is mapped, so every unmapped name up there
 * is a dish whose ingredients the variance arithmetic cannot see. Ordered
 * by units sold: map the ramen that sells thirty a night first.
 */
export function RecipesPage() {
  const { me } = useAuth();
  const recipes = useRecipes();
  const unmapped = useUnmappedNames();
  const [editing, setEditing] = useState<string | null>(null);

  const canEdit = me?.global_role === "owner" || me?.global_role === "ops_manager";

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Recipes</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        What one sold dish uses from the stock catalogue, per unit sold. Names must match what
        Petpooja prints on bills — pick them from the unmapped list rather than typing them.
      </p>

      {/* --- The worklist --------------------------------------------- */}
      {(unmapped.data?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
            Sold, but not mapped yet
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {unmapped.data?.map((n) => (
              <button
                key={n.item_name}
                onClick={() => canEdit && setEditing(n.item_name)}
                disabled={!canEdit}
                className={cn(
                  "rounded-lg border border-dashed border-akira-ink/20 bg-white px-3 py-1.5 text-sm",
                  canEdit && "hover:border-akira-blue hover:text-akira-blue",
                )}
              >
                {n.item_name}
                {n.units != null && (
                  <span className="ml-1.5 text-xs text-akira-ink/45">
                    {Math.round(n.units)} sold
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-akira-ink/45">
            Theoretical consumption counts only mapped dishes — each name here is invisible to the
            variance arithmetic until someone maps it.
          </p>
        </section>
      )}

      {editing !== null && (
        <RecipeEditor
          menuItemName={editing}
          existing={recipes.data?.find((r) => r.menu_item_name === editing) ?? null}
          onDone={() => setEditing(null)}
        />
      )}

      {/* --- The recipes ---------------------------------------------- */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
          Mapped dishes
        </h2>
        {recipes.isPending && (
          <div className="mt-2">
            <TableSkeleton rows={4} />
          </div>
        )}
        {recipes.data?.length === 0 && (
          <div className="mt-2">
            <EmptyState
              title="No recipes yet"
              hint="Pick a dish from the unmapped list above and write down what one serving uses."
            />
          </div>
        )}
        {(recipes.data?.length ?? 0) > 0 && (
          <div className="mt-2 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Dish</th>
                  <th className="px-4 py-2.5 font-semibold">Per unit sold</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {recipes.data?.map((r) => (
                  <tr key={r.id} className="border-b border-akira-ink/5 last:border-0 align-top">
                    <td className="px-4 py-2.5">
                      {r.menu_item_name}
                      {!r.is_active && (
                        <span className="ml-2 rounded bg-akira-ink/8 px-1.5 py-0.5 text-[10px] font-semibold text-akira-ink/50">
                          inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-akira-ink/70">
                      {r.lines
                        .map(
                          (line) => `${line.qty_per_unit}${unitShort(line.unit)} ${line.item_name}`,
                        )
                        .join(" · ")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit && (
                        <button
                          onClick={() => setEditing(r.menu_item_name)}
                          className="text-xs font-semibold text-akira-blue hover:underline"
                        >
                          edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function unitShort(unit: string): string {
  return { gram: "g", millilitre: "ml", piece: "pc", packet: "pk", kilogram: "kg" }[unit] ?? unit;
}

interface DraftLine {
  item_id: string;
  qty: string;
}

function RecipeEditor({
  menuItemName,
  existing,
  onDone,
}: {
  menuItemName: string;
  existing: Recipe | null;
  onDone: () => void;
}) {
  const items = useInventoryItems();
  const save = useSaveRecipe();
  const remove = useDeleteRecipe();
  const [lines, setLines] = useState<DraftLine[]>(
    existing?.lines.map((line) => ({
      item_id: line.item_id,
      qty: String(line.qty_per_unit),
    })) ?? [{ item_id: "", qty: "" }],
  );
  const [error, setError] = useState<string | null>(null);

  const set = (index: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const submit = () => {
    const cleaned = lines.filter((line) => line.item_id && Number(line.qty) > 0);
    if (cleaned.length === 0) {
      setError("A recipe needs at least one ingredient with a quantity.");
      return;
    }
    save.mutate(
      {
        menuItemName,
        body: {
          lines: cleaned.map((line) => ({
            item_id: line.item_id,
            qty_per_unit: Number(line.qty),
          })),
          is_active: true,
        },
      },
      {
        onSuccess: onDone,
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : "Could not save."),
      },
    );
  };

  return (
    <section className="mt-6 rounded-lg border border-akira-blue/30 bg-akira-blue/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{menuItemName}</h2>
        <button onClick={onDone} className="text-xs text-akira-ink/50 hover:underline">
          cancel
        </button>
      </div>
      <p className="mt-1 text-xs text-akira-ink/50">
        What ONE unit sold uses, in each ingredient&apos;s own unit.
      </p>
      <div className="mt-3 space-y-2">
        {lines.map((line, index) => {
          const item = items.data?.find((i) => i.id === line.item_id);
          return (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={line.item_id}
                onChange={(e) => set(index, { item_id: e.target.value })}
                className="min-w-56 rounded-md border border-akira-ink/15 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">— ingredient —</option>
                {items.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                min="0"
                value={line.qty}
                onChange={(e) => set(index, { qty: e.target.value })}
                placeholder="qty"
                className="w-24 rounded-md border border-akira-ink/15 bg-white px-2 py-1.5 text-sm tabular-nums"
              />
              <span className="text-xs text-akira-ink/45">{item ? unitShort(item.unit) : ""}</span>
              <button
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                className="text-xs text-akira-ink/40 hover:text-akira-red"
                aria-label="Remove line"
              >
                remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => setLines((prev) => [...prev, { item_id: "", qty: "" }])}
          className="text-xs font-semibold text-akira-blue hover:underline"
        >
          + ingredient
        </button>
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save recipe"}
        </Button>
        {existing && (
          <button
            onClick={() => remove.mutate(existing.id, { onSuccess: onDone })}
            className="text-xs text-akira-red hover:underline"
          >
            delete recipe
          </button>
        )}
      </div>
      {error && (
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </section>
  );
}
