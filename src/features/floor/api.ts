import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, setActor, type StoredActor } from "@/lib/api";

/** Run payloads are dynamic dicts server-side; typed here for the floor UI. */
export interface RunListItem {
  id: string;
  template_name: string;
  template_name_bn: string | null;
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "missed";
  due_at: string | null;
  item_count: number;
  answered_count: number;
  assigned_role: string;
  rejection_reason: string | null;
}

export interface RunItem {
  id: string;
  sort_order: number;
  result: "pass" | "fail" | "na" | "pending";
  value_numeric: number | null;
  value_text: string | null;
  out_of_range: boolean;
  note: string | null;
  photo_path: string | null;
  title: string;
  title_bn: string | null;
  instruction: string | null;
  instruction_bn: string | null;
  requires_photo: boolean;
  requires_value: boolean;
  value_type: "number" | "text" | "temperature_c" | "time" | null;
  value_min: number | null;
  value_max: number | null;
  value_unit: string | null;
  is_critical: boolean;
  allow_na: boolean;
}

export interface RunDetail extends RunListItem {
  outlet_id: string;
  items: RunItem[];
}

export interface FloorStaffMember {
  profile_id: string;
  full_name: string;
  role: string;
  has_pin: boolean;
}

const KEYS = {
  today: (outletId: string) => ["floor", "today", outletId] as const,
  run: (id: string) => ["floor", "run", id] as const,
  staff: ["floor", "staff"] as const,
};

export function useFloorStaff(enabled: boolean) {
  return useQuery({
    queryKey: KEYS.staff,
    queryFn: () => api.get<FloorStaffMember[]>("/floor/staff"),
    enabled,
  });
}

export function useIdentify() {
  return useMutation({
    mutationFn: (body: { profile_id: string; pin: string }) =>
      api.post<{
        actor_token: string;
        expires_at: number;
        profile_id: string;
        full_name: string;
        role: string;
      }>("/floor/identify", body),
    onSuccess: (result) => {
      const actor: StoredActor = {
        token: result.actor_token,
        profile_id: result.profile_id,
        full_name: result.full_name,
        role: result.role,
        expires_at: result.expires_at,
      };
      setActor(actor);
    },
  });
}

export function useTodayRuns(outletId: string | null) {
  return useQuery({
    queryKey: KEYS.today(outletId ?? ""),
    queryFn: () => api.get<RunListItem[]>(`/sop/runs/today?outlet_id=${outletId}`),
    enabled: outletId !== null,
    refetchInterval: 60_000,
  });
}

export function useRun(runId: string | null) {
  return useQuery({
    queryKey: KEYS.run(runId ?? ""),
    queryFn: () => api.get<RunDetail>(`/sop/runs/${runId}`),
    enabled: runId !== null,
  });
}

export function useStartRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) => api.post<RunDetail>(`/sop/runs/${runId}/start`),
    onSuccess: (detail) => {
      client.setQueryData(KEYS.run(detail.id), detail);
      void client.invalidateQueries({ queryKey: ["floor", "today"] });
    },
  });
}

export function useSubmitRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      runId,
      geo,
    }: {
      runId: string;
      geo: { geo_lat: number; geo_lng: number } | null;
    }) => api.post<RunDetail>(`/sop/runs/${runId}/submit`, geo ?? {}),
    onSuccess: (detail) => {
      client.setQueryData(KEYS.run(detail.id), detail);
      void client.invalidateQueries({ queryKey: ["floor", "today"] });
    },
  });
}

/** Ask once, resolve to null on any refusal. Never block on a permission the
 * staff member cannot grant — the backend records geo_ok = null instead. */
export function requestLocation(): Promise<{ geo_lat: number; geo_lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          geo_lat: position.coords.latitude,
          geo_lng: position.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000 },
    );
  });
}
