import { useState } from "react";

import { Button } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

import { useAddMenuAlias, useMenuItems, useMenuMix } from "./api";

/**
 * Category attach — the share of bills that carried a drink, a dessert, a
 * starter (D29). Two sources, each labelled: Petpooja's own per-period count
 * of bills per category, and the same thing measured on bills whose item
 * names were uploaded. The reported number is the one to steer by; the
 * measured one is the check on it, and the list of unmapped names is why
 * the two can disagree.
 */
export function MenuMixSection({ outletId }: { outletId: string }) {
  const { data, isPending } = useMenuMix(outletId);
  if (isPending || !data) return null;

  const reported = data.reported;
  const measured = data.measured;
  const measuredBy = new Map(measured.categories.map((c) => [c.category, c]));
  const nothingYet = !reported && measured.bills_measured === 0 && data.menu_items_known === 0;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-akira-ink/45">
          Menu mix — share of bills carrying each category
        </h2>
        {reported && (
          <p className="text-xs text-akira-ink/50">
            Petpooja Category Wise report, {reported.period_start} to {reported.period_end} ·{" "}
            {reported.bills_in_period} bills in the period
          </p>
        )}
      </div>

      {nothingYet && (
        <p className="mt-3 rounded-lg border border-dashed border-akira-ink/15 p-4 text-sm text-akira-ink/60">
          Upload Petpooja&apos;s <strong>Sales Report: Category Wise</strong> to see what share of
          bills carry a drink or a dessert, and the <strong>Item Wise: Sales Report</strong> so the
          same can be measured bill by bill.
        </p>
      )}

      {reported && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-akira-ink/45">
              <tr>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Bills with it</th>
                <th className="px-4 py-2">Share of bills</th>
                <th className="px-4 py-2 text-right">Items / bill</th>
                <th className="px-4 py-2 text-right">Spend / bill</th>
                <th className="px-4 py-2 text-right">Net sales</th>
                <th className="px-4 py-2 text-right">Measured</th>
              </tr>
            </thead>
            <tbody>
              {reported.categories
                .filter((c) => !c.is_charge)
                .map((c) => {
                  const attach = isAttach(c.category);
                  const m = measuredBy.get(c.category);
                  return (
                    <tr key={c.category} className="border-t border-akira-ink/5">
                      <td className="px-4 py-2 font-medium">
                        {c.category}
                        {attach && (
                          <span className="ml-2 rounded bg-akira-red/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-akira-red">
                            attach
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{c.orders}</td>
                      <td className="px-4 py-2">
                        <ShareBar share={c.share_of_bills} strong={attach} />
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {c.items_per_order?.toFixed(2) ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {c.avg_spend_per_bill_paise != null
                          ? formatPaise(c.avg_spend_per_bill_paise)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatPaise(c.net_sales_paise)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-akira-ink/60">
                        {m?.share_of_bills != null ? `${pct(m.share_of_bills)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-akira-ink/50">
        {measured.bills_measured > 0 ? (
          <>
            Measured column: {measured.bills_measured} bills whose item names were uploaded
            {measured.from ? ` (${measured.from} to ${measured.to})` : ""}.
          </>
        ) : (
          <>Measured column is empty until an Order Listing has supplied item names per bill.</>
        )}
      </p>

      {measured.unmapped_item_names.length > 0 && (
        <div className="mt-3 rounded-lg border border-akira-red/30 bg-akira-red/5 p-3">
          <p className="text-xs font-medium text-akira-red">
            {measured.unmapped_item_names.length} name
            {measured.unmapped_item_names.length === 1 ? "" : "s"} on bills the menu map does not
            know. Each one lowers every measured rate until it is mapped.
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {measured.unmapped_item_names.map((name) => (
              <MapName key={name} name={name} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function isAttach(category: string): boolean {
  return /refresh|bever|drink|dessert|side|dip/i.test(category);
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function ShareBar({ share, strong }: { share: number | null | undefined; strong: boolean }) {
  if (share == null) return <span className="text-akira-ink/40">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded bg-akira-ink/10">
        <div
          className={cn("h-full rounded", strong ? "bg-akira-red" : "bg-akira-ink/50")}
          style={{ width: `${Math.min(100, Math.round(share * 100))}%` }}
        />
      </div>
      <span className="tabular-nums">{pct(share)}</span>
    </div>
  );
}

/** One unmapped bill spelling and the menu item it should mean. */
function MapName({ name }: { name: string }) {
  const items = useMenuItems();
  const add = useAddMenuAlias();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{name}</code>
      <span className="text-akira-ink/50">means</span>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="h-8 rounded-md border border-akira-ink/15 bg-white px-2 text-sm"
        aria-label={`Menu item for ${name}`}
      >
        <option value="">Choose a menu item…</option>
        {(items.data ?? []).map((i) => (
          <option key={i.id} value={i.name}>
            {i.category} · {i.name}
          </option>
        ))}
      </select>
      <Button
        variant="primary"
        disabled={!target || add.isPending}
        onClick={() =>
          add.mutate(
            { alias: name, menu_item_name: target },
            {
              onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
            },
          )
        }
      >
        {add.isPending ? "Saving…" : "Map"}
      </Button>
      {error && <span className="text-xs text-akira-red">{error}</span>}
    </li>
  );
}
