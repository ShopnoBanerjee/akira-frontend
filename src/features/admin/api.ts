import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { components } from "@/types/api";

export type Outlet = components["schemas"]["OutletResponse"];
export type CreateOutlet = components["schemas"]["CreateOutletRequest"];
export type UpdateOutlet = components["schemas"]["UpdateOutletRequest"];
export type UserItem = components["schemas"]["UserListItem"];
export type InviteUser = components["schemas"]["InviteUserRequest"];
export type InviteResult = components["schemas"]["InviteUserResponse"];
export type GrantableRoles = components["schemas"]["GrantableRolesResponse"];
export type Device = components["schemas"]["Device"];
export type UserRole = components["schemas"]["UserRole"];

const KEYS = {
  outlets: ["admin", "outlets"] as const,
  users: ["admin", "users"] as const,
  devices: ["admin", "devices"] as const,
  grantable: ["admin", "grantable-roles"] as const,
};

// --- Outlets ---------------------------------------------------------------

export function useOutlets(includeInactive = false) {
  return useQuery({
    queryKey: [...KEYS.outlets, { includeInactive }],
    queryFn: () => api.get<Outlet[]>(`/outlets?include_inactive=${String(includeInactive)}`),
  });
}

export function useCreateOutlet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOutlet) => api.post<Outlet>("/outlets", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.outlets }),
  });
}

export function useUpdateOutlet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateOutlet & { id: string }) =>
      api.patch<Outlet>(`/outlets/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.outlets }),
  });
}

export function useDeleteOutlet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/outlets/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.outlets }),
  });
}

// --- Users -----------------------------------------------------------------

export function useUsers(filters?: { search?: string; role?: UserRole }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.role) params.set("role", filters.role);
  const suffix = params.size ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: [...KEYS.users, filters ?? {}],
    queryFn: () => api.get<UserItem[]>(`/users${suffix}`),
  });
}

export function useGrantableRoles() {
  return useQuery({
    queryKey: KEYS.grantable,
    queryFn: () => api.get<GrantableRoles>("/users/roles/grantable"),
    staleTime: 5 * 60_000,
  });
}

export function useInviteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteUser) => api.post<InviteResult>("/users/invite", body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.users }),
  });
}

export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: components["schemas"]["UpdateUserRequest"] & { id: string }) =>
      api.patch<UserItem>(`/users/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.users }),
  });
}

export function useSetUserRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      api.put<UserItem>(`/users/${id}/role`, { global_role: role }),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.users }),
  });
}

export function useSetUserOutlets() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outletIds }: { id: string; outletIds: string[] }) =>
      api.put<UserItem>(`/users/${id}/outlets`, { outlet_ids: outletIds }),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.users }),
  });
}

export function useSetUserPin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: string | null }) =>
      api.put<UserItem>(`/users/${id}/pin`, { pin }),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.users }),
  });
}

// --- Devices ---------------------------------------------------------------

export function useDevices() {
  return useQuery({
    queryKey: KEYS.devices,
    queryFn: () => api.get<Device[]>("/devices"),
  });
}

export function useUpdateDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: components["schemas"]["UpdateDeviceRequest"] & { id: string }) =>
      api.patch<Device>(`/devices/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useRevokeDevice() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/devices/${id}`),
    onSuccess: () => void client.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

// --- Inventory ---------------------------------------------------------------

export type InventoryItem = components["schemas"]["Item"];
export type InventoryDepartment = components["schemas"]["Department"];
export type InventoryCategory = components["schemas"]["Category"];
export type SettingView = components["schemas"]["SettingView"];
export type SettingHistoryRow = components["schemas"]["SettingHistoryRow"];
export type JobRun = components["schemas"]["JobRun"];

const INVENTORY_KEYS = {
  departments: ["admin", "inventory", "departments"] as const,
  items: ["admin", "inventory", "items"] as const,
  settings: ["admin", "settings"] as const,
  jobs: ["admin", "jobs"] as const,
};

export function useInventoryDepartments() {
  return useQuery({
    queryKey: INVENTORY_KEYS.departments,
    queryFn: () => api.get<InventoryDepartment[]>("/inventory/departments"),
    staleTime: 5 * 60_000,
  });
}

export function useInventoryItems(filters?: { departmentId?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.departmentId) params.set("department_id", filters.departmentId);
  if (filters?.search) params.set("search", filters.search);
  const suffix = params.size ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: [...INVENTORY_KEYS.items, filters ?? {}],
    queryFn: () => api.get<InventoryItem[]>(`/inventory/items${suffix}`),
  });
}

export function useCreateInventoryItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: components["schemas"]["CreateItemRequest"]) =>
      api.post<InventoryItem>("/inventory/items", body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: INVENTORY_KEYS.items });
      void client.invalidateQueries({ queryKey: INVENTORY_KEYS.departments });
    },
  });
}

export function useUpdateInventoryItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: components["schemas"]["UpdateItemRequest"] & { id: string }) =>
      api.patch<InventoryItem>(`/inventory/items/${id}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: INVENTORY_KEYS.items }),
  });
}

export function useRetireInventoryItem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/inventory/items/${id}`),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: INVENTORY_KEYS.items });
      void client.invalidateQueries({ queryKey: INVENTORY_KEYS.departments });
    },
  });
}

export function useSetItemLevel() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      outletId,
      ...body
    }: components["schemas"]["SetLevelRequest"] & {
      itemId: string;
      outletId: string;
    }) => api.put<InventoryItem>(`/inventory/items/${itemId}/levels/${outletId}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: INVENTORY_KEYS.items }),
  });
}

// --- Settings ----------------------------------------------------------------

export function useSettings() {
  return useQuery({
    queryKey: INVENTORY_KEYS.settings,
    queryFn: () => api.get<SettingView[]>("/settings"),
  });
}

export function useSettingHistory(key: string | null) {
  return useQuery({
    queryKey: [...INVENTORY_KEYS.settings, "history", key],
    queryFn: () => api.get<SettingHistoryRow[]>(`/settings/${key}/history`),
    enabled: key !== null,
  });
}

export function useSetSetting() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ key, ...body }: components["schemas"]["SetSettingRequest"] & { key: string }) =>
      api.put<SettingView>(`/settings/${key}`, body),
    onSuccess: () => void client.invalidateQueries({ queryKey: INVENTORY_KEYS.settings }),
  });
}

// --- Jobs --------------------------------------------------------------------

export function useJobRuns() {
  return useQuery({
    queryKey: INVENTORY_KEYS.jobs,
    queryFn: () => api.get<JobRun[]>("/jobs/runs"),
  });
}
