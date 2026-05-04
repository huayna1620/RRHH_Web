import { httpClient } from "@/services/api/httpClient";
import type {
  AbsenteeismReport,
  AttendanceReport,
  EmployeesReport,
  LaborCostReport,
  LeavesReport,
  PayrollReport,
  RotationReport,
  VacationsReport,
} from "@/modules/reports/types/reports.types";

const activeDownloads = new Set<string>();

export async function getEmployeesReport(): Promise<EmployeesReport> {
  const { data } = await httpClient.get<EmployeesReport>("/api/v1/reports/employees");
  return data;
}

export async function getAttendanceReport(year: number, month: number, options: { startDate: string; endDate: string }): Promise<AttendanceReport> {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("month", String(month));
  if (options.startDate) params.set("startDate", options.startDate);
  if (options.endDate) params.set("endDate", options.endDate);
  const { data } = await httpClient.get<AttendanceReport>(`/api/v1/reports/attendance?${params.toString()}`);
  return data;
}

export async function getVacationsReport(year: number): Promise<VacationsReport> {
  const { data } = await httpClient.get<VacationsReport>(`/api/v1/reports/vacations?year=${year}`);
  return data;
}

export async function getLeavesReport(year: number): Promise<LeavesReport> {
  const { data } = await httpClient.get<LeavesReport>(`/api/v1/reports/leaves?year=${year}`);
  return data;
}

export async function getPayrollReport(year: number, month: number): Promise<PayrollReport> {
  const { data } = await httpClient.get<PayrollReport>(`/api/v1/reports/payroll?year=${year}&month=${month}`);
  return data;
}

export async function getRotationReport(year: number): Promise<RotationReport> {
  const { data } = await httpClient.get<RotationReport>(`/api/v1/reports/rotation?year=${year}`);
  return data;
}

export async function getAbsenteeismReport(year: number, month: number): Promise<AbsenteeismReport> {
  const { data } = await httpClient.get<AbsenteeismReport>(`/api/v1/reports/absenteeism?year=${year}&month=${month}`);
  return data;
}

export async function getLaborCostReport(year: number, month: number): Promise<LaborCostReport> {
  const { data } = await httpClient.get<LaborCostReport>(`/api/v1/reports/labor-cost?year=${year}&month=${month}`);
  return data;
}

export function downloadExcel(path: string, filename: string): void {
  if (activeDownloads.has(path)) return;
  activeDownloads.add(path);
  httpClient
    .get<Blob>(path, { responseType: "blob" })
    .then(({ data }) => {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    })
    .finally(() => activeDownloads.delete(path));
}

export function downloadEmployeePdf(employeeId: string): void {
  const path = `/api/v1/reports/employees/${employeeId}/pdf`;
  if (activeDownloads.has(path)) return;
  activeDownloads.add(path);
  httpClient
    .get<Blob>(path, { responseType: "blob" })
    .then(({ data }) => {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `empleado-${employeeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .finally(() => activeDownloads.delete(path));
}
