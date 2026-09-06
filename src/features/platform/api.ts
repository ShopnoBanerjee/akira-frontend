import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type OrganisationRow = components["schemas"]["OrganisationRow"];

const KEYS = {
  organisations: ["platform", "organisations"] as const,
};

/** Every organisation on the platform. Platform admin only (D33). */
export function useOrganisations() {
  return useQuery({
    queryKey: KEYS.organisations,
    queryFn: () => api.get<OrganisationRow[]>("/platform/organisations"),
  });
}
