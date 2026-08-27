import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type UploadRow = components["schemas"]["UploadRow"];
export type OrderRow = components["schemas"]["OrderRow"];
export type DailyTotal = components["schemas"]["DailyTotal"];

const KEYS = {
  uploads: ["sales", "uploads"] as const,
  orders: ["sales", "orders"] as const,
  daily: ["sales", "daily"] as const,
};

export function useUploads(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.uploads, outletId],
    queryFn: () => api.get<UploadRow[]>(`/sales/uploads?outlet_id=${outletId}`),
    enabled: outletId !== null,
    // A parse runs in the background and usually finishes in seconds. Poll
    // while anything is still in flight so the row settles without a reload.
    refetchInterval: (query) =>
      query.state.data?.some((u) => u.status === "received" || u.status === "parsing")
        ? 3000
        : false,
  });
}

export function useDailyTotals(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.daily, outletId],
    queryFn: () => api.get<DailyTotal[]>(`/sales/daily?outlet_id=${outletId}`),
    enabled: outletId !== null,
  });
}

export function useOrders(outletId: string | null, businessDate: string | null) {
  return useQuery({
    queryKey: [...KEYS.orders, outletId, businessDate],
    queryFn: () => {
      const range = businessDate ? `&from=${businessDate}&to=${businessDate}` : "";
      return api.get<OrderRow[]>(`/sales/orders?outlet_id=${outletId}${range}&limit=500`);
    },
    enabled: outletId !== null,
  });
}

export function useUploadExport(outletId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("outlet_id", outletId);
      body.append("file", file);
      return api.postForm<{
        id: string;
        status: string;
        already_ingested: boolean;
        detail: string;
      }>("/sales/uploads", body);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.uploads });
      void client.invalidateQueries({ queryKey: KEYS.daily });
      void client.invalidateQueries({ queryKey: KEYS.orders });
    },
  });
}

export function useReparse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (uploadId: string) => api.post(`/sales/uploads/${uploadId}/reparse`),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.uploads }),
  });
}

/** How an upload's status should read to somebody who just sent a file. */
export const UPLOAD_STATUS: Record<string, { label: string; tone: "ok" | "busy" | "bad" }> = {
  received: { label: "queued", tone: "busy" },
  parsing: { label: "parsing", tone: "busy" },
  parsed: { label: "ingested", tone: "ok" },
  failed: { label: "failed", tone: "bad" },
};

/** Narrow an unknown jsonb value to a string, or null. */
function text(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

/** Plain-language readings of what the parser chose to skip. */
export function describeWarning(w: Record<string, unknown>): string {
  const kind = text(w.kind) ?? "";
  const billNo = text(w.bill_no);
  const bill = billNo ? ` (bill ${billNo})` : "";
  switch (kind) {
    case "skipped_status":
      return `Not counted${bill}: the bill is marked "${text(w.status) ?? "unknown"}", not a completed sale.`;
    case "duplicate_bill_no":
      return `Repeated bill number${bill} — taken once.`;
    case "bad_timestamp":
      return `Skipped${bill}: the date could not be read.`;
    case "unknown_order_type":
      return `Order type "${text(w.value) ?? "unknown"}" is not one this reads; the bill counted but has no channel.`;
    case "missing_column":
      return `The export has no "${text(w.column) ?? "?"}" column, so ${text(w.effect) ?? "a field is unset"}.`;
    default:
      return JSON.stringify(w);
  }
}
