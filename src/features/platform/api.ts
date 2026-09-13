import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type PlatformOverview = components["schemas"]["PlatformOverview"];
export type OrganisationRow = components["schemas"]["OrganisationRow"];
export type OrganisationDetail = components["schemas"]["OrganisationDetail"];
export type OrganisationUsage = components["schemas"]["OrganisationUsage"];
export type Allowance = components["schemas"]["Allowance"];
export type UpdateOrganisation = components["schemas"]["UpdateOrganisationRequest"];
export type CreateOrganisation = components["schemas"]["CreateOrganisationRequest"];
export type CreateOrganisationResult = components["schemas"]["CreateOrganisationResponse"];

const KEYS = {
  overview: ["platform", "overview"] as const,
  organisations: ["platform", "organisations"] as const,
  organisation: (id: string) => ["platform", "organisations", id] as const,
};

/** Totals across every organisation. Platform admin only (D35). */
export function usePlatformOverview() {
  return useQuery({
    queryKey: KEYS.overview,
    queryFn: () => api.get<PlatformOverview>("/platform/overview"),
  });
}

export function useOrganisations() {
  return useQuery({
    queryKey: KEYS.organisations,
    queryFn: () => api.get<OrganisationRow[]>("/platform/organisations"),
  });
}

export function useOrganisation(id: string) {
  return useQuery({
    queryKey: KEYS.organisation(id),
    queryFn: () => api.get<OrganisationDetail>(`/platform/organisations/${id}`),
  });
}

export function useUpdateOrganisation(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateOrganisation) =>
      api.patch<OrganisationDetail>(`/platform/organisations/${id}`, body),
    onSuccess: (detail) => {
      client.setQueryData(KEYS.organisation(id), detail);
      void client.invalidateQueries({ queryKey: KEYS.overview });
      void client.invalidateQueries({ queryKey: KEYS.organisations, exact: true });
    },
  });
}

export function useCreateOrganisation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrganisation) =>
      api.post<CreateOrganisationResult>("/platform/organisations", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.overview });
      void client.invalidateQueries({ queryKey: KEYS.organisations, exact: true });
    },
  });
}
