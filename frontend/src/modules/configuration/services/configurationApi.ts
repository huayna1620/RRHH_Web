import { httpClient } from "@/services/api/httpClient";
import type {
  ConfigurationCatalogItem,
  ConfigurationCatalogPayload,
  ConfigurationQuery,
  GeneralSettingItem,
  GeneralSettingPayload,
  PagedResult,
} from "@/modules/configuration/types/configuration.types";

function queryToString(query: ConfigurationQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (typeof query.isActive === "boolean") params.set("isActive", String(query.isActive));
  if (query.location) params.set("location", query.location);
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDirection) params.set("sortDirection", query.sortDirection);
  return params.toString();
}

// Branches
export async function getBranches(query: ConfigurationQuery): Promise<PagedResult<ConfigurationCatalogItem>> {
  const { data } = await httpClient.get<PagedResult<ConfigurationCatalogItem>>(`/api/v1/configuration/branches?${queryToString(query)}`);
  return data;
}

export async function createBranch(payload: ConfigurationCatalogPayload): Promise<ConfigurationCatalogItem> {
  const { data } = await httpClient.post<ConfigurationCatalogItem>("/api/v1/configuration/branches", payload);
  return data;
}

export async function updateBranch(id: string, payload: ConfigurationCatalogPayload): Promise<ConfigurationCatalogItem> {
  const { data } = await httpClient.put<ConfigurationCatalogItem>(`/api/v1/configuration/branches/${id}`, payload);
  return data;
}

export async function updateBranchStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/configuration/branches/${id}/status`, { isActive });
}

export async function deleteBranch(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/configuration/branches/${id}`);
}

// Contract Types
export async function getContractTypes(query: ConfigurationQuery): Promise<PagedResult<ConfigurationCatalogItem>> {
  const { data } = await httpClient.get<PagedResult<ConfigurationCatalogItem>>(`/api/v1/configuration/contract-types?${queryToString(query)}`);
  return data;
}

export async function createContractType(payload: ConfigurationCatalogPayload): Promise<ConfigurationCatalogItem> {
  const { data } = await httpClient.post<ConfigurationCatalogItem>("/api/v1/configuration/contract-types", payload);
  return data;
}

export async function updateContractType(id: string, payload: ConfigurationCatalogPayload): Promise<ConfigurationCatalogItem> {
  const { data } = await httpClient.put<ConfigurationCatalogItem>(`/api/v1/configuration/contract-types/${id}`, payload);
  return data;
}

export async function updateContractTypeStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/configuration/contract-types/${id}/status`, { isActive });
}

export async function deleteContractType(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/configuration/contract-types/${id}`);
}

// General Settings
export async function getGeneralSettings(): Promise<GeneralSettingItem[]> {
  const { data } = await httpClient.get<GeneralSettingItem[]>("/api/v1/configuration/general-settings");
  return data;
}

export async function upsertGeneralSetting(key: string, payload: GeneralSettingPayload): Promise<GeneralSettingItem> {
  const { data } = await httpClient.put<GeneralSettingItem>(`/api/v1/configuration/general-settings/${key}`, payload);
  return data;
}

export async function deleteGeneralSetting(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/configuration/general-settings/${id}`);
}
