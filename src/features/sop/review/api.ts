import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type QueueRow = components["schemas"]["QueueRow"];
export type ExceptionRow = components["schemas"]["ExceptionRow"];

/** The review detail endpoint returns a dynamic dict; typed for this UI. */
export interface ReviewItem {
  id: string;
  sort_order: number;
  result: "pass" | "fail" | "na" | "pending";
  value_numeric: number | null;
  value_text: string | null;
  out_of_range: boolean;
  note: string | null;
  photo_path: string | null;
  photo_view_url: string | null;
  viewed_by_me: boolean;
  integrity_flags: string[];
  title: string;
  title_bn: string | null;
  instruction: string | null;
  requires_photo: boolean;
  requires_value: boolean;
  value_type: string | null;
  value_min: number | null;
  value_max: number | null;
  value_unit: string | null;
  is_critical: boolean;
}

export interface ReviewDetail {
  id: string;
  outlet_code: string;
  status: string;
  business_date: string;
  template_name: string;
  template_name_bn: string | null;
  template_version: number;
  started_at: string | null;
  submitted_at: string | null;
  due_at: string | null;
  is_late: boolean;
  minutes_late: number | null;
  score_pct: number | null;
  critical_fail_count: number;
  integrity_flag_count: number;
  geo_ok: boolean | null;
  rejection_reason: string | null;
  submitted_by: string | null;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  device_label: string | null;
  items: ReviewItem[];
}

const KEYS = {
  queue: ["review", "queue"] as const,
  detail: (id: string) => ["review", "detail", id] as const,
  exceptions: ["review", "exceptions"] as const,
};

export function useReviewQueue(status = "submitted") {
  return useQuery({
    queryKey: [...KEYS.queue, status],
    queryFn: () => api.get<QueueRow[]>(`/sop/runs?status=${status}`),
  });
}

export function useReviewDetail(runId: string | null) {
  return useQuery({
    queryKey: KEYS.detail(runId ?? ""),
    queryFn: () => api.get<ReviewDetail>(`/sop/runs/${runId}/detail`),
    enabled: runId !== null,
    // Signed photo URLs expire in five minutes; refetch before they do.
    staleTime: 4 * 60_000,
  });
}

export function useMarkViewed(runId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.post(`/sop/runs/${runId}/viewed`, { item_id: itemId }),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.detail(runId) }),
  });
}

export function useApproveRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.post(`/sop/runs/${runId}/approve`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.queue });
      void client.invalidateQueries({ queryKey: ["review", "detail"] });
    },
  });
}

export function useRejectRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      reason,
      itemIds,
    }: {
      runId: string;
      reason: string;
      itemIds: string[];
    }) => api.post(`/sop/runs/${runId}/reject`, { reason, item_ids: itemIds }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.queue });
      void client.invalidateQueries({ queryKey: ["review", "detail"] });
    },
  });
}

export function useExceptions() {
  return useQuery({
    queryKey: KEYS.exceptions,
    queryFn: () => api.get<ExceptionRow[]>("/sop/exceptions"),
  });
}

export function useExceptionAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      body,
    }: {
      id: string;
      action: "acknowledge" | "resolve" | "waive";
      body?: Record<string, string>;
    }) => api.post(`/sop/exceptions/${id}/${action}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.exceptions }),
  });
}
