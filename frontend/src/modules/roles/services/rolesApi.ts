import { httpClient } from "@/services/api/httpClient";
import type { CreateRolePayload, PermissionItem, RoleItem, UpdateRolePayload } from "@/modules/roles/types/role.types";

export async function getRoles(): Promise<RoleItem[]> {
  const { data } = await httpClient.get<RoleItem[]>("/api/v1/roles");
  return data;
}

export async function createRole(payload: CreateRolePayload): Promise<RoleItem> {
  const { data } = await httpClient.post<RoleItem>("/api/v1/roles", payload);
  return data;
}

export async function updateRole(id: string, payload: UpdateRolePayload): Promise<RoleItem> {
  const { data } = await httpClient.put<RoleItem>(`/api/v1/roles/${id}`, payload);
  return data;
}

export async function updateRoleStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/roles/${id}/status`, { isActive });
}

export async function getRolePermissionIds(roleId: string): Promise<string[]> {
  const { data } = await httpClient.get<string[]>(`/api/v1/roles/${roleId}/permissions`);
  return data;
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  await httpClient.put(`/api/v1/roles/${roleId}/permissions`, { permissionIds });
}

export async function getPermissions(): Promise<PermissionItem[]> {
  const { data } = await httpClient.get<PermissionItem[]>("/api/v1/permissions");
  return data;
}
