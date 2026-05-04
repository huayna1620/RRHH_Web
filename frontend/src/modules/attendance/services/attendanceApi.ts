import { httpClient } from "@/services/api/httpClient";
import type { AttendanceCatalogs, AttendanceItem, AttendanceQuery, AttendanceSummary, PagedResult } from "@/modules/attendance/types/attendance.types";

function queryToString(query: AttendanceQuery): string {
  const params = new URLSearchParams();
  params.set("viewMode", query.viewMode);
  if (query.referenceDate) params.set("referenceDate", query.referenceDate);
  if (query.startDateFrom) params.set("startDateFrom", query.startDateFrom);
  if (query.startDateTo) params.set("startDateTo", query.startDateTo);
  if (query.search) params.set("search", query.search);
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.areaId) params.set("areaId", query.areaId);
  if (typeof query.isLate === "boolean") params.set("isLate", String(query.isLate));
  if (typeof query.isAbsent === "boolean") params.set("isAbsent", String(query.isAbsent));
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));
  return params.toString();
}

export async function getAttendance(query: AttendanceQuery): Promise<PagedResult<AttendanceItem>> {
  const { data } = await httpClient.get<PagedResult<AttendanceItem>>(`/api/v1/attendance?${queryToString(query)}`);
  return data;
}

export async function getAttendanceCatalogs(): Promise<AttendanceCatalogs> {
  const { data } = await httpClient.get<AttendanceCatalogs>("/api/v1/attendance/catalogs");
  return data;
}

export async function getAttendanceSummary(query: AttendanceQuery): Promise<AttendanceSummary> {
  const { data } = await httpClient.get<AttendanceSummary>(`/api/v1/attendance/summary?${queryToString(query)}`);
  return data;
}

export async function checkIn(employeeId: string): Promise<AttendanceItem> {
  const { data } = await httpClient.post<AttendanceItem>("/api/v1/attendance/check-in", { employeeId });
  return data;
}

export async function checkOut(attendanceId: string): Promise<AttendanceItem> {
  const { data } = await httpClient.post<AttendanceItem>(`/api/v1/attendance/${attendanceId}/check-out`, {});
  return data;
}

export async function markAbsent(employeeId: string, reason: string): Promise<AttendanceItem> {
  const { data } = await httpClient.post<AttendanceItem>("/api/v1/attendance/mark-absent", { employeeId, reason });
  return data;
}

export async function justifyAttendance(attendanceId: string, justification: string): Promise<AttendanceItem> {
  const { data } = await httpClient.post<AttendanceItem>(`/api/v1/attendance/${attendanceId}/justify`, { justification });
  return data;
}
