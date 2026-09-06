import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type OnboardingStatus = components["schemas"]["OnboardingStatus"];
export type OnboardingStep = components["schemas"]["OnboardingStep"];

const KEYS = {
  status: ["onboarding"] as const,
};

/**
 * What this outlet still needs. Computed from the data on every read, so it
 * settles by itself as soon as a report is uploaded — no cache to invalidate
 * from six different screens.
 */
export function useOnboarding(outletId?: string | null) {
  return useQuery({
    queryKey: [...KEYS.status, outletId ?? null],
    queryFn: () =>
      api.get<OnboardingStatus>(`/onboarding${outletId ? `?outlet_id=${outletId}` : ""}`),
    staleTime: 30_000,
  });
}
