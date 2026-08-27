import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type OutletHealthRow = components["schemas"]["OutletHealthRow"];

export type Band = "green" | "amber" | "red" | "none";

export interface Pillar {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  band: Band;
  status: "live" | "stage_2";
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

export interface OutletHealth {
  outlet_id: string;
  outlet_code: string;
  outlet_name: string;
  period: { from: string; to: string; days: number };
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

/** Brand colours per health band. Red is a band here, not chrome. */
export const BAND_COLOUR: Record<Band, string> = {
  green: "var(--color-health-green)",
  amber: "var(--color-health-amber)",
  red: "var(--color-health-red)",
  none: "rgba(35,31,32,0.25)",
};

export const BAND_TEXT: Record<Band, string> = {
  green: "text-health-green",
  amber: "text-[#8a6414]",
  red: "text-akira-red",
  none: "text-akira-ink/40",
};

/** A percentage, or an em dash — never a fabricated zero. */
export function pct(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

/**
 * An SVG path through the trend points, scaled into the given box.
 *
 * Pure so it can be tested without rendering. Returns null when there is
 * nothing worth drawing: a single point is not a trend, and a flat line
 * through one value would imply a stability nobody has evidence for.
 */
export function sparklinePath(scores: number[], width: number, height: number): string | null {
  if (scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // A perfectly flat run would divide by zero; draw it down the middle.
  const span = max - min || 1;
  const step = width / (scores.length - 1);
  return scores
    .map((score, i) => {
      const x = i * step;
      const y = height - ((score - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
