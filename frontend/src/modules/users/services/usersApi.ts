import { httpClient } from "@/services/api/httpClient";
import type { CreateUserPayload, UpdateUserPayload, UserItem, ChangePasswordPayload } from "@/modules/users/types/user.types";

export async function getUsers(): Promise<UserItem[]> {
  const { data } = await httpClient.get<UserItem[]>("/api/v1/users");
  return data;
}

export async function getUserById(id: string): Promise<UserItem> {
  const { data } = await httpClient.get<UserItem>(`/api/v1/users/${id}`);
  return data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const { data } = await httpClient.post<UserItem>("/api/v1/users", payload);
  return data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserItem> {
  const { data } = await httpClient.put<UserItem>(`/api/v1/users/${id}`, payload);
  return data;
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/users/${id}/status`, { isActive });
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await httpClient.post("/api/v1/auth/change-password", payload);
}
