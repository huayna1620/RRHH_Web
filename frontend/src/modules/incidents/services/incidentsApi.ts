import { httpClient } from "@/services/api/httpClient";
import type {
  AttendanceIncident,
  AttendanceIncidentQuery,
  AttendanceIncidentStats,
  AttendanceIncidentSummary,
  PagedResult
} from "@/modules/incidents/types/incident.types";

function queryToString(query: AttendanceIncidentQuery): string {
  const params = new URLSearchParams();

  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.incidentType) params.set("incidentType", query.incidentType);
  if (query.status) params.set("status", query.status);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.search) params.set("search", query.search);
  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));

  return params.toString();
}

export async function getIncidents(query: AttendanceIncidentQuery): Promise<PagedResult<AttendanceIncident>> {
  const { data } = await httpClient.get<PagedResult<AttendanceIncident>>(
    `/api/v1/attendance-incidents?${queryToString(query)}`
  );
  return data;
}

export async function getIncidentById(id: string): Promise<AttendanceIncident> {
  const { data } = await httpClient.get<AttendanceIncident>(`/api/v1/attendance-incidents/${id}`);
  return data;
}

export async function submitJustification(id: string, justificationText: string): Promise<AttendanceIncident> {
  const { data } = await httpClient.post<AttendanceIncident>(
    `/api/v1/attendance-incidents/${id}/justify`,
    { justificationText }
  );
  return data;
}

export async function approveIncident(id: string, reviewerComment: string): Promise<AttendanceIncident> {
  const { data } = await httpClient.post<AttendanceIncident>(
    `/api/v1/attendance-incidents/${id}/approve`,
    { reviewerComment }
  );
  return data;
}

export async function rejectIncident(id: string, reviewerComment: string): Promise<AttendanceIncident> {
  const { data } = await httpClient.post<AttendanceIncident>(
    `/api/v1/attendance-incidents/${id}/reject`,
    { reviewerComment }
  );
  return data;
}

export async function expireOpenIncidents(): Promise<{ expiredCount: number }> {
  const { data } = await httpClient.post<{ expiredCount: number }>(
    "/api/v1/attendance-incidents/expire",
    {}
  );
  return data;
}

export async function getIncidentStats(query: AttendanceIncidentQuery): Promise<AttendanceIncidentStats> {
  const params = new URLSearchParams();
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.incidentType) params.set("incidentType", query.incidentType);
  if (query.status) params.set("status", query.status);
  if (query.fromDate) params.set("fromDate", query.fromDate);
  if (query.toDate) params.set("toDate", query.toDate);
  if (query.search) params.set("search", query.search);

  const { data } = await httpClient.get<AttendanceIncidentStats>(
    `/api/v1/attendance-incidents/stats?${params.toString()}`
  );
  return data;
}

export async function getIncidentSummary(
  fromDate: string,
  toDate: string
): Promise<AttendanceIncidentSummary[]> {
  const { data } = await httpClient.get<AttendanceIncidentSummary[]>(
    `/api/v1/attendance-incidents/summary?fromDate=${fromDate}&toDate=${toDate}`
  );
  return data;
}
