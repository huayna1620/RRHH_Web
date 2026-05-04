import { httpClient } from "@/services/api/httpClient";
import type { PagedResult, VacationCatalogs, VacationItem, VacationQuery } from "@/modules/vacations/types/vacation.types";

function queryToString(query: VacationQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.status) params.set("status", query.status);
  if (query.startDateFrom) params.set("startDateFrom", query.startDateFrom);
  if (query.startDateTo) params.set("startDateTo", query.startDateTo);
  if (typeof query.year === "number") params.set("year", String(query.year));
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  return params.toString();
}

export async function getVacations(query: VacationQuery): Promise<PagedResult<VacationItem>> {
  const { data } = await httpClient.get<PagedResult<VacationItem>>(`/api/v1/vacations?${queryToString(query)}`);
  return data;
}

export async function getVacationCatalogs(year?: number): Promise<VacationCatalogs> {
  const url = year ? `/api/v1/vacations/catalogs?year=${year}` : "/api/v1/vacations/catalogs";
  const { data } = await httpClient.get<VacationCatalogs>(url);
  return data;
}

export async function createVacationRequest(payload: {
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<VacationItem> {
  const { data } = await httpClient.post<VacationItem>("/api/v1/vacations", payload);
  return data;
}

export async function approveVacationRequest(id: string, comment: string): Promise<VacationItem> {
  const { data } = await httpClient.post<VacationItem>(`/api/v1/vacations/${id}/approve`, { comment });
  return data;
}

export async function rejectVacationRequest(id: string, comment: string): Promise<VacationItem> {
  const { data } = await httpClient.post<VacationItem>(`/api/v1/vacations/${id}/reject`, { comment });
  return data;
}

export async function cancelVacationRequest(id: string): Promise<VacationItem> {
  const { data } = await httpClient.post<VacationItem>(`/api/v1/vacations/${id}/cancel`);
  return data;
}
