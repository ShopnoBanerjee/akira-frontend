import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

import type { Band } from "./format";

export type OutletHealthRow = components["schemas"]["OutletHealthRow"];

export type { Band } from "./format";

export interface Pillar {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  band: Band;
  status: "live" | "not_measured";
}

/** Components of the pillar_math-shaped pillars (inventory, guest). */
export interface PillarComponent {
  key: string;
  label: string;
  display: string;
  target: string;
  score: number | null;
  weight: number;
  contribution: number;
  band: Band;
  status: "live" | "monitor" | "pending";
  note: string | null;
}

export interface PillarBlock {
  score: number | null;
  band: Band;
  components: PillarComponent[];
  dragged_down_by: { key: string; label: string; display: string } | null;
  detail: Record<string, unknown>;
}

export interface ScoreComponent {
  key: string;
  label: string;
  value: number | null;
  weight: number;
  contribution: number;
}

export interface ScorePenalty {
  key: string;
  label: string;
  points: number;
  detail: string;
}

export interface SalesComponent {
  key: string;
  label: string;
  display: string;
  target: string;
  score: number | null;
  weight: number;
  contribution: number;
  band: Band;
}

export interface OutletHealth {
  outlet_id: string;
  outlet_code: string;
  outlet_name: string;
  period: { from: string; to: string; days: number };
  health: {
    score: number | null;
    band: Band;
    weights_used: number;
    weights_total: number;
    unmeasured: string[];
  };
  pillars: Pillar[];
  sop: {
    score: number | null;
    band: Band;
    capped_by_critical: boolean;
    components: ScoreComponent[];
    penalties: ScorePenalty[];
    dragged_down_by: { key: string; label: string; value: number | null } | null;
    counts: {
      scheduled: number;
      approved: number;
      submitted: number;
      on_time: number;
      missed: number;
      integrity_flags: number;
      open_critical: number;
      stale_critical: number;
    };
  };
  sales: {
    score: number | null;
    band: Band;
    components: SalesComponent[];
    dragged_down_by: { key: string; label: string; display: string } | null;
    detail: Record<string, unknown>;
  };
  inventory: PillarBlock;
  guest: PillarBlock;
  trend: { business_date: string; score: number; approved: number }[];
}

const KEYS = {
  outlets: ["dashboard", "outlets"] as const,
  health: (outletId: string, days: number) => ["dashboard", "health", outletId, days] as const,
};

export function useOutletScores(days = 28) {
  return useQuery({
    queryKey: [...KEYS.outlets, days],
    queryFn: () => api.get<OutletHealthRow[]>(`/dashboard/outlets?days=${days}`),
  });
}

export function useOutletHealth(outletId: string | null, days = 28) {
  return useQuery({
    queryKey: KEYS.health(outletId ?? "", days),
    queryFn: () =>
      api.get<OutletHealth>(`/dashboard/outlet-health?outlet_id=${outletId}&days=${days}`),
    enabled: outletId !== null,
    // Keep the card on screen while the next outlet or period loads. Without
    // this the whole thing unmounts on every click and the page flashes empty,
    // which reads as a broken button rather than as a fetch.
    placeholderData: keepPreviousData,
  });
}
