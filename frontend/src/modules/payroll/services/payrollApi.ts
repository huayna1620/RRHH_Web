import { httpClient } from "@/services/api/httpClient";
import type { GeneratePayrollResult, PagedResult, PayrollCatalogs, PayrollItem, PayrollQuery } from "@/modules/payroll/types/payroll.types";

function queryToString(query: PayrollQuery): string {
  const params = new URLSearchParams();

  if (query.search) params.set("search", query.search);
  if (query.employeeId) params.set("employeeId", query.employeeId);
  if (query.areaId) params.set("areaId", query.areaId);
  if (typeof query.year === "number") params.set("year", String(query.year));
  if (typeof query.month === "number") params.set("month", String(query.month));
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);

  params.set("pageNumber", String(query.pageNumber));
  params.set("pageSize", String(query.pageSize));

  return params.toString();
}

export async function getPayroll(query: PayrollQuery): Promise<PagedResult<PayrollItem>> {
  const { data } = await httpClient.get<PagedResult<PayrollItem>>(`/api/v1/payroll?${queryToString(query)}`);
  return data;
}

export async function getPayrollById(id: string): Promise<PayrollItem> {
  const { data } = await httpClient.get<PayrollItem>(`/api/v1/payroll/${id}`);
  return data;
}

export async function getPayrollCatalogs(): Promise<PayrollCatalogs> {
  const { data } = await httpClient.get<PayrollCatalogs>("/api/v1/payroll/catalogs");
  return data;
}

export async function generatePayroll(payload: {
  year: number;
  month: number;
  employeeId: string;
  forceRecalculate: boolean;
}): Promise<GeneratePayrollResult> {
  const { data } = await httpClient.post<GeneratePayrollResult>("/api/v1/payroll/generate", payload);
  return data;
}

export async function updatePayrollAdjustments(
  payrollId: string,
  payload: { bonuses: number; deductions: number; notes: string }
): Promise<PayrollItem> {
  const { data } = await httpClient.put<PayrollItem>(`/api/v1/payroll/${payrollId}/adjustments`, payload);
  return data;
}

export async function approvePayroll(year: number, month: number): Promise<{ approvedCount: number }> {
  const { data } = await httpClient.post<{ approvedCount: number }>("/api/v1/payroll/approve", { year, month });
  return data;
}

export async function unapprovePayroll(year: number, month: number): Promise<{ unapprovedCount: number }> {
  const { data } = await httpClient.post<{ unapprovedCount: number }>("/api/v1/payroll/unapprove", { year, month });
  return data;
}

export async function markPayrollPaid(year: number, month: number): Promise<{ paidCount: number }> {
  const { data } = await httpClient.post<{ paidCount: number }>("/api/v1/payroll/mark-paid", { year, month });
  return data;
}

export async function downloadPayslip(payrollId: string): Promise<Blob> {
  const response = await httpClient.get(`/api/v1/payroll/${payrollId}/payslip`, { responseType: "blob" });
  return response.data as Blob;
}

export async function downloadBulkPayslips(year: number, month: number): Promise<Blob> {
  const response = await httpClient.get(`/api/v1/payroll/bulk-payslips?year=${year}&month=${month}`, { responseType: "blob" });
  return response.data as Blob;
}

// ── Bank file ───────────────────────────────────────────────────────

export type BankFormatDescriptor = {
  code: string;
  displayName: string;
  fileExtension: string;
  description: string;
};

export type BankFilePreview = {
  fileName: string;
  includedCount: number;
  totalAmount: number;
  skipped: { employeeId: string; employeeCode: string; fullName: string; reason: string }[];
};

export async function getBankFormats(): Promise<BankFormatDescriptor[]> {
  const { data } = await httpClient.get<BankFormatDescriptor[]>("/api/v1/payroll/bank-file/formats");
  return data;
}

export async function downloadBankFile(year: number, month: number, format: string): Promise<Blob> {
  const response = await httpClient.get(
    `/api/v1/payroll/bank-file?year=${year}&month=${month}&format=${format}`,
    { responseType: "blob" }
  );
  return response.data as Blob;
}

export async function previewBankFile(year: number, month: number, format: string): Promise<BankFilePreview> {
  const { data } = await httpClient.get<BankFilePreview>(
    `/api/v1/payroll/bank-file?year=${year}&month=${month}&format=${format}&preview=true`
  );
  return data;
}
