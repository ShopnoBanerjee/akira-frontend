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
