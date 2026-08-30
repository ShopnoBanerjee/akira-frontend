import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type UploadRow = components["schemas"]["UploadRow"];
export type OrderRow = components["schemas"]["OrderRow"];
export type DailyTotal = components["schemas"]["DailyTotal"];
export type ItemSummaryRow = components["schemas"]["ItemSummaryRow"];
export type ForecastDay = components["schemas"]["ForecastDay"];
export type ForecastEventRow = components["schemas"]["ForecastEventRow"];

export interface ForecastAccuracy {
  model: string;
  weeks: number;
  scored_days: number;
  mape_all_horizons: number | null;
  mape_day_ahead: number | null;
  day_ahead_days: number;
}

const KEYS = {
  uploads: ["sales", "uploads"] as const,
  orders: ["sales", "orders"] as const,
  daily: ["sales", "daily"] as const,
  items: ["sales", "items"] as const,
  forecast: ["sales", "forecast"] as const,
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

export function useItemSummary(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.items, outletId],
    queryFn: () => api.get<ItemSummaryRow[]>(`/sales/items?outlet_id=${outletId}`),
    enabled: outletId !== null,
  });
}

export function useForecast(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.forecast, outletId],
    queryFn: () => api.get<ForecastDay[]>(`/sales/forecast?outlet_id=${outletId}`),
    enabled: outletId !== null,
  });
}

export function useForecastAccuracy(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.forecast, "accuracy", outletId],
    queryFn: () => api.get<ForecastAccuracy>(`/sales/forecast/accuracy?outlet_id=${outletId}`),
    enabled: outletId !== null,
  });
}

export function useForecastEvents(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.forecast, "events", outletId],
    queryFn: () => api.get<ForecastEventRow[]>(`/sales/forecast/events?outlet_id=${outletId}`),
    enabled: outletId !== null,
  });
}

export function useCreateForecastEvent(outletId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { event_date: string; multiplier: number; label: string }) =>
      api.post<ForecastEventRow>("/sales/forecast/events", { ...body, outlet_id: outletId }),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.forecast }),
  });
}

export function useDeleteForecastEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/sales/forecast/events/${eventId}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.forecast }),
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
      void client.invalidateQueries({ queryKey: KEYS.items });
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
    case "unmatched_bills":
      return `${text(w.count) ?? "Some"} orders are not in the ingested bills yet — upload the Orders Master Report covering this period, then re-parse.`;
    case "duplicate_order":
      return `Repeated order number${bill} — taken once.`;
    case "empty_items":
      return `Order${bill} listed no items; nothing written for it.`;
    case "rejoined_item_name":
      return `An item name${bill} contained a comma and was stitched back together — worth a glance.`;
    case "bad_amount":
      return `The amount${bill} could not be read; items were still taken.`;
    case "missing_column":
      return `The export has no "${text(w.column) ?? "?"}" column, so ${text(w.effect) ?? "a field is unset"}.`;
    default:
      return JSON.stringify(w);
  }
}
