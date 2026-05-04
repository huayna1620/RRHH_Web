import { httpClient } from "@/services/api/httpClient";
import type {
  EmployeeCatalogs,
  EmployeeDetail,
  EmployeePayload,
  EmployeeQuery,
  EmployeeListItem,
  PagedResult,
} from "@/modules/employees/types/employee.types";

function toQueryParams(query: EmployeeQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.areaId) params.set("areaId", query.areaId);
  if (query.branchId) params.set("branchId", query.branchId);
  if (typeof query.isActive === "boolean") params.set("isActive", String(query.isActive));

  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  params.set("sortBy", query.sortBy || "fullName");
  params.set("sortDirection", query.sortDirection || "asc");

  return params;
}

export async function getEmployees(query: EmployeeQuery): Promise<PagedResult<EmployeeListItem>> {
  const qs = toQueryParams(query).toString();
  const { data } = await httpClient.get<PagedResult<EmployeeListItem>>(`/api/v1/employees?${qs}`);
  return data;
}

export async function getEmployeeById(id: string): Promise<EmployeeDetail> {
  const { data } = await httpClient.get<EmployeeDetail>(`/api/v1/employees/${id}`);
  return data;
}

export async function getEmployeeCatalogs(): Promise<EmployeeCatalogs> {
  const { data } = await httpClient.get<EmployeeCatalogs>("/api/v1/employees/catalogs");
  return data;
}

export async function createEmployee(payload: EmployeePayload): Promise<EmployeeDetail> {
  const { data } = await httpClient.post<EmployeeDetail>("/api/v1/employees", payload);
  return data;
}

export async function updateEmployee(id: string, payload: EmployeePayload): Promise<EmployeeDetail> {
  const { data } = await httpClient.put<EmployeeDetail>(`/api/v1/employees/${id}`, payload);
  return data;
}

export async function updateEmployeeStatus(id: string, isActive: boolean): Promise<void> {
  await httpClient.patch(`/api/v1/employees/${id}/status`, { isActive });
}

export async function deleteEmployee(id: string): Promise<void> {
  await httpClient.delete(`/api/v1/employees/${id}`);
}
