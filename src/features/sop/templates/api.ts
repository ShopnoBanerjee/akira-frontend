import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type SopCategory = components["schemas"]["CategoryOut"];
export type TemplateSummary = components["schemas"]["TemplateSummary"];
export type TemplateDetail = components["schemas"]["TemplateDetail"];
export type TemplateItem = components["schemas"]["TemplateItem"];
export type ItemFields = components["schemas"]["ItemFields"];
export type UpdateItem = components["schemas"]["UpdateTemplateItemRequest"];
export type Assignment = components["schemas"]["Assignment"];
export type CreateAssignment = components["schemas"]["CreateAssignmentRequest"];
export type ValueType = components["schemas"]["ValueType"];

const KEYS = {
  categories: ["sop", "categories"] as const,
  templates: ["sop", "templates"] as const,
  template: (id: string) => ["sop", "templates", id] as const,
  assignments: ["sop", "assignments"] as const,
};

export function useSopCategories() {
  return useQuery({
    queryKey: KEYS.categories,
    queryFn: () => api.get<SopCategory[]>("/sop/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: KEYS.templates,
    queryFn: () => api.get<TemplateSummary[]>("/sop/templates"),
  });
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: KEYS.template(id ?? ""),
    queryFn: () => api.get<TemplateDetail>(`/sop/templates/${id}`),
    enabled: id !== null,
  });
}

function useTemplateMutation<TVars>(run: (vars: TVars) => Promise<TemplateDetail>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (detail) => {
      // The server returns the full updated detail; seed it straight into the
      // cache so the builder never shows a stale version number.
      client.setQueryData(KEYS.template(detail.id), detail);
      void client.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}

export function useCreateTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: components["schemas"]["CreateTemplateRequest"]) =>
      api.post<TemplateDetail>("/sop/templates", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.templates }),
  });
}

export function useUpdateTemplate() {
  return useTemplateMutation(
    ({ id, ...body }: components["schemas"]["UpdateTemplateRequest"] & { id: string }) =>
      api.patch<TemplateDetail>(`/sop/templates/${id}`, body),
  );
}

export function useDuplicateTemplate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<TemplateDetail>(`/sop/templates/${id}/duplicate`),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.templates }),
  });
}

export function useAddItem() {
  return useTemplateMutation(({ templateId, ...body }: ItemFields & { templateId: string }) =>
    api.post<TemplateDetail>(`/sop/templates/${templateId}/items`, body),
  );
}

export function useUpdateItem() {
  return useTemplateMutation(
    ({ templateId, itemId, ...body }: UpdateItem & { templateId: string; itemId: string }) =>
      api.patch<TemplateDetail>(`/sop/templates/${templateId}/items/${itemId}`, body),
  );
}

export function useDeleteItem() {
  return useTemplateMutation(({ templateId, itemId }: { templateId: string; itemId: string }) =>
    api.delete<TemplateDetail>(`/sop/templates/${templateId}/items/${itemId}`),
  );
}

export function useReorderItems() {
  return useTemplateMutation(({ templateId, itemIds }: { templateId: string; itemIds: string[] }) =>
    api.put<TemplateDetail>(`/sop/templates/${templateId}/items/reorder`, {
      item_ids: itemIds,
    }),
  );
}

export function useAssignments() {
  return useQuery({
    queryKey: KEYS.assignments,
    queryFn: () => api.get<Assignment[]>("/sop/assignments"),
  });
}

export function useCreateAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAssignment) => api.post<Assignment>("/sop/assignments", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.assignments });
      void client.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}

export function useDeleteAssignment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/sop/assignments/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: KEYS.assignments });
      void client.invalidateQueries({ queryKey: KEYS.templates });
    },
  });
}
