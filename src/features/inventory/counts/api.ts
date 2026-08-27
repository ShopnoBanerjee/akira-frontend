import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

// The count endpoints return dynamic dict shapes (raw extraction beside
// derived columns), so the rows are typed here rather than from the generated
// schema — the generated types for these are plain objects.

export interface CountRow {
  id: string;
  business_date: string;
  counted_at_label: string | null;
  status: "extracting" | "review" | "confirmed" | "failed";
  extractor: string | null;
  page_count: number | null;
  created_at: string;
  confirmed_at: string | null;
  confirmed_by_name: string | null;
  original_filename: string;
  line_count: number;
  needs_review: number;
}

export interface CountLine {
  id: string;
  page: number | null;
  sl_no: number | null;
  raw_name: string;
  raw_closing: string | null;
  raw_requisition: string | null;
  extract_confidence: number | null;
  item_id: string | null;
  item_name: string | null;
  item_unit: string | null;
  match_method: string | null;
  qty: number | null;
  requested_qty: number | null;
  parse_detail: Record<string, unknown>;
  needs_review: boolean;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
}

export interface CountDetail extends Omit<CountRow, "line_count" | "needs_review"> {
  outlet_id: string;
  lines: CountLine[];
}

export interface RequisitionLine {
  item_id: string;
  item_name: string;
  item_unit: string;
  on_hand: number | null;
  par_level: number | null;
  order_unit: number | null;
  suggested_qty: number | null;
  requested_qty: number | null;
  final_qty: number | null;
  flags: string[];
  detail: Record<string, unknown>;
}

export interface RequisitionDetail {
  id: string;
  outlet_id: string;
  business_date: string;
  status: "draft" | "final";
  created_at: string;
  created_by_name: string | null;
  finalised_at: string | null;
  finalised_by_name: string | null;
  lines: RequisitionLine[];
}

const KEYS = {
  counts: ["inventory", "counts"] as const,
  count: (id: string) => ["inventory", "counts", id] as const,
  requisition: (id: string) => ["inventory", "requisitions", id] as const,
};

export function useCounts(outletId: string | null) {
  return useQuery({
    queryKey: [...KEYS.counts, outletId],
    queryFn: () => api.get<CountRow[]>(`/inventory/counts?outlet_id=${outletId}`),
    enabled: outletId !== null,
    // Extraction runs in the background; poll while any sheet is being read.
    refetchInterval: (query) =>
      query.state.data?.some((c) => c.status === "extracting") ? 4000 : false,
  });
}

export function useCount(countId: string | null) {
  return useQuery({
    queryKey: KEYS.count(countId ?? ""),
    queryFn: () => api.get<CountDetail>(`/inventory/counts/${countId}`),
    enabled: countId !== null,
    refetchInterval: (query) => (query.state.data?.status === "extracting" ? 4000 : false),
  });
}

export function useUploadSheet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ outletId, file }: { outletId: string; file: File }) => {
      const body = new FormData();
      body.set("outlet_id", outletId);
      body.set("file", file);
      return api.postForm<{ count_id: string; already_ingested: boolean }>(
        "/inventory/counts",
        body,
      );
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.counts }),
  });
}

export function useReviewLine(countId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineId,
      itemId,
      qty,
      requestedQty,
      rememberAlias,
    }: {
      lineId: string;
      itemId: string | null;
      qty: number | null;
      requestedQty: number | null;
      rememberAlias: boolean;
    }) =>
      api.patch(`/inventory/counts/${countId}/lines/${lineId}`, {
        item_id: itemId,
        qty,
        requested_qty: requestedQty,
        remember_alias: rememberAlias,
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.count(countId) }),
  });
}

export function useConfirmCount(countId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/inventory/counts/${countId}/confirm`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.counts });
      void client.invalidateQueries({ queryKey: KEYS.count(countId) });
    },
  });
}

export function useReExtract(countId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/inventory/counts/${countId}/re-extract`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.counts });
      void client.invalidateQueries({ queryKey: KEYS.count(countId) });
    },
  });
}

export function useBuildRequisition() {
  return useMutation({
    mutationFn: (countId: string) =>
      api.post<{ requisition_id: string }>(`/inventory/requisitions?count_id=${countId}`),
  });
}

export function useRequisition(requisitionId: string | null) {
  return useQuery({
    queryKey: KEYS.requisition(requisitionId ?? ""),
    queryFn: () => api.get<RequisitionDetail>(`/inventory/requisitions/${requisitionId}`),
    enabled: requisitionId !== null,
  });
}

export function useSetFinalQty(requisitionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, finalQty }: { itemId: string; finalQty: number | null }) =>
      api.patch(`/inventory/requisitions/${requisitionId}/lines`, {
        item_id: itemId,
        final_qty: finalQty,
      }),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: KEYS.requisition(requisitionId) }),
  });
}

export function useFinaliseRequisition(requisitionId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/inventory/requisitions/${requisitionId}/finalise`),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: KEYS.requisition(requisitionId) }),
  });
}

export interface SuggestedWorking {
  formula: string;
  par: number;
  on_hand: number;
  gap: number;
  order_unit: number | null;
  result: number;
}

/** The formula's working from a requisition line, or null when there was no
 * formula to run (no par, not counted). */
export function workingOf(line: RequisitionLine): SuggestedWorking | null {
  const s = line.detail.suggested;
  if (typeof s !== "object" || s === null) return null;
  return s as unknown as SuggestedWorking;
}

interface ParsePart {
  refused?: string;
  read_as?: string;
  raw?: string;
  converted_to?: string;
}

interface MatchPart {
  method?: string;
  matched_name?: string;
  score?: number;
}

/** The reviewer's one-line reading of what the parser did or refused. */
export function describeParseDetail(detail: Record<string, unknown>): string[] {
  const notes: string[] = [];
  const match = detail.match as MatchPart | undefined;
  if (match?.method === "fuzzy")
    notes.push(
      `fuzzy match "${match.matched_name ?? "?"}" (score ${match.score ?? "?"}) — check it`,
    );
  for (const label of ["closing", "requisition"] as const) {
    const part = detail[label] as ParsePart | undefined;
    if (!part) continue;
    if (part.refused) notes.push(`${label}: refused — ${part.refused}`);
    else if (part.read_as === "thousands_dot")
      notes.push(`${label}: read "${part.raw ?? ""}" as thousands (kitchen kg-dot)`);
    else if (part.converted_to)
      notes.push(`${label}: ${part.read_as ?? ""} → ${part.converted_to}`);
  }
  return notes;
}
