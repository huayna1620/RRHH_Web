import { httpClient } from "@/services/api/httpClient";
import type { LeaveCatalogs, LeaveItem, LeaveQuery, PagedResult } from "@/modules/leaves/types/leave.types";

function queryToString(query: LeaveQuery): string {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.status) params.set("status", query.status);
  if (query.leaveType) params.set("leaveType", query.leaveType);
  if (query.startDateFrom) params.set("startDateFrom", query.startDateFrom);
  if (query.startDateTo) params.set("startDateTo", query.startDateTo);
  if (typeof query.year === "number") params.set("year", String(query.year));

  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));

  return params.toString();
}

export async function getLeaves(query: LeaveQuery): Promise<PagedResult<LeaveItem>> {
  const { data } = await httpClient.get<PagedResult<LeaveItem>>(`/api/v1/leaves?${queryToString(query)}`);
  return data;
}

export async function getLeaveCatalogs(): Promise<LeaveCatalogs> {
  const { data } = await httpClient.get<LeaveCatalogs>("/api/v1/leaves/catalogs");
  return data;
}

export async function createLeaveRequest(payload: {
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  isPaid: boolean;
  reason: string;
}): Promise<LeaveItem> {
  const { data } = await httpClient.post<LeaveItem>("/api/v1/leaves", payload);
  return data;
}

export async function approveLeaveRequest(leaveId: string, comment: string): Promise<LeaveItem> {
  const { data } = await httpClient.post<LeaveItem>(`/api/v1/leaves/${leaveId}/approve`, { comment });
  return data;
}

export async function rejectLeaveRequest(leaveId: string, comment: string): Promise<LeaveItem> {
  const { data } = await httpClient.post<LeaveItem>(`/api/v1/leaves/${leaveId}/reject`, { comment });
  return data;
}

export async function cancelLeaveRequest(leaveId: string): Promise<LeaveItem> {
  const { data } = await httpClient.post<LeaveItem>(`/api/v1/leaves/${leaveId}/cancel`);
  return data;
}
