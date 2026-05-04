import { httpClient } from "@/services/api/httpClient";
import type { OrgItem, OrgPayload, OrgQuery, PagedResult } from "@/modules/org-structure/types/orgStructure.types";

function queryToString(query: OrgQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (typeof query.isActive === "boolean") params.set("isActive", String(query.isActive));
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDirection) params.set("sortDirection", query.sortDirection);
  return params.toString();
}

// Areas
export async function getAreas(query: OrgQuery): Promise<PagedResult<OrgItem>> {
  const { data } = await httpClient.get<PagedResult<OrgItem>>(`/api/v1/areas?${queryToString(query)}`);
  return data;
}

export async function createArea(payload: OrgPayload): Promise<OrgItem> {
  const { data } = await httpClient.post<OrgItem>("/api/v1/areas", payload);
  return data;
}

export async function updateArea(id: string, payload: OrgPayload): Promise<OrgItem> {
  const { data } = await httpClient.put<OrgItem>(`/api/v1/areas/${id}`, payload);
  return data;
}

export async function updateAreaStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/areas/${id}/status`, { isActive });
}

export async function deleteArea(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/areas/${id}`);
}

// Positions
export async function getPositions(query: OrgQuery): Promise<PagedResult<OrgItem>> {
  const { data } = await httpClient.get<PagedResult<OrgItem>>(`/api/v1/positions?${queryToString(query)}`);
  return data;
}

export async function createPosition(payload: OrgPayload): Promise<OrgItem> {
  const { data } = await httpClient.post<OrgItem>("/api/v1/positions", payload);
  return data;
}

export async function updatePosition(id: string, payload: OrgPayload): Promise<OrgItem> {
  const { data } = await httpClient.put<OrgItem>(`/api/v1/positions/${id}`, payload);
  return data;
}

export async function updatePositionStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/positions/${id}/status`, { isActive });
}

export async function deletePosition(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/positions/${id}`);
}
