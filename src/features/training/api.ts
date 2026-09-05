import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type TrainingStatus = components["schemas"]["TrainingStatus"];
export type TrainingRecord = components["schemas"]["TrainingRecord"];
export type PersonTraining = components["schemas"]["PersonTraining"];
export type Language = "en" | "bn";

export const KEYS = {
  me: (version: string, actorKey: string | null) => ["training", "me", version, actorKey] as const,
  people: ["training", "people"] as const,
};

/**
 * Whether the tour has to run for whoever is acting. `actorKey` is part of
 * the key on purpose: on the shared tablet the person changes without the
 * session changing, and the next person's status must never be read from
 * the previous person's cache.
 */
export function useTrainingStatus(version: string, actorKey: string | null, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.me(version, actorKey),
    queryFn: () => api.get<TrainingStatus>(`/training/me?version=${encodeURIComponent(version)}`),
    enabled,
    staleTime: 0,
    retry: 1,
  });
}

export function useStartTraining() {
  return useMutation({
    mutationFn: (body: { version: string; total_steps: number; language: Language }) =>
      api.post<TrainingRecord>("/training/me/start", body),
  });
}

export function useRecordStep() {
  return useMutation({
    mutationFn: (body: { record_id: string; step: number }) =>
      api.post<TrainingRecord>("/training/me/step", body),
  });
}

export function useCompleteTraining() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { record_id: string }) =>
      api.post<TrainingRecord>("/training/me/complete", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["training"] });
    },
  });
}

export function useSkipTraining() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { record_id: string }) =>
      api.post<TrainingRecord>("/training/me/skip", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["training"] });
    },
  });
}

export function usePeopleTraining(enabled = true) {
  return useQuery({
    queryKey: KEYS.people,
    queryFn: () => api.get<PersonTraining[]>("/training/people"),
    enabled,
    staleTime: 30_000,
  });
}

export function useResetTraining() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) =>
      api.post<PersonTraining>(`/training/people/${profileId}/reset`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.people });
    },
  });
}

export function useSetTrainingDelegate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.put<components["schemas"]["UserListItem"]>(`/users/${id}/training-delegate`, {
        enabled,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin", "users"] });
      void client.invalidateQueries({ queryKey: KEYS.people });
    },
  });
}
